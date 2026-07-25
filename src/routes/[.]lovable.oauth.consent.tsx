import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "motion/react";
import { supabase } from "@/integrations/supabase/client";

type AuthorizationDetails = {
  client?: { name?: string; redirect_uri?: string; client_uri?: string } | null;
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};

type OAuthNamespace = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: Error | null }>;
  approveAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: Error | null }>;
  denyAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: Error | null }>;
};

function oauth(): OAuthNamespace {
  // Supabase auth.oauth is beta; cast through unknown for typing.
  return (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;
}

function isSafeRelative(p: string | null | undefined): p is string {
  return !!p && p.startsWith("/") && !p.startsWith("//");
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="font-display text-2xl">Authorization error</h1>
      <p className="mt-3 text-sm text-foreground/60">
        {String((error as Error)?.message ?? error)}
      </p>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const res = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (res.error) {
      setBusy(false);
      setError(res.error.message);
      return;
    }
    const target = res.data?.redirect_url ?? res.data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    if (isSafeRelative(target)) {
      window.location.assign(target);
    } else {
      window.location.href = target;
    }
  }

  const clientName = details?.client?.name ?? "an app";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto max-w-md px-6 pt-24 pb-16"
      >
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-border">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M4 12L12 4L20 12L12 20L4 12Z" stroke="currentColor" strokeWidth="1.6" />
            <path d="M8 12L12 8L16 12L12 16L8 12Z" fill="currentColor" />
          </svg>
        </div>
        <h1 className="mt-6 text-center font-display text-3xl tracking-tight">
          Connect {clientName} to Breach
        </h1>
        <p className="mt-3 text-center text-[15px] text-foreground/60">
          {clientName} will be able to call Breach's enabled tools while you are signed in.
        </p>

        <div className="mt-8 rounded-2xl border border-border p-5 text-[13px]">
          <div className="flex items-center justify-between">
            <span className="text-foreground/50">Client</span>
            <span className="font-medium">{clientName}</span>
          </div>
          {details?.client?.redirect_uri && (
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-foreground/50">Redirect</span>
              <span className="truncate font-mono text-[12px]">{details.client.redirect_uri}</span>
            </div>
          )}
          <div className="mt-4 border-t border-border pt-4 text-foreground/70">
            This will let {clientName} read your engagements and findings as you.
            It does not bypass Breach's access rules.
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-4 text-[13px] text-red-600">
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-[14px] font-medium hover:bg-foreground/[0.03] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 rounded-full bg-foreground px-4 py-2.5 text-[14px] font-medium text-background hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "…" : "Approve"}
          </button>
        </div>
      </motion.main>
    </div>
  );
}
