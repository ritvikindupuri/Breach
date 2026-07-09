import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Breach — AI Security Auditing for Docker Configurations" },
      {
        name: "description",
        content:
          "A team of AI agents audits your repository Dockerfiles, compose configurations, and package manifests to find configuration flaws, credential leaks, and container vulnerabilities.",
      },
      { property: "og:title", content: "Breach — AI Security Auditing for Docker Configurations" },
      { property: "og:description", content: "A team of AI agents audits your repository Dockerfiles, compose configurations, and package manifests to find configuration flaws, credential leaks, and container vulnerabilities." },
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
          <a href="#trust" className="hover:text-foreground">Security</a>
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
          Docker Security Auditing, on demand
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 0.05 }}
          className="max-w-4xl font-serif text-5xl leading-[1.02] tracking-[-0.02em] md:text-7xl"
        >
          Audit your Docker setups. Secure your containers.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 0.15 }}
          className="mt-6 max-w-2xl text-[17px] leading-relaxed text-muted-foreground"
        >
          A team of AI agents audits your repository Dockerfiles for configuration risks, scans compose templates for exposed secrets, audits package manifests, and flags dangerous host port bindings.
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
            Start an audit
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
    { k: "01", t: "Point us at your repo", d: "Paste your public or private GitHub URL and select a branch to initiate configuration audits." },
    { k: "02", t: "Docker verification check", d: "Breach scans the repository root. If no Docker files or configurations are found, the AI team immediately rejects it." },
    { k: "03", t: "Agents audit in parallel", d: "Specialist agents check for unsafe port exposures, scan for embedded credentials, trace command injections, and find supply chain compromises." },
    { k: "04", t: "Remediation reports", d: "Get detailed severity-graded findings with Dockerfile fixes, secure configuration advice, and downloadable PDFs." },
  ];
  return (
    <section id="how" className="border-t border-black/5 bg-black/[.015]">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <h2 className="max-w-2xl font-serif text-3xl tracking-[-0.02em] md:text-5xl">How an audit runs.</h2>
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
      d: "Audits exposed container port directives in Dockerfiles and docker-compose configurations to block administrative service leaks.", 
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
      d: "Scans environment variables in docker-compose, Kubernetes templates, and env files for hardcoded passwords or default credentials.", 
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
      d: "Audits CMD and ENTRYPOINT directives in Dockerfiles and shell scripts for insecure dynamic command invocations or argument expansions.", 
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
      d: "Parses package manifests for compromised NPM packages, checks dependency footprints, and audits Dockerfile instructions for non-root USER directives, unpinned base images, and embedded secrets.", 
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
          <h2 className="font-serif text-3xl tracking-[-0.02em] md:text-5xl">Four Specialists. One Audit Run.</h2>
          <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
            Each agent has a dedicated security domain. They run in parallel during repository audits, logging active security events and documenting proof directly.
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
    { t: "In-memory code analysis.", d: "We fetch and analyze your repository structure and configurations in memory. Your setups are evaluated without execution, eliminating deployment runtime risks." },
    { t: "No persistent code storage.", d: "Your source code files are deleted the second the audit completes. We save only the structural vulnerability findings." },
    { t: "Deterministic CIS audits.", d: "Audits align directly with Center for Internet Security (CIS) benchmarks and Docker security best practices." },
  ];
  return (
    <section id="trust" className="border-t border-black/5 bg-black/[.015]">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="grid gap-14 md:grid-cols-[1fr_2fr]">
          <div>
            <h2 className="font-serif text-3xl tracking-[-0.02em] md:text-5xl">Security First.</h2>
            <p className="mt-5 text-[14px] leading-relaxed text-muted-foreground">
              Auditing infrastructure requires trusted containment. We designed our analysis pipeline to have zero persistence footprint.
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
          Secure your container configurations.
        </motion.h2>
        <div className="mt-10">
          <Link
            to="/auth"
            className="inline-block rounded-full bg-foreground px-8 py-4 text-[14px] font-medium text-background transition-opacity hover:opacity-90"
          >
            Start your first audit
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
