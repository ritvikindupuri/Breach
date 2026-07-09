import { createFileRoute } from "@tanstack/react-router";

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
function randomToken(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const Route = createFileRoute("/api/public/runner/register")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as {
          runner_id?: string;
          bootstrap_token?: string;
        } | null;
        if (!body?.runner_id || !body?.bootstrap_token) {
          return new Response(JSON.stringify({ error: "runner_id and bootstrap_token required" }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: runner } = await supabaseAdmin
          .from("runners")
          .select("id,bootstrap_hash,token_hash")
          .eq("id", body.runner_id)
          .maybeSingle();
        if (!runner || !runner.bootstrap_hash) {
          return new Response(JSON.stringify({ error: "unknown runner" }), { status: 401, headers: { "content-type": "application/json" } });
        }
        const provided = await sha256Hex(body.bootstrap_token);
        if (provided !== runner.bootstrap_hash) {
          return new Response(JSON.stringify({ error: "invalid bootstrap token" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }
        const signingSecret = randomToken(32);
        const token_hash = await sha256Hex(signingSecret);
        await supabaseAdmin
          .from("runners")
          .update({ token_hash, bootstrap_hash: null, status: "online", last_seen_at: new Date().toISOString() })
          .eq("id", runner.id);
        return Response.json({ runner_id: runner.id, signing_secret: signingSecret });
      },
    },
  },
});
