import { ContainerInstanceManagementClient } from '@azure/arm-containerinstance';
import { ClientSecretCredential } from '@azure/identity';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

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
  const slug = appSlug.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20);
  const uid  = deploymentId.replace(/-/g, '').slice(0, 10);
  return `barf-${slug}-${uid}`;
}

function makeSubdomain(appSlug: string, deploymentId: string): string {
  const slug = appSlug.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 24);
  const uid  = deploymentId.replace(/-/g, '').slice(0, 6);
  return `${slug}-${uid}`;
}

function normaliseImage(image: string): string {
  return image.includes(':') ? image : `${image}:latest`;
}

function generateSecret(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

function generateShortPassword(len = 12): string {
  // readable alphanumeric password for admin UIs
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from(crypto.randomBytes(len))
    .map(b => chars[b % chars.length])
    .join('');
}

// Replace {{PLACEHOLDER}} tokens in deploy_env values
function interpolateEnv(
  deployEnv: Record<string, string>,
  vars: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(deployEnv)) {
    let val = v;
    for (const [placeholder, value] of Object.entries(vars)) {
      val = val.split(`{{${placeholder}}}`).join(value);
    }
    result[k] = val;
  }
  return result;
}

async function updateDeployment(
  deploymentId: string,
  fields: Record<string, unknown>,
) {
  await getSupabase()
    .from('deployments')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', deploymentId);
}

// ─── Cloudflare DNS ───────────────────────────────────────────────────────────

async function createCloudflareDns(subdomain: string, aciHostname: string): Promise<string | null> {
  const token  = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const domain = process.env.APP_DOMAIN;
  if (!token || !zoneId || !domain) return null;

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'CNAME',
          name: `${subdomain}.${domain}`,
          content: aciHostname,
          ttl: 1,
          proxied: true,
        }),
      },
    );
    const data = await res.json() as { success: boolean; result: { id: string }; errors: unknown[] };
    if (!data.success) {
      console.error('[cloudflare] DNS create failed:', data.errors);
      return null;
    }
    console.log(`[cloudflare] Created ${subdomain}.${domain} → ${aciHostname}`);
    return data.result.id;
  } catch (err) {
    console.error('[cloudflare] DNS create error:', err);
    return null;
  }
}

async function deleteCloudflareDns(recordId: string): Promise<void> {
  const token  = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  if (!token || !zoneId) return;
  try {
    await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${recordId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    console.log(`[cloudflare] Deleted DNS record ${recordId}`);
  } catch (err) {
    console.error('[cloudflare] DNS delete error:', err);
  }
}

// ─── Main deploy ──────────────────────────────────────────────────────────────

export async function runDeployment(params: {
  deploymentId:    string;
  appSlug:         string;
  dockerImage:     string;
  port:            number;
  deployEnv?:      Record<string, string>;
  deployCommand?:  string[];
  requiresPostgres?: boolean;
}): Promise<void> {
  const {
    deploymentId, appSlug, port,
    requiresPostgres = false,
    deployCommand,
  } = params;

  const dockerImage   = normaliseImage(params.dockerImage);
  const resourceGroup = process.env.AZURE_RESOURCE_GROUP!;
  const region        = process.env.AZURE_REGION ?? 'eastus';
  const domain        = process.env.APP_DOMAIN;
  const dnsLabel      = makeDnsLabel(appSlug, deploymentId);
  const subdomain     = makeSubdomain(appSlug, deploymentId);

  // ── Generate per-deployment secrets ────────────────────────────────────────
  const pgPassword    = generateShortPassword(20);
  const secretKey     = generateSecret(32);
  const secretKey2    = generateSecret(32);
  const secretKeyHex16 = generateSecret(16); // 32-char hex, 16 bytes
  const secretKeyShort = generateShortPassword(14);
  const pgDb          = appSlug.replace(/-/g, '');
  const aciHostname   = `${dnsLabel}.${region}.azurecontainer.io`;
  const appUrl        = domain ? `https://${subdomain}.${domain}` : `http://${aciHostname}`;

  const resolvedEnv = interpolateEnv(params.deployEnv ?? {}, {
    POSTGRES_PASSWORD: pgPassword,
    POSTGRES_USER:     'barf',
    POSTGRES_DB:       pgDb,
    POSTGRES_HOST:     'localhost',
    POSTGRES_PORT:     '5432',
    POSTGRES_URL:      `postgresql://barf:${pgPassword}@localhost:5432/${pgDb}`,
    SECRET_KEY:        secretKey,
    SECRET_KEY_2:      secretKey2,
    SECRET_KEY_HEX16:  secretKeyHex16,
    SECRET_KEY_SHORT:  secretKeyShort,
    APP_URL:           appUrl,
  });

  console.log(`[deploy] Starting ${appSlug} → ${dockerImage} (id=${deploymentId}, postgres=${requiresPostgres})`);

  const dhUser  = process.env.DOCKERHUB_USERNAME;
  const dhToken = process.env.DOCKERHUB_TOKEN;

  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const client = getAciClient();

      if (attempt === 1) {
        await updateDeployment(deploymentId, { status: 'deploying', azure_app_name: dnsLabel });
      } else {
        console.log(`[deploy] Retry ${attempt}/${MAX_ATTEMPTS} for ${appSlug}`);
      }

      // ── App container ─────────────────────────────────────────────────────
      const appContainer: Record<string, unknown> = {
        name:  appSlug.replace(/[^a-z0-9-]/g, '-').slice(0, 63),
        image: dockerImage,
        ports: [{ port }],
        resources: {
          requests: { cpu: requiresPostgres ? 1 : 1, memoryInGB: requiresPostgres ? 1.5 : 1.5 },
        },
        ...(Object.keys(resolvedEnv).length > 0 ? {
          environmentVariables: Object.entries(resolvedEnv).map(([name, value]) => ({ name, value })),
        } : {}),
        ...(deployCommand ? { command: deployCommand } : {}),
      };

      // ── Caddy sidecar — HTTP reverse proxy, Cloudflare handles TLS ────────
      const caddyContainer: Record<string, unknown> = {
        name:    'caddy',
        image:   'caddy:2-alpine',
        command: ['caddy', 'reverse-proxy', '--from', ':80', '--to', `localhost:${port}`],
        ports:   [{ port: 80 }],
        resources: { requests: { cpu: 0.25, memoryInGB: 0.25 } },
      };

      // ── PostgreSQL sidecar (when required) ────────────────────────────────
      const pgContainer: Record<string, unknown> | null = requiresPostgres ? {
        name:  'postgres',
        image: 'postgres:15-alpine',
        ports: [],
        environmentVariables: [
          { name: 'POSTGRES_USER',     value: 'barf' },
          { name: 'POSTGRES_PASSWORD', value: pgPassword },
          { name: 'POSTGRES_DB',       value: pgDb },
          { name: 'PGDATA',            value: '/var/lib/postgresql/data' },
        ],
        resources: { requests: { cpu: 0.5, memoryInGB: 1 } },
      } : null;

      const containers = [
        appContainer,
        caddyContainer,
        ...(pgContainer ? [pgContainer] : []),
      ];

      const containerGroupDef: Record<string, unknown> = {
        location:      region,
        osType:        'Linux',
        restartPolicy: 'Always',
        ipAddress: {
          type:         'Public',
          ports:        [{ protocol: 'TCP', port: 80 }],
          dnsNameLabel: dnsLabel,
        },
        containers,
        ...(dhUser && dhToken ? {
          imageRegistryCredentials: [{ server: 'index.docker.io', username: dhUser, password: dhToken }],
        } : {}),
      };

      await client.containerGroups.beginCreateOrUpdateAndWait(
        resourceGroup, dnsLabel, containerGroupDef,
      );

      // ── Create Cloudflare DNS record ──────────────────────────────────────
      const cfRecordId = await createCloudflareDns(subdomain, aciHostname);

      const now = new Date().toISOString();
      await getSupabase().from('deployments').update({
        status:           'live',
        live_url:         appUrl,
        live_since:       now,
        last_accessed_at: now,
        updated_at:       now,
        cf_dns_record_id: cfRecordId,
      }).eq('id', deploymentId);

      console.log(`[deploy] Live: ${appUrl}`);
      return;

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const isTransient = /docker registry|registry|retry|throttl|timeout/i.test(message);
      console.error(`[deploy] Attempt ${attempt} failed (id=${deploymentId}):`, message);

      if (attempt < MAX_ATTEMPTS && isTransient) {
        await new Promise(r => setTimeout(r, 30_000));
        continue;
      }

      await updateDeployment(deploymentId, { status: 'failed' });
      return;
    }
  }
}

// ─── Stop / Start ─────────────────────────────────────────────────────────────

export async function stopContainer(azureAppName: string): Promise<void> {
  const client = getAciClient();
  await client.containerGroups.stop(process.env.AZURE_RESOURCE_GROUP!, azureAppName);
  console.log(`[deploy] Stopped: ${azureAppName}`);
}

export async function startContainer(azureAppName: string): Promise<void> {
  const client = getAciClient();
  await client.containerGroups.beginStartAndWait(process.env.AZURE_RESOURCE_GROUP!, azureAppName);
  console.log(`[deploy] Started: ${azureAppName}`);
}

// ─── Auto-shutdown ────────────────────────────────────────────────────────────

const AUTO_STOP_HOURS = 4;

export async function runAutoShutdown(): Promise<void> {
  const supabase = getSupabase();
  const cutoff   = new Date(Date.now() - AUTO_STOP_HOURS * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from('deployments')
    .select('id, azure_app_name')
    .eq('status', 'live')
    .or(`last_accessed_at.lt.${cutoff},last_accessed_at.is.null`)
    .lt('live_since', cutoff);

  if (!data || data.length === 0) return;
  console.log(`[auto-shutdown] Stopping ${data.length} idle container(s)`);

  for (const dep of data) {
    const name = (dep as any).azure_app_name as string | null;
    if (!name) continue;
    try {
      await stopContainer(name);
      await supabase.from('deployments')
        .update({ status: 'stopped', updated_at: new Date().toISOString() })
        .eq('id', (dep as any).id);
    } catch (err) {
      console.error(`[auto-shutdown] Failed to stop ${name}:`, err);
    }
  }
}

// ─── Tear down ────────────────────────────────────────────────────────────────

export async function tearDownDeployment(
  azureAppName:  string,
  cfDnsRecordId?: string | null,
): Promise<void> {
  const client = getAciClient();
  await client.containerGroups.beginDeleteAndWait(
    process.env.AZURE_RESOURCE_GROUP!,
    azureAppName,
  );
  if (cfDnsRecordId) {
    await deleteCloudflareDns(cfDnsRecordId);
  }
}

// ─── Config validation ────────────────────────────────────────────────────────

export function missingAzureConfig(): string | null {
  const required = [
    'AZURE_SUBSCRIPTION_ID', 'AZURE_TENANT_ID',
    'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET', 'AZURE_RESOURCE_GROUP',
  ];
  const missing = required.filter(k => !process.env[k]);
  return missing.length ? `Missing env vars: ${missing.join(', ')}` : null;
}
