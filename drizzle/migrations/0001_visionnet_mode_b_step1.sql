ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'visit';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'activation';

ALTER TABLE public.tracking_links
  ADD COLUMN IF NOT EXISTS link_mode text NOT NULL DEFAULT 'redirect',
  ADD COLUMN IF NOT EXISTS destination_path text;
UPDATE public.tracking_links SET link_mode = 'redirect';
ALTER TABLE public.tracking_links ALTER COLUMN link_mode SET DEFAULT 'direct';
ALTER TABLE public.tracking_links ADD CONSTRAINT tracking_links_link_mode_check CHECK (link_mode IN ('redirect','direct'));

ALTER TABLE public.saas
  ADD COLUMN IF NOT EXISTS site_id text DEFAULT ('mkt_' || substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  ADD COLUMN IF NOT EXISTS public_key text DEFAULT ('pk_live_' || replace(gen_random_uuid()::text,'-','') || substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  ADD COLUMN IF NOT EXISTS first_visit_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_visit_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_server_event_at timestamptz;
UPDATE public.saas SET site_id = 'mkt_' || substr(replace(gen_random_uuid()::text,'-',''),1,8) WHERE site_id IS NULL;
UPDATE public.saas SET public_key = 'pk_live_' || replace(gen_random_uuid()::text,'-','') || substr(replace(gen_random_uuid()::text,'-',''),1,8) WHERE public_key IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS saas_site_id_key ON public.saas(site_id);
CREATE UNIQUE INDEX IF NOT EXISTS saas_public_key_key ON public.saas(public_key);

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS visitor_id text;
CREATE INDEX IF NOT EXISTS events_visitor_idx ON public.events(saas_id, visitor_id);

CREATE OR REPLACE VIEW public.visits_unified WITH (security_invoker = true) AS
  SELECT c.id, l.saas_id, c.link_id, NULL::text AS visitor_id, c.referrer, c.created_at, 'click'::text AS source
  FROM public.clicks c JOIN public.tracking_links l ON l.id = c.link_id
  UNION ALL
  SELECT e.id, e.saas_id, e.link_id, e.visitor_id, e.metadata->>'referrer', e.created_at, 'visit'::text
  FROM public.events e WHERE e.event_type::text = 'visit';
GRANT SELECT ON public.visits_unified TO authenticated;
GRANT SELECT ON public.visits_unified TO service_role;