-- ─────────────────────────────────────────────────────────────────────────────
-- OSS_APPS  (the directory catalog)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.oss_apps (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name           TEXT        NOT NULL,
  slug           TEXT        NOT NULL UNIQUE,
  tagline        TEXT,
  description    TEXT,
  category       TEXT        NOT NULL,
  replaces       TEXT,
  github_url     TEXT,
  website_url    TEXT,
  docker_image   TEXT,
  default_port   INT         DEFAULT 3000,
  stars          INT         DEFAULT 0,
  license        TEXT,
  language       TEXT,
  logo_url       TEXT,
  features       JSONB       DEFAULT '[]'::jsonb,
  has_docker     BOOLEAN     DEFAULT true,
  self_hostable  BOOLEAN     DEFAULT true,
  featured       BOOLEAN     DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.oss_apps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read on oss_apps" ON public.oss_apps FOR SELECT USING (true);
CREATE POLICY "Service insert on oss_apps" ON public.oss_apps FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update on oss_apps" ON public.oss_apps FOR UPDATE USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- DEPLOYMENTS  (one per user per hosted app)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deployments (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          TEXT,
  app_id           UUID        REFERENCES public.oss_apps(id) ON DELETE SET NULL,
  app_slug         TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'queued',
  live_url         TEXT,
  azure_app_name   TEXT,
  created_at       TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
  updated_at       TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read on deployments"   ON public.deployments FOR SELECT USING (true);
CREATE POLICY "Public insert on deployments" ON public.deployments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update on deployments" ON public.deployments FOR UPDATE USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- EXTRACTIONS  (Phase 1 output)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.extractions (
  id                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  product_name       TEXT        NOT NULL,
  product_url        TEXT        NOT NULL,
  features           JSONB       DEFAULT '[]'::jsonb,
  pricing_tiers      JSONB       DEFAULT '[]'::jsonb,
  resource_estimates JSONB       DEFAULT '{}'::jsonb,
  cost_report        JSONB,
  build_plan         JSONB,
  created_at         TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on extractions"
  ON public.extractions FOR SELECT USING (true);

CREATE POLICY "Allow public insert on extractions"
  ON public.extractions FOR INSERT WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- BUILDS  (Phase 2 run metadata)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.builds (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  extraction_id    UUID        REFERENCES public.extractions(id) ON DELETE CASCADE,
  project_id       TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pending',
  version          INT         NOT NULL DEFAULT 1,
  files_generated  INT         NOT NULL DEFAULT 0,
  files_stored     INT         NOT NULL DEFAULT 0,
  files_failed     TEXT[]      DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
  updated_at       TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.builds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on builds"
  ON public.builds FOR SELECT USING (true);

CREATE POLICY "Allow public insert on builds"
  ON public.builds FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on builds"
  ON public.builds FOR UPDATE USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- BUILD_FILES  (per-file blob metadata)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.build_files (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  build_id    UUID        REFERENCES public.builds(id) ON DELETE CASCADE,
  path        TEXT        NOT NULL,
  blob_path   TEXT,
  has_tests   BOOLEAN     DEFAULT false,
  step_status TEXT        NOT NULL DEFAULT 'pending',
  retries     INT         NOT NULL DEFAULT 0,
  error       TEXT,
  updated_at  TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE (build_id, path)
);

ALTER TABLE public.build_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on build_files"
  ON public.build_files FOR SELECT USING (true);

CREATE POLICY "Allow public insert on build_files"
  ON public.build_files FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on build_files"
  ON public.build_files FOR UPDATE USING (true);
