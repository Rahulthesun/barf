import { ContainerInstanceManagementClient } from '@azure/arm-containerinstance';
import { ClientSecretCredential } from '@azure/identity';
import { createClient } from '@supabase/supabase-js';

// ─── Clients ─────────────────────────────────────────────────────────────────

function getAciClient(): ContainerInstanceManagementClient {
  const credential = new ClientSecretCredential(
    process.env.AZURE_TENANT_ID!,
    process.env.AZURE_CLIENT_ID!,
    process.env.AZURE_CLIENT_SECRET!,
  );
  return new ContainerInstanceManagementClient(credential, process.env.AZURE_SUBSCRIPTION_ID!);
}

function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeDnsLabel(appSlug: string, deploymentId: string): string {
  // ACI DNS label: lowercase, alphanumeric + hyphens, 3-63 chars, unique per region
  const slug = appSlug.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20);
  const uid  = deploymentId.replace(/-/g, '').slice(0, 10);
  return `barf-${slug}-${uid}`;
}

async function updateDeployment(
  deploymentId: string,
  fields: { status: string; live_url?: string; azure_app_name?: string; error?: string },
) {
  await getSupabase()
    .from('deployments')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', deploymentId);
}

// ─── Main deploy function (runs in background) ────────────────────────────────

// Ensure image has an explicit tag — ACI rejects bare image names intermittently
function normaliseImage(image: string): string {
  return image.includes(':') ? image : `${image}:latest`;
}

export async function runDeployment(params: {
  deploymentId: string;
  appSlug:      string;
  dockerImage:  string;
  port:         number;
  deployEnv?:   Record<string, string>;
}): Promise<void> {
  const { deploymentId, appSlug, port, deployEnv = {} } = params;
  const dockerImage   = normaliseImage(params.dockerImage);
  const resourceGroup = process.env.AZURE_RESOURCE_GROUP!;
  const region        = process.env.AZURE_REGION ?? 'eastus';
  const dnsLabel      = makeDnsLabel(appSlug, deploymentId);

  console.log(`[deploy] Starting ${appSlug} → ${dockerImage} (id=${deploymentId})`);

  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const client = getAciClient();

      if (attempt === 1) {
        await updateDeployment(deploymentId, { status: 'deploying', azure_app_name: dnsLabel });
      } else {
        console.log(`[deploy] Retry ${attempt}/${MAX_ATTEMPTS} for ${appSlug}`);
      }

      const dhUser  = process.env.DOCKERHUB_USERNAME;
      const dhToken = process.env.DOCKERHUB_TOKEN;

      const containerGroupDef = {
        location: region,
        osType:   'Linux',
        restartPolicy: 'Always',
        ipAddress: {
          type:         'Public',
          ports:        [{ protocol: 'TCP', port }],
          dnsNameLabel: dnsLabel,
        },
        containers: [{
          name:  appSlug.slice(0, 63),
          image: dockerImage,
          ports: [{ port }],
          resources: {
            requests: { cpu: 1, memoryInGB: 1.5 },
          },
          // Pass per-app env vars stored in oss_apps.deploy_env
          ...(Object.keys(deployEnv).length > 0 ? {
            environmentVariables: Object.entries(deployEnv).map(([name, value]) => ({ name, value })),
          } : {}),
        }],
        // Only include registry creds when both values are present
        ...(dhUser && dhToken ? {
          imageRegistryCredentials: [{ server: 'index.docker.io', username: dhUser, password: dhToken }],
        } : {}),
      };

      await client.containerGroups.beginCreateOrUpdateAndWait(resourceGroup, dnsLabel, containerGroupDef);

      const liveUrl = `http://${dnsLabel}.${region}.azurecontainer.io:${port}`;
      console.log(`[deploy] Live: ${liveUrl}`);
      await updateDeployment(deploymentId, { status: 'live', live_url: liveUrl });
      return; // success

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const isTransient = /docker registry|registry|retry|throttl|timeout/i.test(message);

      console.error(`[deploy] Attempt ${attempt} failed (id=${deploymentId}):`, message);

      if (attempt < MAX_ATTEMPTS && isTransient) {
        // Wait 30s before retrying registry errors
        await new Promise(r => setTimeout(r, 30_000));
        continue;
      }

      await updateDeployment(deploymentId, { status: 'failed' });
      return;
    }
  }
}

// ─── Delete a container group (for future "tear down" feature) ────────────────

export async function tearDownDeployment(azureAppName: string): Promise<void> {
  const client = getAciClient();
  await client.containerGroups.beginDeleteAndWait(
    process.env.AZURE_RESOURCE_GROUP!,
    azureAppName,
  );
}

// ─── Validation helpers ───────────────────────────────────────────────────────

export function missingAzureConfig(): string | null {
  const required = [
    'AZURE_SUBSCRIPTION_ID',
    'AZURE_TENANT_ID',
    'AZURE_CLIENT_ID',
    'AZURE_CLIENT_SECRET',
    'AZURE_RESOURCE_GROUP',
  ];
  const missing = required.filter(k => !process.env[k]);
  return missing.length ? `Missing env vars: ${missing.join(', ')}` : null;
}
