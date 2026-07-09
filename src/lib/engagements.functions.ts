import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const AGENT_KINDS = ["recon", "authn", "injection", "supply_chain"] as const;

export const listEngagements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("engagements")
      .select("id,name,repo_url,branch,target_url,status,verdict,started_at,finished_at,created_at,environment_id")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    if (!data || data.length === 0) return [];
    const ids = data.map((e) => e.id);
    const { data: counts } = await context.supabase
      .from("findings")
      .select("engagement_id,severity")
      .in("engagement_id", ids);
    const byEng = new Map<string, { total: number; critical: number; high: number }>();
    for (const id of ids) byEng.set(id, { total: 0, critical: 0, high: 0 });
    for (const f of counts ?? []) {
      const b = byEng.get(f.engagement_id)!;
      b.total++;
      if (f.severity === "critical") b.critical++;
      if (f.severity === "high") b.high++;
    }
    return data.map((e) => ({ ...e, findings: byEng.get(e.id)! }));
  });

export const getEngagement = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: eng, error } = await context.supabase
      .from("engagements")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);

    const { data: runs } = await context.supabase
      .from("agent_runs")
      .select("*")
      .eq("engagement_id", data.id)
      .order("created_at", { ascending: true });

    const { data: findings } = await context.supabase
      .from("findings")
      .select("*")
      .eq("engagement_id", data.id)
      .order("severity", { ascending: false })
      .order("created_at", { ascending: false });

    return { engagement: eng, agent_runs: runs ?? [], findings: findings ?? [] };
  });

export const createEngagement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        name: z.string().min(1).max(80),
        repo_url: z.string().url().max(300),
        branch: z.string().min(1).max(60).default("main"),
        target_url: z.string().url().max(300).optional(),
        environment_id: z.string().uuid(),
        agent_kinds: z.array(z.enum(AGENT_KINDS)).min(1).default(["recon", "authn", "injection", "supply_chain"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: eng, error } = await context.supabase
      .from("engagements")
      .insert({
        owner_id: context.userId,
        environment_id: data.environment_id,
        name: data.name,
        repo_url: data.repo_url,
        branch: data.branch,
        target_url: data.target_url ?? null,
        agent_kinds: data.agent_kinds,
        status: "queued",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Create agent_run rows
    await context.supabase.from("agent_runs").insert(
      data.agent_kinds.map((k) => ({
        engagement_id: eng.id,
        owner_id: context.userId,
        kind: k,
        status: "pending" as const,
      })),
    );

    // Kick off the agent team asynchronously (in-process). Runners can pick
    // this up later once online; server-side loop provides first-run findings.
    void (async () => {
      try {
        const { runEngagement } = await import("./agents.server");
        await runEngagement(eng.id);
      } catch (err) {
        console.error("[engagement runner] failed", err);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin
          .from("engagements")
          .update({ status: "failed", finished_at: new Date().toISOString() })
          .eq("id", eng.id);
      }
    })();

    return eng;
  });

export const cancelEngagement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("engagements")
      .update({ status: "cancelled", finished_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
