import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listEnvironments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("environments")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      // Auto-provision a default environment for first-time users.
      const { data: inserted, error: insErr } = await context.supabase
        .from("environments")
        .insert({ name: "Default", kind: "dev", owner_id: context.userId })
        .select()
        .single();
      if (insErr) throw new Error(insErr.message);
      return [inserted];
    }
    return data;
  });

export const createEnvironment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        name: z.string().min(1).max(60),
        kind: z.enum(["dev", "staging", "prod"]).default("dev"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("environments")
      .insert({ name: data.name, kind: data.kind, owner_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
