import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** GET /api/deploy — list all deployments (filtered by user_id when auth lands) */
export async function listDeployments(req: Request, res: Response): Promise<void> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('deployments')
    .select('id, app_id, app_slug, status, live_url, azure_app_name, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ deployments: data ?? [] });
}

/** POST /api/deploy — create a deployment record (Azure wiring TBD) */
export async function createDeployment(req: Request, res: Response): Promise<void> {
  const { app_slug, app_id: bodyAppId } = req.body as { app_slug?: string; app_id?: string };

  if (!app_slug) {
    res.status(400).json({ error: 'Missing app_slug' });
    return;
  }

  const supabase = getSupabase();

  // Verify app exists (accept a known app_id to skip lookup)
  const query = supabase.from('oss_apps').select('id, name, slug, docker_image, default_port');
  const { data: app, error: appErr } = bodyAppId
    ? await query.eq('id', bodyAppId).maybeSingle()
    : await query.eq('slug', app_slug).maybeSingle();

  if (appErr || !app) {
    res.status(404).json({ error: 'App not found' });
    return;
  }

  // Create deployment record
  const { data: deployment, error: depErr } = await supabase
    .from('deployments')
    .insert({
      app_id:     app.id,
      app_slug:   app.slug,
      status:     'queued',
      updated_at: new Date().toISOString(),
    })
    .select('id, status, created_at')
    .single();

  if (depErr || !deployment) {
    res.status(500).json({ error: depErr?.message ?? 'Failed to create deployment' });
    return;
  }

  // TODO: Kick off Azure Container Apps provisioning here
  // azureService.deployContainer({ deploymentId, dockerImage, port })

  res.status(202).json({
    id:      (deployment as any).id,
    status:  'queued',
    message: `Deployment queued for ${app.name}. Hosting coming soon.`,
  });
}

/** GET /api/deploy/:id — poll deployment status */
export async function getDeploymentStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const { data, error } = await getSupabase()
    .from('deployments')
    .select('id, app_slug, status, live_url, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) {
    res.status(404).json({ error: 'Deployment not found' });
    return;
  }

  res.json({ deployment: data });
}
