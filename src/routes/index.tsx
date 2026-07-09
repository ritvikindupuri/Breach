import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Breach — AI pen-testing for your app" },
      {
        name: "description",
        content:
          "A team of AI agents clones your repo into a disposable sandbox and probes it for real vulnerabilities. Ship, then break it — before someone else does.",
      },
      { property: "og:title", content: "Breach" },
      { property: "og:description", content: "A team of AI agents pen-tests your app in a disposable sandbox." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const ease = [0.22, 1, 0.36, 1] as const;

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-foreground selection:text-background">
      <Nav />
      <Hero />
      <How />
      <Team />
      <Trust />
      <CTA />
      <Foot />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2 text-[15px] font-medium tracking-tight">
          <Mark /> Breach
        </Link>
        <nav className="hidden items-center gap-8 text-[13px] text-muted-foreground md:flex">
          <a href="#how" className="hover:text-foreground">How it works</a>
          <a href="#team" className="hover:text-foreground">The team</a>
          <a href="#trust" className="hover:text-foreground">Sandbox</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/auth" className="text-[13px] text-muted-foreground hover:text-foreground">
            Sign in
          </Link>
          <Link
            to="/auth"
            className="rounded-full bg-foreground px-4 py-1.5 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
          >
            Start
          </Link>
        </div>
      </div>
    </header>
  );
}

function Mark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 12L12 4L20 12L12 20L4 12Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 12L12 8L16 12L12 16L8 12Z" fill="currentColor" />
    </svg>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-28 md:pb-40 md:pt-40">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="mb-6 text-[12px] uppercase tracking-[0.2em] text-muted-foreground"
        >
          Adversarial testing, on demand
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 0.05 }}
          className="max-w-4xl font-serif text-5xl leading-[1.02] tracking-[-0.02em] md:text-7xl"
        >
          Ship, then break it.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 0.15 }}
          className="mt-6 max-w-2xl text-[17px] leading-relaxed text-muted-foreground"
        >
          A team of AI agents clones your repository into a disposable sandbox and probes it for real
          vulnerabilities — reconnaissance, auth, injection, supply chain. Findings come back with proof,
          not vibes.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 0.25 }}
          className="mt-10 flex flex-wrap items-center gap-3"
        >
          <Link
            to="/auth"
            className="rounded-full bg-foreground px-6 py-3 text-[14px] font-medium text-background transition-opacity hover:opacity-90"
          >
            Start an engagement
          </Link>
          <a
            href="#how"
            className="rounded-full border border-black/10 px-6 py-3 text-[14px] font-medium text-foreground/80 transition-colors hover:bg-black/[.03]"
          >
            See how it works
          </a>
        </motion.div>
      </div>
    </section>
  );
}

function How() {
  const steps = [
    { k: "01", t: "Point us at your repo", d: "Paste a Git URL. Pick a branch, a target URL, an environment." },
    { k: "02", t: "We spin up a sandbox", d: "Your app runs in an isolated container on your own runner — no internet by default, torn down when we're done." },
    { k: "03", t: "The team probes it", d: "Four specialist agents work in parallel: recon, auth, injection, supply chain. Every probe is a real HTTP request." },
    { k: "04", t: "You get a report", d: "Severity-graded findings with reproduction steps, evidence, and a plain-English executive summary." },
  ];
  return (
    <section id="how" className="border-t border-black/5 bg-black/[.015]">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <h2 className="max-w-2xl font-serif text-3xl tracking-[-0.02em] md:text-5xl">How an engagement runs.</h2>
        <div className="mt-14 grid gap-8 md:grid-cols-4">
          {steps.map((s, i) => (
            <motion.div
              key={s.k}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease, delay: i * 0.06 }}
              className="border-t border-black/10 pt-6"
            >
              <div className="text-[11px] tracking-[0.2em] text-muted-foreground">{s.k}</div>
              <div className="mt-3 text-[15px] font-medium tracking-tight">{s.t}</div>
              <div className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{s.d}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Team() {
  const roles = [
    { n: "Recon", d: "Fingerprints the stack, checks security headers, sniffs out exposed .env, .git, backups.", cwe: "CWE-200 · CWE-538 · CWE-693" },
    { n: "AuthN", d: "Probes login flows for user enumeration, brute-force resilience, and session issues.", cwe: "CWE-204 · CWE-307 · CWE-384" },
    { n: "Injection", d: "Fuzzes reflection points for XSS, SQL error surfaces, template injection, SSRF primitives.", cwe: "CWE-79 · CWE-89 · CWE-918" },
    { n: "Supply chain", d: "Reads your manifest, flags compromised packages and oversized dependency graphs.", cwe: "CWE-506 · CWE-829" },
  ];
  return (
    <section id="team" className="border-t border-black/5">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="max-w-2xl">
          <h2 className="font-serif text-3xl tracking-[-0.02em] md:text-5xl">Four specialists. One engagement.</h2>
          <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
            Each agent has a narrow tool surface and a clear brief. They run in parallel and file findings the
            moment they have proof.
          </p>
        </div>
        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl bg-black/10 md:grid-cols-2">
          {roles.map((r, i) => (
            <motion.div
              key={r.n}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease, delay: i * 0.05 }}
              className="bg-background p-8 md:p-10"
            >
              <div className="text-[11px] tracking-[0.2em] text-muted-foreground">AGENT · {r.n.toUpperCase()}</div>
              <div className="mt-3 font-serif text-2xl tracking-[-0.02em]">{r.n}</div>
              <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">{r.d}</p>
              <div className="mt-5 font-mono text-[11px] text-muted-foreground/70">{r.cwe}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Trust() {
  const points = [
    { t: "Nothing runs on your machines.", d: "Your app runs inside a disposable Docker container on a runner you control. When the engagement ends, the container and its volume are destroyed." },
    { t: "Network is off by default.", d: "Sandboxed containers get an isolated bridge. Agents can hit the target — nothing else — unless you allowlist it." },
    { t: "Every action is signed and logged.", d: "Runners authenticate with rotating HMAC keys. Every engagement writes to a hash-chained audit log that tamper-detects." },
  ];
  return (
    <section id="trust" className="border-t border-black/5 bg-black/[.015]">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="grid gap-14 md:grid-cols-[1fr_2fr]">
          <div>
            <h2 className="font-serif text-3xl tracking-[-0.02em] md:text-5xl">Sandbox first.</h2>
            <p className="mt-5 text-[14px] leading-relaxed text-muted-foreground">
              We test destructively. That only works if the blast radius is zero.
            </p>
          </div>
          <div className="space-y-10">
            {points.map((p, i) => (
              <motion.div
                key={p.t}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, ease, delay: i * 0.06 }}
              >
                <div className="text-[15px] font-medium tracking-tight">{p.t}</div>
                <div className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{p.d}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="border-t border-black/5">
      <div className="mx-auto max-w-6xl px-6 py-24 text-center md:py-40">
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease }}
          className="mx-auto max-w-3xl font-serif text-4xl leading-[1.05] tracking-[-0.02em] md:text-6xl"
        >
          Find the bug before it finds a headline.
        </motion.h2>
        <div className="mt-10">
          <Link
            to="/auth"
            className="inline-block rounded-full bg-foreground px-8 py-4 text-[14px] font-medium text-background transition-opacity hover:opacity-90"
          >
            Start your first engagement
          </Link>
        </div>
      </div>
    </section>
  );
}

function Foot() {
  return (
    <footer className="border-t border-black/5">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-[12px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <Mark /> Breach
        </div>
        <div>© {new Date().getFullYear()}</div>
      </div>
    </footer>
  );
}
