import { createFileRoute } from "@tanstack/react-router";
import { verifyRunnerSignature } from "@/lib/runner-auth.server";

export const Route = createFileRoute("/api/public/runner/claim")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await verifyRunnerSignature(request);
        if (!auth.ok) return new Response(auth.error, { status: 401 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: job } = await supabaseAdmin
          .from("job_queue")
          .select("*")
          .eq("environment_id", auth.environmentId)
          .eq("status", "queued")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (!job) return Response.json({ job: null });
        await supabaseAdmin
          .from("job_queue")
          .update({ status: "claimed", runner_id: auth.runnerId, claimed_at: new Date().toISOString() })
          .eq("id", job.id);
        return Response.json({ job });
      },
    },
  },
});
