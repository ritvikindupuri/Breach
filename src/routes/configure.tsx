import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";

export const Route = createFileRoute("/configure")({
  head: () => ({
    meta: [
      { title: "Configure — Liminal" },
      {
        name: "description",
        content:
          "Connect AWS to Liminal. Credentials are encrypted at rest and scoped per environment.",
      },
    ],
  }),
  component: Configure,
});

const ease = [0.22, 1, 0.36, 1] as const;

function Configure() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-11 max-w-5xl items-center justify-between px-6 text-[13px]">
          <Link to="/" className="font-display tracking-tight">‹ Liminal</Link>
          <span className="text-foreground/50">Secure setup</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-32 pt-24 text-center md:pt-32">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease }}
          className="text-[13px] font-medium uppercase tracking-[0.18em] text-foreground/50"
        >
          Configure
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease, delay: 0.05 }}
          className="font-display mt-4 text-balance text-5xl leading-[1.05] md:text-6xl"
        >
          Connect AWS.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease, delay: 0.15 }}
          className="mx-auto mt-5 max-w-md text-pretty text-foreground/60 md:text-lg"
        >
          To store keys with envelope encryption and per-user isolation,
          enable the secure backend next.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease, delay: 0.25 }}
          className="mx-auto mt-12 max-w-md rounded-2xl border border-border bg-card p-6 text-left text-[15px]"
        >
          {[
            ["Signed-in accounts", "Each user authenticates before viewing or touching keys."],
            ["Encrypted at rest", "Keys never appear in logs, telemetry, or client storage."],
            ["Least privilege", "We recommend a scoped IAM role over a root access key."],
          ].map(([t, b], i) => (
            <div
              key={t}
              className={
                "flex gap-4 py-4 " +
                (i > 0 ? "border-t border-border" : "")
              }
            >
              <span className="font-mono text-[12px] text-foreground/40">0{i + 1}</span>
              <div>
                <div className="font-display tracking-tight">{t}</div>
                <div className="mt-1 text-[14px] text-foreground/60">{b}</div>
              </div>
            </div>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, ease, delay: 0.4 }}
          className="mt-8 text-[13px] text-foreground/50"
        >
          Ask Lovable to enable the secure backend to continue.
        </motion.p>
      </main>
    </div>
  );
}
