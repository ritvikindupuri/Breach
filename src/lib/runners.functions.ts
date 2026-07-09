import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

export const listRunners = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("runners")
      .select("id,name,status,environment_id,last_seen_at,jobs_completed,created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createRunner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        name: z.string().min(1).max(60),
        environment_id: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const bootstrap = randomToken(24);
    const bootstrap_hash = await sha256Hex(bootstrap);
    const { data: row, error } = await context.supabase
      .from("runners")
      .insert({
        name: data.name,
        environment_id: data.environment_id,
        owner_id: context.userId,
        token_hash: "",
        bootstrap_hash,
        status: "offline",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { runner: row, bootstrap };
  });

export const deleteRunner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("runners").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
