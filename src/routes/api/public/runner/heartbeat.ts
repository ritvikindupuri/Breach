import { createFileRoute } from "@tanstack/react-router";
import { verifyRunnerSignature } from "@/lib/runner-auth.server";

export const Route = createFileRoute("/api/public/runner/heartbeat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await verifyRunnerSignature(request);
        if (!auth.ok) return new Response(auth.error, { status: 401 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin
          .from("runners")
          .update({ status: "online", last_seen_at: new Date().toISOString() })
          .eq("id", auth.runnerId);
        return Response.json({ ok: true });
      },
    },
  },
});
