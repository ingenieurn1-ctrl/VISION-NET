// Server-only: link attribution (first touch, 30 days) and error recording for VisionNet ingestion.
type Db = typeof import("@/integrations/supabase/client.server").supabaseAdmin;

const THIRTY_DAYS = 30 * 24 * 3600 * 1000;

async function systemLink(db: Db, saasId: string, kind: "unknown" | "invalid") {
  const { data } = await db.from("tracking_links").select("id").eq("saas_id", saasId).eq("system_kind", kind).maybeSingle();
  return data?.id ?? null;
}

async function knownLinkIds(db: Db, saasId: string) {
  const { data } = await db.from("tracking_links").select("id").eq("saas_id", saasId).is("system_kind", null);
  return (data ?? []).map((l) => l.id);
}

/**
 * Resolves the link an event belongs to:
 * a valid vn_ref wins; an unknown vn_ref goes to "Lien invalide";
 * without vn_ref, the first known source of this visitor/user (30 days) is kept; otherwise "Inconnu".
 */
export async function resolveLink(
  db: Db,
  saasId: string,
  opts: { ref?: string | null; visitorId?: string | null; externalUserId?: string | null },
): Promise<string | null> {
  if (opts.ref) {
    const { data } = await db.from("tracking_links").select("id").eq("code", opts.ref).eq("saas_id", saasId).maybeSingle();
    if (data) return data.id;
    // A known first touch is never replaced by an invalid ref either.
  }
  const known = await knownLinkIds(db, saasId);
  if (known.length) {
    const since = new Date(Date.now() - THIRTY_DAYS).toISOString();
    if (opts.visitorId) {
      const { data } = await db.from("events").select("link_id").eq("saas_id", saasId).eq("visitor_id", opts.visitorId)
        .in("link_id", known).gte("created_at", since).order("created_at").limit(1);
      if (data?.[0]?.link_id) return data[0].link_id;
    }
    if (opts.externalUserId) {
      const { data } = await db.from("events").select("link_id").eq("saas_id", saasId).eq("external_user_id", opts.externalUserId)
        .in("link_id", known).order("created_at").limit(1);
      if (data?.[0]?.link_id) return data[0].link_id;
    }
  }
  return systemLink(db, saasId, opts.ref ? "invalid" : "unknown");
}

export async function recordError(db: Db, saasId: string, message: string) {
  await db.from("saas").update({ last_error: message.slice(0, 300), last_error_at: new Date().toISOString() }).eq("id", saasId);
}

export function sameSite(origin: string, saasUrl: string) {
  try {
    const a = new URL(origin).hostname.replace(/^www\./, "");
    const b = new URL(saasUrl).hostname.replace(/^www\./, "");
    return a === b || a.endsWith(`.${b}`);
  } catch {
    return false;
  }
}
