import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Breach — AI Pen-testing & Docker Host Security Auditing" },
      {
        name: "description",
        content:
          "A team of AI agents audits your Docker host configurations and probes web endpoints inside a disposable sandbox to find container escapes, configuration flaws, and app-level vulnerabilities.",
      },
      { property: "og:title", content: "Breach" },
      { property: "og:description", content: "AI pen-testing & Docker Host auditing sandbox." },
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
          <a href="#trust" className="hover:text-foreground">Auditors</a>
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
          Docker Host Auditing & Pen-testing, on demand
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 0.05 }}
          className="max-w-4xl font-serif text-5xl leading-[1.02] tracking-[-0.02em] md:text-7xl"
        >
          Audit your host. Break your apps.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 0.15 }}
          className="mt-6 max-w-2xl text-[17px] leading-relaxed text-muted-foreground"
        >
          A team of AI agents audits your local Docker socket configuration, parses Dockerfiles for secure isolation, scans images for package CVEs, and safely probes web endpoints for security risks.
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
            Start auditing now
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
    { k: "01", t: "Register a Host Auditor", d: "Add a new auditor client in the dashboard and get a secure one-step connection bootstrap key." },
    { k: "02", t: "Deploy the local agent", d: "Run the lightweight container auditor on your host. It links to the Docker socket to verify local policies." },
    { k: "03", t: "Agents audit environment", d: "Specialist agents execute daemon inspection, scan manifest dependencies, check container escapes, and probe APIs." },
    { k: "04", t: "Remediate findings", d: "Review security reports with step-by-step reproduction code, database stack outputs, and plain-English recommendations." },
  ];
  return (
    <section id="how" className="border-t border-black/5 bg-black/[.015]">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <h2 className="max-w-2xl font-serif text-3xl tracking-[-0.02em] md:text-5xl">How Breach Audits Your Host</h2>
        <div className="mt-16 flex flex-col md:flex-row items-stretch justify-between gap-8 md:gap-4">
          {steps.map((s, i) => (
            <motion.div
              key={s.k}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease, delay: i * 0.08 }}
              className="flex-1 border-t border-black/10 pt-6 relative group"
            >
              {/* Interactive step connector arrow on desktop */}
              {i < 3 && (
                <div className="hidden md:block absolute top-[18px] -right-2 translate-x-1/2 text-black/25 text-sm font-bold z-10 transition-transform group-hover:translate-x-1">
                  ➔
                </div>
              )}

              <div className="text-[11px] font-mono tracking-[0.2em] text-muted-foreground">STEP {s.k}</div>
              <div className="mt-3 text-[15px] font-bold tracking-tight text-foreground">{s.t}</div>
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
    { 
      n: "Recon", 
      d: "Fingerprints the host daemon, verifies security headers, checks Server banners, and audits for exposed dotfiles or environment backups.", 
      cwe: "CWE-200 · CWE-538 · CWE-693",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      )
    },
    { 
      n: "AuthN", 
      d: "Probes authorization portals for credential enumeration issues, brute force blocks, and session token vulnerabilities.", 
      cwe: "CWE-204 · CWE-307 · CWE-384",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      )
    },
    { 
      n: "Injection", 
      d: "Fuzzes query parameters for reflected XSS entry points, filters database response exceptions, and monitors SQL error signatures.", 
      cwe: "CWE-79 · CWE-89 · CWE-918",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
          <line x1="12" y1="2" x2="12" y2="22" />
        </svg>
      )
    },
    { 
      n: "Supply chain", 
      d: "Parses package manifests for compromised NPM packages, checks image dependencies, and audits total package bloat vulnerability.", 
      cwe: "CWE-506 · CWE-829",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      )
    },
  ];
  return (
    <section id="team" className="border-t border-black/5">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="max-w-2xl">
          <h2 className="font-serif text-3xl tracking-[-0.02em] md:text-5xl">Four Specialists. One Auditor Agent.</h2>
          <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
            Each agent has a dedicated security domain. They run in parallel during host checkups, logging active network events and documenting proof directly.
          </p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {roles.map((r, i) => (
            <motion.div
              key={r.n}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease, delay: i * 0.06 }}
              className="rounded-2xl border border-black/10 bg-white p-8 hover:border-black/30 hover:scale-[1.01] transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-black/[0.03] text-muted-foreground group-hover:bg-foreground group-hover:text-background transition-colors">
                    {r.icon}
                  </div>
                  <div>
                    <div className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground">SPECIALIST</div>
                    <div className="font-serif text-xl tracking-tight text-foreground">{r.n} Agent</div>
                  </div>
                </div>
                <p className="mt-5 text-[13.5px] leading-relaxed text-muted-foreground">{r.d}</p>
              </div>
              <div className="mt-6 pt-4 border-t border-black/5 font-mono text-[10px] text-muted-foreground/70">
                AUDITS: {r.cwe}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Trust() {
  const points = [
    { t: "Secure read-only socket mounts.", d: "The auditor reads container manifests and daemon files without write permissions to the host OS layers, ensuring zero modifications to host files." },
    { t: "No cloud telemetry leaks.", d: "Raw image layers and source code stay inside your host sandbox. The auditor reports only structural security findings back to the control panel." },
    { t: "Tamper-evident audit chain.", d: "Every auditor agent validates commands via signed bootstrap handshakes, keeping execution logs authentic." },
  ];
  return (
    <section id="trust" className="border-t border-black/5 bg-black/[.015]">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="grid gap-14 md:grid-cols-[1fr_2fr]">
          <div>
            <h2 className="font-serif text-3xl tracking-[-0.02em] md:text-5xl">Built for Isolation.</h2>
            <p className="mt-5 text-[14px] leading-relaxed text-muted-foreground">
              Auditing infrastructure requires trusted containment. We designed our agent to have a zero host footprint.
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
          Secure your host. Protect your images.
        </motion.h2>
        <div className="mt-10">
          <Link
            to="/auth"
            className="inline-block rounded-full bg-foreground px-8 py-4 text-[14px] font-medium text-background transition-opacity hover:opacity-90"
          >
            Start your host audit
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
