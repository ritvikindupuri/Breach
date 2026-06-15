import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";

export const Route = createFileRoute("/configure")({
  head: () => ({
    meta: [
      { title: "Configure AWS — AIM Proxy" },
      {
        name: "description",
        content:
          "Securely connect your AWS account to AIM Proxy. Credentials are encrypted at rest and scoped per environment.",
      },
    ],
  }),
  component: Configure,
});

const ease = [0.16, 1, 0.3, 1] as const;

function Configure() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[500px] bg-radial-fade" />

      <header className="relative z-10 mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <Link to="/" className="font-display text-lg">← AIM Proxy</Link>
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-signal">
          Secure setup
        </span>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-6 pb-24 pt-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease }}
        >
          <h1 className="font-display text-4xl tracking-tight text-gradient md:text-5xl">
            Connect AWS, securely.
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            To store credentials with envelope encryption, signed audit trails, and per-user
            isolation, enable Lovable Cloud. We&apos;ll wire up the encrypted vault and
            authenticated configuration flow next.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease, delay: 0.1 }}
          className="mt-10 grid gap-4"
        >
          {[
            {
              k: "01",
              t: "Authenticated accounts",
              b: "Each user signs in before they can see or touch their AWS keys.",
            },
            {
              k: "02",
              t: "Encrypted at rest",
              b: "Access keys are encrypted server-side. They never appear in logs or telemetry.",
            },
            {
              k: "03",
              t: "Least-privilege only",
              b: "We recommend a scoped IAM role rather than a root access key.",
            },
          ].map((s, i) => (
            <motion.div
              key={s.k}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease, delay: 0.15 + i * 0.08 }}
              className="flex gap-5 rounded-2xl hairline bg-card/60 p-5 backdrop-blur"
            >
              <div className="font-mono text-sm text-signal">{s.k}</div>
              <div>
                <div className="font-display text-lg">{s.t}</div>
                <div className="mt-1 text-sm text-muted-foreground">{s.b}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease, delay: 0.35 }}
          className="mt-10 rounded-2xl hairline bg-card/70 p-6 backdrop-blur"
        >
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Next step
          </div>
          <p className="mt-2 text-foreground">
            Ask Lovable to <span className="text-signal">enable Lovable Cloud</span> — we&apos;ll
            generate the auth flow and the encrypted credential vault for your AWS access key,
            secret, region, and optional session token.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
