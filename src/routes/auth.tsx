import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Liminal" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/app" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    setErr(null);
    setLoading(true);
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/app`,
    });
    if (res.error) setErr(res.error.message);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex h-11 max-w-5xl items-center justify-between px-6 text-[13px]">
        <Link to="/" className="flex items-center gap-1.5 font-display tracking-tight">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
            <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <line x1="8" y1="1" x2="8" y2="15" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          <span>Liminal</span>
        </Link>
        <Link to="/" className="text-foreground/60 hover:text-foreground">
          ← Back
        </Link>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto max-w-sm px-6 pt-20 pb-16"
      >
        <h1 className="font-display text-center text-4xl leading-tight tracking-tight">
          {mode === "signin" ? "Welcome back." : "Create your vault."}
        </h1>
        <p className="mt-3 text-center text-[15px] text-foreground/60">
          {mode === "signin"
            ? "Sign in to your Liminal control plane."
            : "Your credentials are sealed with envelope encryption before they ever touch disk."}
        </p>

        <button
          onClick={google}
          disabled={loading}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-[14px] font-medium hover:bg-foreground/[0.03] disabled:opacity-50"
        >
          <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.7 1.22 9.19 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3 text-xs text-foreground/40">
          <div className="h-px flex-1 bg-border" />
          <span>or with email</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <input
              type="text"
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-[14px] outline-none focus:border-foreground/40"
            />
          )}
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-[14px] outline-none focus:border-foreground/40"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Password (min 8 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-[14px] outline-none focus:border-foreground/40"
          />
          {err && <p className="text-[13px] text-red-600">{err}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-foreground px-4 py-2.5 text-[14px] font-medium text-background hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-[13px] text-foreground/50">
          {mode === "signin" ? "New to Liminal?" : "Already have an account?"}{" "}
          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-link hover:underline"
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
