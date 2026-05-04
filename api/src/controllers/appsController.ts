import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { getDeployConfig } from '../services/deployConfigs';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** GET /api/apps — list all OSS apps, optional ?category= and ?search= */
export async function listApps(req: Request, res: Response): Promise<void> {
  const { category, search } = req.query as Record<string, string>;

  let query = getSupabase()
    .from('oss_apps')
    .select('id, name, slug, tagline, category, replaces, github_url, stars, license, language, logo_url, has_docker, featured')
    .order('featured', { ascending: false })
    .order('stars', { ascending: false });

  if (category && category !== 'all') {
    query = query.ilike('category', category);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,replaces.ilike.%${search}%,tagline.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const apps = (data ?? []).map((app: any) => {
    const config = getDeployConfig(app.slug);
    return {
      ...app,
      deployable: config ? config.deployable : !!app.docker_image,
    };
  });

  res.json({ apps });
}

/** GET /api/apps/categories — unique category list */
export async function listCategories(req: Request, res: Response): Promise<void> {
  const { data, error } = await getSupabase()
    .from('oss_apps')
    .select('category')
    .order('category');

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const categories = [...new Set((data ?? []).map((r: any) => r.category))];
  res.json({ categories });
}

/** GET /api/apps/:slug — single app detail */
export async function getApp(req: Request, res: Response): Promise<void> {
  const { slug } = req.params;

  const { data, error } = await getSupabase()
    .from('oss_apps')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  if (!data) {
    res.status(404).json({ error: 'App not found' });
    return;
  }

  const config = getDeployConfig(data.slug);
  res.json({
    app: {
      ...data,
      deployable: config ? config.deployable : !!data.docker_image,
    },
  });
}
