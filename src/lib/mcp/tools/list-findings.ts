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
  name: "list_findings",
  title: "List findings",
  description:
    "List the signed-in user's security findings across engagements, optionally filtered by severity or engagement. Read-only.",
  inputSchema: {
    limit: z.number().int().min(1).max(200).default(50),
    severity: z.enum(["low", "medium", "high", "critical"]).optional(),
    engagement_id: z.string().uuid().optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, severity, engagement_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    let q = supabaseForUser(ctx)
      .from("findings")
      .select("id,engagement_id,severity,title,description,remediation,cwe,created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (severity) q = q.eq("severity", severity);
    if (engagement_id) q = q.eq("engagement_id", engagement_id);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { findings: data ?? [] },
    };
  },
});
