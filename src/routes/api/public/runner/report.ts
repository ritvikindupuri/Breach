import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyRunnerSignature } from "@/lib/runner-auth.server";

const findingSchema = z.object({
  engagement_id: z.string().uuid(),
  agent_run_id: z.string().uuid().optional(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(4000),
  evidence: z.record(z.string(), z.unknown()).default({}),
  remediation: z.string().max(2000).optional(),
  cwe: z.string().max(40).optional(),
});

export const Route = createFileRoute("/api/public/runner/report")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await verifyRunnerSignature(request);
        if (!auth.ok) return new Response(auth.error, { status: 401 });
        const parsed = findingSchema.safeParse(JSON.parse(auth.body || "{}"));
        if (!parsed.success)
          return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // Ownership check: engagement must belong to same owner as runner.
        const { data: eng } = await supabaseAdmin
          .from("engagements")
          .select("owner_id,environment_id")
          .eq("id", parsed.data.engagement_id)
          .maybeSingle();
        if (!eng || eng.owner_id !== auth.ownerId || eng.environment_id !== auth.environmentId)
          return new Response("forbidden", { status: 403 });
        const { error } = await supabaseAdmin.from("findings").insert({
          engagement_id: parsed.data.engagement_id,
          agent_run_id: parsed.data.agent_run_id ?? null,
          owner_id: auth.ownerId,
          severity: parsed.data.severity,
          title: parsed.data.title,
          description: parsed.data.description,
          evidence: parsed.data.evidence as never,
          remediation: parsed.data.remediation ?? null,
          cwe: parsed.data.cwe ?? null,
        });
        if (error) return new Response(error.message, { status: 500 });
        return Response.json({ ok: true });
      },
    },
  },
});
