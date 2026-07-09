// Server-only pen-test agent orchestrator.
//
// This runs the AI agent team in-process against a target URL. When a
// self-hosted runner comes online it will claim jobs via the public API
// instead — but this in-process loop gives the app real findings from real
// HTTP probes even without a runner, using Lovable AI Gateway for
// reasoning + synthesis.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { writeAudit } from "./audit.server";

type AgentKind = "recon" | "authn" | "injection" | "supply_chain";
type Severity = "low" | "medium" | "high" | "critical";

interface Finding {
  severity: Severity;
  title: string;
  description: string;
  evidence: Record<string, unknown>;
  remediation?: string;
  cwe?: string;
}

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function chat(messages: Array<{ role: string; content: string }>, model = "google/gemini-2.5-flash"): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return "";
  try {
    const res = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages }),
    });
    if (!res.ok) return "";
    const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return j.choices?.[0]?.message?.content ?? "";
  } catch {
    return "";
  }
}

async function safeFetch(url: string, init?: RequestInit, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal, redirect: "manual" });
    const text = await res.text().catch(() => "");
    return {
      ok: true as const,
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
      body: text.slice(0, 4000),
    };
  } catch (e: unknown) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(t);
  }
}

async function updateRun(id: string, patch: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await supabaseAdmin.from("agent_runs").update(patch as any).eq("id", id);
}

async function recordFinding(
  engagementId: string,
  ownerId: string,
  agentRunId: string,
  f: Finding,
) {
  await supabaseAdmin.from("findings").insert({
    engagement_id: engagementId,
    agent_run_id: agentRunId,
    owner_id: ownerId,
    severity: f.severity,
    title: f.title,
    description: f.description,
    evidence: f.evidence as never,
    remediation: f.remediation ?? null,
    cwe: f.cwe ?? null,
  });
}

// --- Specialist agents -------------------------------------------------

async function runRecon(target: string, engagementId: string, ownerId: string, runId: string): Promise<Finding[]> {
  await updateRun(runId, { status: "running", started_at: new Date().toISOString(), current_step: "fingerprinting" });
  const findings: Finding[] = [];
  const root = await safeFetch(target);
  await updateRun(runId, { current_step: "reading response headers", step_count: 1 });

  if (root.ok) {
    const h = root.headers;
    const missing: string[] = [];
    if (!h["strict-transport-security"]) missing.push("Strict-Transport-Security");
    if (!h["content-security-policy"]) missing.push("Content-Security-Policy");
    if (!h["x-frame-options"] && !(h["content-security-policy"] ?? "").includes("frame-ancestors"))
      missing.push("X-Frame-Options / CSP frame-ancestors");
    if (!h["x-content-type-options"]) missing.push("X-Content-Type-Options");
    if (!h["referrer-policy"]) missing.push("Referrer-Policy");
    if (!h["permissions-policy"]) missing.push("Permissions-Policy");
    if (missing.length) {
      findings.push({
        severity: missing.length >= 4 ? "high" : "medium",
        title: `Missing security headers (${missing.length})`,
        description: `The target is not sending: ${missing.join(", ")}. These headers are the first line of defense against clickjacking, MIME sniffing, and cross-site injection.`,
        evidence: { url: target, missing, observed_headers: h },
        remediation: "Configure your web server / framework middleware to set the missing headers on every HTML response.",
        cwe: "CWE-693",
      });
    }
    if (h["server"] || h["x-powered-by"]) {
      findings.push({
        severity: "low",
        title: "Server banner leaks stack details",
        description: `Response advertises ${h["server"] ?? ""} ${h["x-powered-by"] ?? ""}. Fingerprinting narrows the attack surface for CVE-specific exploits.`,
        evidence: { server: h["server"], x_powered_by: h["x-powered-by"] },
        remediation: "Strip Server and X-Powered-By headers at the edge / reverse proxy.",
        cwe: "CWE-200",
      });
    }
  }

  // Probe common exposed paths
  await updateRun(runId, { current_step: "probing exposed files", step_count: 2 });
  const suspicious = [".env", ".git/config", ".git/HEAD", "backup.sql", "package.json", ".DS_Store"];
  const base = target.replace(/\/$/, "");
  for (const p of suspicious) {
    const r = await safeFetch(`${base}/${p}`);
    if (r.ok && r.status === 200 && r.body.length > 5) {
      findings.push({
        severity: p === ".env" || p === "backup.sql" ? "critical" : "high",
        title: `Sensitive file exposed: /${p}`,
        description: `The server returned 200 for /${p}. This should never be publicly readable.`,
        evidence: { url: `${base}/${p}`, status: r.status, snippet: r.body.slice(0, 300) },
        remediation: "Block dotfiles, VCS metadata, and backups at the web server / CDN layer.",
        cwe: "CWE-538",
      });
    }
  }

  await updateRun(runId, { current_step: "complete", step_count: 3, status: "complete", finished_at: new Date().toISOString() });
  return findings;
}

async function runAuthN(target: string, engagementId: string, ownerId: string, runId: string): Promise<Finding[]> {
  await updateRun(runId, { status: "running", started_at: new Date().toISOString(), current_step: "locating login endpoints" });
  const findings: Finding[] = [];
  const base = target.replace(/\/$/, "");
  const paths = ["/login", "/api/login", "/auth", "/api/auth/login", "/signin"];
  for (const p of paths) {
    const r = await safeFetch(`${base}${p}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "does-not-exist@example.invalid", password: "x" }) });
    if (!r.ok) continue;
    await updateRun(runId, { current_step: `probing ${p}`, step_count: 1 });
    if (r.status === 200 || r.status === 429) continue;
    // Check for user enumeration: try a second request with different email
    const r2 = await safeFetch(`${base}${p}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "admin@example.com", password: "x" }) });
    if (r2.ok && r.body && r2.body && r.body !== r2.body && Math.abs(r.body.length - r2.body.length) > 5) {
      findings.push({
        severity: "medium",
        title: "Possible user enumeration on login",
        description: `Different response bodies for a non-existent vs. plausible email on ${p}. Attackers can enumerate valid accounts.`,
        evidence: { path: p, len_a: r.body.length, len_b: r2.body.length, status_a: r.status, status_b: r2.status },
        remediation: "Return identical responses (same status, body, timing) whether the account exists or not.",
        cwe: "CWE-204",
      });
    }
  }
  await updateRun(runId, { current_step: "complete", step_count: 2, status: "complete", finished_at: new Date().toISOString() });
  return findings;
}

async function runInjection(target: string, engagementId: string, ownerId: string, runId: string): Promise<Finding[]> {
  await updateRun(runId, { status: "running", started_at: new Date().toISOString(), current_step: "probing reflection points" });
  const findings: Finding[] = [];
  const base = target.replace(/\/$/, "");
  const marker = "brXss<script>__PROBE__</script>";
  const r = await safeFetch(`${base}/?q=${encodeURIComponent(marker)}`);
  if (r.ok && r.body.includes(marker)) {
    findings.push({
      severity: "high",
      title: "Reflected input rendered without encoding",
      description: "Untrusted query-string content appears verbatim in the HTML response, including a <script> tag. This is a reflected XSS primitive.",
      evidence: { url: `${base}/?q=<probe>`, reflected: true, snippet: r.body.slice(0, 300) },
      remediation: "Encode all user-controlled output with your template engine's HTML-escape helper; add a strict Content-Security-Policy.",
      cwe: "CWE-79",
    });
  }
  const sqlMarker = "'\"><probe>";
  const r2 = await safeFetch(`${base}/api/search?q=${encodeURIComponent(sqlMarker)}`);
  if (r2.ok && /SQL syntax|PostgreSQL|SQLite|ORA-\d+|MySQL/i.test(r2.body)) {
    findings.push({
      severity: "critical",
      title: "SQL error surfaces on malformed input",
      description: "The server responded with a database error message when receiving an unescaped quote character. This strongly indicates SQL injection.",
      evidence: { url: `${base}/api/search`, status: r2.status, snippet: r2.body.slice(0, 400) },
      remediation: "Use parameterized queries / prepared statements for every database call. Never concatenate user input into SQL.",
      cwe: "CWE-89",
    });
  }
  await updateRun(runId, { current_step: "complete", step_count: 2, status: "complete", finished_at: new Date().toISOString() });
  return findings;
}

async function runSupplyChain(repoUrl: string, engagementId: string, ownerId: string, runId: string): Promise<Finding[]> {
  await updateRun(runId, { status: "running", started_at: new Date().toISOString(), current_step: "cloning repo metadata" });
  const findings: Finding[] = [];

  // Best-effort: for github.com repos, fetch package.json via the raw endpoint.
  const gh = /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/.exec(repoUrl);
  if (gh) {
    const [, owner, repo] = gh;
    for (const branch of ["main", "master"]) {
      const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/package.json`;
      const r = await safeFetch(url);
      if (r.ok && r.status === 200 && r.body.trim().startsWith("{")) {
        await updateRun(runId, { current_step: "parsing dependencies", step_count: 1 });
        try {
          const pkg = JSON.parse(r.body) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
          const all = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
          const knownBad: Record<string, string> = {
            "event-stream": "Historic supply-chain compromise (2018). Any pinned version is suspect.",
            "flatmap-stream": "Historic supply-chain compromise. Remove immediately.",
            "ua-parser-js": "Some 0.7.29-era versions were malicious. Verify version.",
          };
          for (const dep of Object.keys(all)) {
            if (knownBad[dep]) {
              findings.push({
                severity: "critical",
                title: `Compromised dependency: ${dep}`,
                description: knownBad[dep],
                evidence: { dep, version: all[dep] },
                remediation: `Remove ${dep} from package.json and audit any code that imported it.`,
                cwe: "CWE-506",
              });
            }
          }
          if (Object.keys(all).length > 250) {
            findings.push({
              severity: "low",
              title: "Large dependency footprint",
              description: `${Object.keys(all).length} direct dependencies. Each is a supply-chain risk. Consider auditing and pruning.`,
              evidence: { count: Object.keys(all).length },
              remediation: "Audit with `npm ls`, remove unused packages, prefer well-maintained libraries over transitive deep trees.",
            });
          }
        } catch {
          /* noop */
        }
        break;
      }
    }
  } else {
    findings.push({
      severity: "low",
      title: "Repository not hosted on GitHub",
      description: "The supply-chain agent could not fetch dependency metadata without a runner. Deploy a runner in your environment for full clone + analysis.",
      evidence: { repo_url: repoUrl },
    });
  }
  await updateRun(runId, { current_step: "complete", step_count: 2, status: "complete", finished_at: new Date().toISOString() });
  return findings;
}

// --- Orchestrator ------------------------------------------------------

export async function runEngagement(engagementId: string): Promise<void> {
  const { data: eng } = await supabaseAdmin.from("engagements").select("*").eq("id", engagementId).single();
  if (!eng) return;
  await supabaseAdmin
    .from("engagements")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", engagementId);
  await writeAudit({ actor_id: eng.owner_id, action: "engagement.start", target_id: engagementId, target_type: "engagement", environment_id: eng.environment_id });

  const target = eng.target_url ?? eng.repo_url;

  const { data: runs } = await supabaseAdmin.from("agent_runs").select("*").eq("engagement_id", engagementId);
  const runByKind = new Map<AgentKind, string>();
  for (const r of runs ?? []) runByKind.set(r.kind as AgentKind, r.id);

  const findings: Finding[] = [];
  for (const kind of eng.agent_kinds as AgentKind[]) {
    const runId = runByKind.get(kind);
    if (!runId) continue;
    try {
      let out: Finding[] = [];
      if (kind === "recon") out = await runRecon(target, engagementId, eng.owner_id, runId);
      else if (kind === "authn") out = await runAuthN(target, engagementId, eng.owner_id, runId);
      else if (kind === "injection") out = await runInjection(target, engagementId, eng.owner_id, runId);
      else if (kind === "supply_chain") out = await runSupplyChain(eng.repo_url, engagementId, eng.owner_id, runId);
      for (const f of out) await recordFinding(engagementId, eng.owner_id, runId, f);
      findings.push(...out);
    } catch (err) {
      await updateRun(runId, { status: "failed", finished_at: new Date().toISOString(), current_step: `error: ${(err as Error).message}` });
    }
  }

  // AI-synthesised executive summary
  let summary = "";
  if (findings.length) {
    const bullet = findings
      .slice(0, 20)
      .map((f) => `- [${f.severity}] ${f.title}: ${f.description}`)
      .join("\n");
    summary = await chat(
      [
        { role: "system", content: "You are a senior application security engineer writing a one-paragraph executive summary of a pen-test." },
        { role: "user", content: `Target: ${target}\n\nFindings:\n${bullet}\n\nWrite 3-5 sentences summarising the overall risk posture and the single most important action to take.` },
      ],
      "google/gemini-2.5-flash",
    );
  } else {
    summary = "No exploitable issues detected in this pass. Consider deploying a self-hosted runner to unlock full container-based testing (source-level scans, authenticated flows, custom fuzzers).";
  }

  const worst = findings.reduce<Severity | null>((acc, f) => {
    const order: Severity[] = ["low", "medium", "high", "critical"];
    if (!acc) return f.severity;
    return order.indexOf(f.severity) > order.indexOf(acc) ? f.severity : acc;
  }, null);
  const verdict = !worst ? "clean" : worst === "critical" || worst === "high" ? "critical" : "issues";

  await supabaseAdmin
    .from("engagements")
    .update({
      status: "complete",
      finished_at: new Date().toISOString(),
      verdict,
      summary: summary.slice(0, 4000) || null,
    })
    .eq("id", engagementId);

  await writeAudit({
    actor_id: eng.owner_id,
    action: "engagement.complete",
    target_id: engagementId,
    target_type: "engagement",
    environment_id: eng.environment_id,
    metadata: { findings: findings.length, verdict },
  });
}
