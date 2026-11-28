ALTER TABLE public.tracking_links ADD COLUMN IF NOT EXISTS system_kind text CHECK (system_kind IN ('unknown','invalid'));
CREATE UNIQUE INDEX IF NOT EXISTS tracking_links_system_kind_key ON public.tracking_links(saas_id, system_kind) WHERE system_kind IS NOT NULL;

ALTER TABLE public.saas ADD COLUMN IF NOT EXISTS last_error text, ADD COLUMN IF NOT EXISTS last_error_at timestamptz;

CREATE OR REPLACE FUNCTION public.create_system_links() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.tracking_links (saas_id, code, name, channel, link_mode, system_kind) VALUES
    (NEW.id, 'sysu' || substr(replace(gen_random_uuid()::text,'-',''),1,10), 'Inconnu (lien simple)', 'unknown', 'direct', 'unknown'),
    (NEW.id, 'sysi' || substr(replace(gen_random_uuid()::text,'-',''),1,10), 'Lien invalide', 'invalid', 'direct', 'invalid')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.create_system_links() FROM public, anon, authenticated;
CREATE TRIGGER saas_create_system_links AFTER INSERT ON public.saas FOR EACH ROW EXECUTE FUNCTION public.create_system_links();

INSERT INTO public.tracking_links (saas_id, code, name, channel, link_mode, system_kind)
SELECT s.id, 'sysu' || substr(replace(gen_random_uuid()::text,'-',''),1,10), 'Inconnu (lien simple)', 'unknown', 'direct', 'unknown' FROM public.saas s
WHERE NOT EXISTS (SELECT 1 FROM public.tracking_links l WHERE l.saas_id = s.id AND l.system_kind = 'unknown');
INSERT INTO public.tracking_links (saas_id, code, name, channel, link_mode, system_kind)
SELECT s.id, 'sysi' || substr(replace(gen_random_uuid()::text,'-',''),1,10), 'Lien invalide', 'invalid', 'direct', 'invalid' FROM public.saas s
WHERE NOT EXISTS (SELECT 1 FROM public.tracking_links l WHERE l.saas_id = s.id AND l.system_kind = 'invalid');

CREATE OR REPLACE FUNCTION public.protect_system_links() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.system_kind IS NOT NULL AND pg_trigger_depth() <= 1 THEN
    RAISE EXCEPTION 'Ce lien système ne peut pas être supprimé';
  END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER tracking_links_protect_system BEFORE DELETE ON public.tracking_links FOR EACH ROW EXECUTE FUNCTION public.protect_system_links();

CREATE TABLE public.ip_rate_limits (
  key text NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);
GRANT ALL ON public.ip_rate_limits TO service_role;
ALTER TABLE public.ip_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.bump_key_rate_limit(_key text, _limit integer) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _w timestamptz := date_trunc('minute', now()); _h integer;
BEGIN
  INSERT INTO public.ip_rate_limits (key, window_start, hits) VALUES (_key, _w, 1)
  ON CONFLICT (key, window_start) DO UPDATE SET hits = ip_rate_limits.hits + 1
  RETURNING hits INTO _h;
  DELETE FROM public.ip_rate_limits WHERE window_start < now() - interval '1 hour';
  RETURN _h <= _limit;
END $$;
REVOKE ALL ON FUNCTION public.bump_key_rate_limit(text, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_key_rate_limit(text, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.link_stats_v2(_saas_id uuid)
RETURNS TABLE(link_id uuid, visits bigint, signups bigint, activations bigint, subscriptions bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT l.id,
    (SELECT count(*) FROM public.clicks c WHERE c.link_id = l.id)
      + (SELECT count(*) FROM public.events e WHERE e.link_id = l.id AND e.event_type::text = 'visit'),
    (SELECT count(DISTINCT e.external_user_id) FROM public.events e WHERE e.link_id = l.id AND e.event_type::text = 'signup'),
    (SELECT count(DISTINCT e.external_user_id) FROM public.events e WHERE e.link_id = l.id AND e.event_type::text IN ('activation','onboarding_step')),
    (SELECT count(DISTINCT e.external_user_id) FROM public.events e WHERE e.link_id = l.id AND e.event_type::text = 'subscription_activated')
  FROM public.tracking_links l WHERE l.saas_id = _saas_id
$$;
REVOKE ALL ON FUNCTION public.link_stats_v2(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.link_stats_v2(uuid) TO authenticated;