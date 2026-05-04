import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { runDeployment, stopContainer, startContainer, tearDownDeployment, missingAzureConfig } from '../services/azureContainerService';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─── GET /api/deploy — list all deployments ──────────────────────────────────

export async function listDeployments(req: Request, res: Response): Promise<void> {
  const supabase = getSupabase();

  // Mark queued deployments older than 15 min as failed (server never picked them up)
  const stale = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  await supabase
    .from('deployments')
    .update({ status: 'failed', updated_at: new Date().toISOString() })
    .eq('status', 'queued')
    .lt('created_at', stale);

  const { data, error } = await supabase
    .from('deployments')
    .select('id, app_id, app_slug, status, live_url, azure_app_name, live_since, last_accessed_at, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ deployments: data ?? [] });
}

// ─── POST /api/deploy — kick off a new deployment ────────────────────────────

export async function createDeployment(req: Request, res: Response): Promise<void> {
  const { app_slug, app_id: bodyAppId } = req.body as { app_slug?: string; app_id?: string };

  if (!app_slug) { res.status(400).json({ error: 'Missing app_slug' }); return; }

  // Check Azure config is present before accepting the job
  const configErr = missingAzureConfig();
  if (configErr) {
    res.status(503).json({ error: configErr });
    return;
  }

  const supabase = getSupabase();

  // Look up the app
  const q = supabase.from('oss_apps').select('id, name, slug, docker_image, default_port, deploy_env');
  const { data: app, error: appErr } = bodyAppId
    ? await q.eq('id', bodyAppId).maybeSingle()
    : await q.eq('slug', app_slug).maybeSingle();

  if (appErr || !app) { res.status(404).json({ error: 'App not found' }); return; }

  const dockerImage = (app as any).docker_image as string | null;
  if (!dockerImage) {
    res.status(400).json({ error: `No Docker image configured for ${app_slug} yet.` });
    return;
  }

  // Create the deployment record (queued)
  const { data: deployment, error: depErr } = await supabase
    .from('deployments')
    .insert({
      app_id:     (app as any).id,
      app_slug:   (app as any).slug,
      status:     'queued',
      updated_at: new Date().toISOString(),
    })
    .select('id, status, created_at')
    .single();

  if (depErr || !deployment) {
    res.status(500).json({ error: depErr?.message ?? 'Failed to create deployment' });
    return;
  }

  const deploymentId = (deployment as any).id as string;

  // ── Fire & forget — responds immediately, container provisions in background ─
  setImmediate(() => {
    runDeployment({
      deploymentId,
      appSlug:    (app as any).slug as string,
      dockerImage,
      port:       (app as any).default_port as number ?? 3000,
      deployEnv:  (app as any).deploy_env as Record<string, string> ?? {},
    }).catch(err => console.error('[deploy] Unhandled error:', err));
  });

  res.status(202).json({
    id:      deploymentId,
    status:  'queued',
    message: `Deployment started for ${(app as any).name}. Poll /api/deploy/${deploymentId} for status.`,
  });
}

// ─── GET /api/deploy/:id — poll status ───────────────────────────────────────

export async function getDeploymentStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const { data, error } = await getSupabase()
    .from('deployments')
    .select('id, app_slug, status, live_url, azure_app_name, live_since, last_accessed_at, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) { res.status(404).json({ error: 'Deployment not found' }); return; }
  res.json(data);
}

// ─── POST /api/deploy/:id/stop — pause the container ────────────────────────

export async function stopDeployment(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const supabase = getSupabase();

  const { data } = await supabase
    .from('deployments')
    .select('azure_app_name, status')
    .eq('id', id)
    .maybeSingle();

  if (!data || (data as any).status !== 'live') {
    res.status(400).json({ error: 'Deployment is not live' }); return;
  }

  const name = (data as any).azure_app_name as string;
  setImmediate(async () => {
    try {
      await stopContainer(name);
      await supabase.from('deployments')
        .update({ status: 'stopped', updated_at: new Date().toISOString() })
        .eq('id', id);
    } catch (err) { console.error('[stop] Failed:', err); }
  });

  // Optimistic update so UI responds instantly
  await supabase.from('deployments')
    .update({ status: 'stopping', updated_at: new Date().toISOString() })
    .eq('id', id);

  res.json({ status: 'stopping' });
}

// ─── POST /api/deploy/:id/start — wake a stopped container ──────────────────

export async function startDeployment(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const supabase = getSupabase();

  const { data } = await supabase
    .from('deployments')
    .select('azure_app_name, status, live_url')
    .eq('id', id)
    .maybeSingle();

  if (!data || (data as any).status !== 'stopped') {
    res.status(400).json({ error: 'Deployment is not stopped' }); return;
  }

  const name = (data as any).azure_app_name as string;

  await supabase.from('deployments')
    .update({ status: 'starting', updated_at: new Date().toISOString() })
    .eq('id', id);

  setImmediate(async () => {
    try {
      await startContainer(name);
      const now = new Date().toISOString();
      await supabase.from('deployments')
        .update({ status: 'live', live_since: now, last_accessed_at: now, updated_at: now })
        .eq('id', id);
    } catch (err) {
      console.error('[start] Failed:', err);
      await supabase.from('deployments')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', id);
    }
  });

  res.json({ status: 'starting' });
}

// ─── POST /api/deploy/:id/keepalive — reset the auto-shutdown timer ──────────

export async function keepAlive(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  await getSupabase()
    .from('deployments')
    .update({ last_accessed_at: new Date().toISOString() })
    .eq('id', id);
  res.json({ ok: true });
}

// ─── DELETE /api/deploy/:id — tear down a container ──────────────────────────

export async function deleteDeployment(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('deployments')
    .select('azure_app_name, status')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) { res.status(404).json({ error: 'Deployment not found' }); return; }

  const azureName = (data as any).azure_app_name as string | null;

  // Mark as deleting immediately
  await supabase
    .from('deployments')
    .update({ status: 'deleting', updated_at: new Date().toISOString() })
    .eq('id', id);

  // Tear down in background if we have an Azure container to delete
  if (azureName) {
    setImmediate(() => {
      tearDownDeployment(azureName)
        .then(() => supabase.from('deployments').delete().eq('id', id))
        .catch(async err => {
          console.error('[teardown] Failed:', err);
          await supabase
            .from('deployments')
            .update({ status: 'failed', updated_at: new Date().toISOString() })
            .eq('id', id);
        });
    });
  } else {
    await supabase.from('deployments').delete().eq('id', id);
  }

  res.json({ message: 'Tear-down initiated.' });
}
