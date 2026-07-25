import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_engagement",
  title: "Get engagement",
  description:
    "Get one engagement with its agent runs and findings. Scoped to the signed-in user. Read-only.",
  inputSchema: {
    id: z.string().uuid().describe("Engagement UUID."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    const { data: engagement, error } = await sb
      .from("engagements")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!engagement) return { content: [{ type: "text", text: "Not found" }], isError: true };
    const { data: runs } = await sb.from("agent_runs").select("*").eq("engagement_id", id);
    const { data: findings } = await sb
      .from("findings")
      .select("*")
      .eq("engagement_id", id)
      .order("severity", { ascending: false });
    const payload = { engagement, agent_runs: runs ?? [], findings: findings ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
