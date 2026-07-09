// HMAC verification for self-hosted runner callbacks.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function hmacSha256Hex(key: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(msg));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type VerifyResult =
  | { ok: true; runnerId: string; body: string; ownerId: string; environmentId: string }
  | { ok: false; error: string };

export async function verifyRunnerSignature(request: Request): Promise<VerifyResult> {
  const runnerId = request.headers.get("x-runner-id");
  const signature = request.headers.get("x-signature");
  const secretHeader = request.headers.get("x-runner-secret");
  if (!runnerId) return { ok: false, error: "missing X-Runner-Id" };
  const body = await request.text();

  const { data: runner } = await supabaseAdmin
    .from("runners")
    .select("id,owner_id,environment_id,token_hash")
    .eq("id", runnerId)
    .maybeSingle();
  if (!runner || !runner.token_hash) return { ok: false, error: "unknown runner" };

  // Two accepted auth modes:
  //   1) HMAC signature of the body using the signing secret (preferred).
  //   2) X-Runner-Secret header equal to the secret (simpler for CLI use).
  if (secretHeader) {
    const provided = await sha256Hex(secretHeader);
    if (!timingSafeEqualHex(provided, runner.token_hash)) return { ok: false, error: "invalid secret" };
  } else if (signature) {
    // We can only recompute HMAC if we still have the plaintext secret. We
    // don't (we only store the hash), so require secret-header mode for now.
    return { ok: false, error: "hmac mode unavailable — send X-Runner-Secret" };
  } else {
    return { ok: false, error: "missing auth" };
  }

  return { ok: true, runnerId: runner.id, body, ownerId: runner.owner_id, environmentId: runner.environment_id };
}
