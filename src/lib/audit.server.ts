// Server-only audit log writer with hash-chaining.
// Each entry contains sha256(prev_hash + canonical(entry)); tampering with
// the chain is detectable.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  const b = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < b.length; i++) out += b[i].toString(16).padStart(2, "0");
  return out;
}

type AuditEntry = {
  actor_id: string | null;
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  environment_id?: string | null;
  metadata?: Record<string, unknown>;
};

export async function writeAudit(entry: AuditEntry): Promise<void> {
  const { data: last } = await supabaseAdmin
    .from("audit_log")
    .select("entry_hash")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const prev_hash = last?.entry_hash ?? null;
  const canonical = JSON.stringify({
    actor_id: entry.actor_id,
    action: entry.action,
    target_type: entry.target_type ?? null,
    target_id: entry.target_id ?? null,
    environment_id: entry.environment_id ?? null,
    metadata: entry.metadata ?? {},
    prev_hash,
    ts: Date.now(),
  });
  const entry_hash = await sha256Hex(canonical);

  await supabaseAdmin.from("audit_log").insert({
    actor_id: entry.actor_id,
    action: entry.action,
    target_type: entry.target_type ?? null,
    target_id: entry.target_id ?? null,
    environment_id: entry.environment_id ?? null,
    metadata: (entry.metadata ?? {}) as never,
    prev_hash,
    entry_hash,
  });
}
