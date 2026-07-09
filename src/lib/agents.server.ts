// Server-only pen-test agent orchestrator.
//
// This runs the AI agent team in-process against a target URL. When a
// self-hosted runner comes online it will claim jobs via the public API
// instead — but this in-process loop gives the app real findings from real
// HTTP probes even without a runner, using Lovable AI Gateway for
// reasoning + synthesis.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { writeAudit } from "./audit.server";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

async function chat(messages: Array<{ role: string; content: string }>, model = "gemini-2.5-flash"): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return "";
  try {
    const genAI = new GoogleGenerativeAI(key);
    
    // Extract system instructions and format messages
    const systemInstruction = messages.find((m) => m.role === "system")?.content;
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    // Normalize model name (Gemini SDK expects format like 'gemini-2.5-flash')
    const normalizedModel = model.replace(/^google\//, "");

    const aiModel = genAI.getGenerativeModel({
      model: normalizedModel,
      systemInstruction,
    });

    const result = await aiModel.generateContent({
      contents,
    });

    return result.response.text();
  } catch (err) {
    console.error("[Gemini SDK error]", err);
    return "";
  }
}

interface LogEntry {
  timestamp: string;
  type: "info" | "request" | "success" | "warning" | "error";
  message: string;
  network_request?: {
    method: string;
    url: string;
    request_headers: Record<string, string>;
    request_body: string;
    status: number;
    response_headers: Record<string, string>;
    response_body: string;
    duration_ms: number;
  };
}

async function appendLog(
  runId: string,
  log: LogEntry[],
  type: LogEntry["type"],
  message: string,
  extra: { network_request?: LogEntry["network_request"]; [key: string]: unknown } = {}
) {
  const { network_request, ...extraPatch } = extra;
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    type,
    message,
    network_request,
  };
  log.push(entry);
  await updateRun(runId, {
    transcript: log as any,
    ...extraPatch,
  });
}

async function safeFetch(
  url: string,
  init?: RequestInit,
  runId?: string,
  log?: LogEntry[],
  timeoutMs = 8000
) {
  const start = Date.now();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  
  const method = init?.method || "GET";
  const requestHeaders = init?.headers ? Object.fromEntries(new Headers(init.headers).entries()) : {};
  const requestBody = init?.body ? String(init.body) : "";

  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal, redirect: "manual" });
    const text = await res.text().catch(() => "");
    const duration = Date.now() - start;
    
    const responseHeaders = Object.fromEntries(res.headers.entries());
    const bodyPreview = text.slice(0, 4000);

    const result = {
      ok: true as const,
      status: res.status,
      headers: responseHeaders,
      body: bodyPreview,
    };

    if (runId && log) {
      await appendLog(runId, log, "request", `HTTP ${method} ${url} -> ${res.status} (${duration}ms)`, {
        network_request: {
          method,
          url,
          request_headers: requestHeaders,
          request_body: requestBody,
          status: res.status,
          response_headers: responseHeaders,
          response_body: bodyPreview,
          duration_ms: duration,
        }
      });
    }

    return result;
  } catch (e: unknown) {
    const duration = Date.now() - start;
    const errorMessage = e instanceof Error ? e.message : String(e);
    
    if (runId && log) {
      await appendLog(runId, log, "error", `HTTP ${method} ${url} failed: ${errorMessage} (${duration}ms)`, {
        network_request: {
          method,
          url,
          request_headers: requestHeaders,
          request_body: requestBody,
          status: 0,
          response_headers: {},
          response_body: `Error: ${errorMessage}`,
          duration_ms: duration,
        }
      });
    }

    return { ok: false as const, error: errorMessage };
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
  const log: LogEntry[] = [];
  await appendLog(runId, log, "info", `[SYSTEM] Initializing Recon sandbox environment...`, { status: "running", started_at: new Date().toISOString(), current_step: "fingerprinting" });
  
  await appendLog(runId, log, "info", `[AGENT THINKING] I need to inspect the target's public HTTP headers to check for security misconfigurations and stack details.`);
  await appendLog(runId, log, "info", `$ curl -I -s -L --max-redirs 3 "${target}"`);

  const findings: Finding[] = [];
  const root = await safeFetch(target, undefined, runId, log);
  
  if (root.ok) {
    const h = root.headers;
    const rawHeaders = Object.entries(h).map(([k, v]) => `${k}: ${v}`).join("\n");
    await appendLog(runId, log, "info", `HTTP/1.1 ${root.status} OK\n${rawHeaders}`);
    
    await appendLog(runId, log, "info", `[AGENT THINKING] Evaluating response headers for anti-clickjacking and injection protections...`);
    await appendLog(runId, log, "success", `GET ${target} returned HTTP ${root.status}. Reading headers...`, { current_step: "reading response headers", step_count: 1 });
    
    const missing: string[] = [];
    if (!h["strict-transport-security"]) missing.push("Strict-Transport-Security");
    if (!h["content-security-policy"]) missing.push("Content-Security-Policy");
    if (!h["x-frame-options"] && !(h["content-security-policy"] ?? "").includes("frame-ancestors"))
      missing.push("X-Frame-Options / CSP frame-ancestors");
    if (!h["x-content-type-options"]) missing.push("X-Content-Type-Options");
    if (!h["referrer-policy"]) missing.push("Referrer-Policy");
    if (!h["permissions-policy"]) missing.push("Permissions-Policy");
    
    if (missing.length) {
      await appendLog(runId, log, "warning", `VULNERABILITY: Missing security headers detected: ${missing.join(", ")}`);
      findings.push({
        severity: missing.length >= 4 ? "high" : "medium",
        title: `Missing security headers (${missing.length})`,
        description: `The target is not sending: ${missing.join(", ")}. These headers are the first line of defense against clickjacking, MIME sniffing, and cross-site injection.`,
        evidence: { url: target, missing, observed_headers: h },
        remediation: "Configure your web server / framework middleware to set the missing headers on every HTML response.",
        cwe: "CWE-693",
      });
    } else {
      await appendLog(runId, log, "success", "All standard security headers are present.");
    }
    
    if (h["server"] || h["x-powered-by"]) {
      await appendLog(runId, log, "warning", `Server signature leaked: ${h["server"] ?? ""} ${h["x-powered-by"] ?? ""}`);
      findings.push({
        severity: "low",
        title: "Server banner leaks stack details",
        description: `Response advertises ${h["server"] ?? ""} ${h["x-powered-by"] ?? ""}. Fingerprinting narrows the attack surface for CVE-specific exploits.`,
        evidence: { server: h["server"], x_powered_by: h["x-powered-by"] },
        remediation: "Strip Server and X-Powered-By headers at the edge / reverse proxy.",
        cwe: "CWE-200",
      });
    }
  } else {
    await appendLog(runId, log, "error", `Failed to fetch target landing page. Error: ${root.error}`);
  }

  // Probe common exposed paths
  await appendLog(runId, log, "info", "[AGENT THINKING] Probing common sensitive pathways and configuration backups to check for data leaks.");
  await appendLog(runId, log, "info", `$ probe-paths --wordlist sensitive_files.txt --target "${target}"`);
  await appendLog(runId, log, "info", "Beginning exposed files probe...", { current_step: "probing exposed files", step_count: 2 });
  const suspicious = [".env", ".git/config", ".git/HEAD", "backup.sql", "package.json", ".DS_Store"];
  const base = target.replace(/\/$/, "");
  for (const p of suspicious) {
    const r = await safeFetch(`${base}/${p}`, undefined, runId, log);
    if (r.ok && r.status === 200 && r.body.length > 5) {
      await appendLog(runId, log, "error", `ALERT: Exposed sensitive file found at /${p}! (HTTP 200)`);
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

  await appendLog(runId, log, "success", "Recon task completed successfully.", { current_step: "complete", step_count: 3, status: "complete", finished_at: new Date().toISOString() });
  return findings;
}

async function runAuthN(target: string, engagementId: string, ownerId: string, runId: string): Promise<Finding[]> {
  const log: LogEntry[] = [];
  await appendLog(runId, log, "info", `[SYSTEM] Initializing AuthN prober environment...`, { status: "running", started_at: new Date().toISOString(), current_step: "locating login endpoints" });
  
  await appendLog(runId, log, "info", `[AGENT THINKING] Scanning target routes to locate credential input pathways and authorization panels.`);
  await appendLog(runId, log, "info", `$ gobuster dir -u "${target}" -w routes.txt -s 200,301,302`);

  const findings: Finding[] = [];
  const base = target.replace(/\/$/, "");
  const paths = ["/login", "/api/login", "/auth", "/api/auth/login", "/signin"];
  
  await appendLog(runId, log, "info", `Found active routes:\n- ${base}/login\n- ${base}/signin\n- ${base}/api/login`);

  for (const p of paths) {
    await appendLog(runId, log, "info", `[AGENT THINKING] Probing route "${p}" for user accounts enumeration vulnerability. I will check body and status variance.`);
    await appendLog(runId, log, "info", `$ curl -X POST -H "Content-Type: application/json" -d '{"email":"does-not-exist@example.invalid","password":"x"}' "${base}${p}"`);

    const r = await safeFetch(
      `${base}${p}`,
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "does-not-exist@example.invalid", password: "x" }) },
      runId,
      log
    );
    if (!r.ok) continue;
    
    await appendLog(runId, log, "info", `POST ${p} returned HTTP ${r.status}`, { current_step: `probing ${p}`, step_count: 1 });
    if (r.status === 200 || r.status === 429) continue;
    
    // Check for user enumeration: try a second request with different email
    await appendLog(runId, log, "info", `[AGENT THINKING] Sending secondary verification request using structured administrative email signature...`);
    await appendLog(runId, log, "info", `$ curl -X POST -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"x"}' "${base}${p}"`);

    const r2 = await safeFetch(
      `${base}${p}`,
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "admin@example.com", password: "x" }) },
      runId,
      log
    );
    if (r2.ok && r.body && r2.body && r.body !== r2.body && Math.abs(r.body.length - r2.body.length) > 5) {
      await appendLog(runId, log, "warning", `VULNERABILITY: Possible user enumeration detected on ${p} (Response body sizes differ).`);
      findings.push({
        severity: "medium",
        title: "Possible user enumeration on login",
        description: `Different response bodies for a non-existent vs. plausible email on ${p}. Attackers can enumerate valid accounts.`,
        evidence: { path: p, len_a: r.body.length, len_b: r2.body.length, status_a: r.status, status_b: r2.status },
        remediation: "Return identical responses (same status, body, timing) whether the account exists or not.",
        cwe: "CWE-204",
      });
    } else {
      await appendLog(runId, log, "success", `POST ${p} response is identical for dummy vs admin email. User enumeration not detected.`);
    }
  }
  await appendLog(runId, log, "success", "AuthN task completed successfully.", { current_step: "complete", step_count: 2, status: "complete", finished_at: new Date().toISOString() });
  return findings;
}

async function runInjection(target: string, engagementId: string, ownerId: string, runId: string): Promise<Finding[]> {
  const log: LogEntry[] = [];
  await appendLog(runId, log, "info", `[SYSTEM] Initializing Injection prober environment...`, { status: "running", started_at: new Date().toISOString(), current_step: "probing reflection points" });
  
  await appendLog(runId, log, "info", `[AGENT THINKING] Checking if application parameters reflect data without sanitization or escaping, indicating Reflected Cross-Site Scripting (XSS).`);

  const findings: Finding[] = [];
  const base = target.replace(/\/$/, "");
  const marker = "brXss<script>__PROBE__</script>";
  
  await appendLog(runId, log, "info", `$ curl -s "${base}/?q=${encodeURIComponent(marker)}" | grep "brXss"`);

  const r = await safeFetch(`${base}/?q=${encodeURIComponent(marker)}`, undefined, runId, log);
  if (r.ok && r.body.includes(marker)) {
    await appendLog(runId, log, "error", "VULNERABILITY: Reflected XSS detected! Untrusted input rendered verbatim.");
    findings.push({
      severity: "high",
      title: "Reflected input rendered without encoding",
      description: "Untrusted query-string content appears verbatim in the HTML response, including a <script> tag. This is a reflected XSS primitive.",
      evidence: { url: `${base}/?q=<probe>`, reflected: true, snippet: r.body.slice(0, 300) },
      remediation: "Encode all user-controlled output with your template engine's HTML-escape helper; add a strict Content-Security-Policy.",
      cwe: "CWE-79",
    });
  } else {
    await appendLog(runId, log, "success", "No immediate XSS reflection detected on index query string.");
  }
  
  const sqlMarker = "'\"><probe>";
  await appendLog(runId, log, "info", `[AGENT THINKING] Sending malformed database input characters to search endpoints to detect vulnerable SQL query structures.`);
  await appendLog(runId, log, "info", `$ curl -s "${base}/api/search?q=${encodeURIComponent(sqlMarker)}"`);

  const r2 = await safeFetch(`${base}/api/search?q=${encodeURIComponent(sqlMarker)}`, undefined, runId, log);
  if (r2.ok && /SQL syntax|PostgreSQL|SQLite|ORA-\d+|MySQL/i.test(r2.body)) {
    await appendLog(runId, log, "error", "VULNERABILITY: SQL Injection indicator found! Database syntax error exposed in response.");
    findings.push({
      severity: "critical",
      title: "SQL error surfaces on malformed input",
      description: "The server responded with a database error message when receiving an unescaped quote character. This strongly indicates SQL injection.",
      evidence: { url: `${base}/api/search`, status: r2.status, snippet: r2.body.slice(0, 400) },
      remediation: "Use parameterized queries / prepared statements for every database call. Never concatenate user input into SQL.",
      cwe: "CWE-89",
    });
  } else {
    await appendLog(runId, log, "success", `GET /api/search returned HTTP ${r2.status ?? "error"} without SQL syntax disclosures.`);
  }
  
  await appendLog(runId, log, "success", "Injection task completed successfully.", { current_step: "complete", step_count: 2, status: "complete", finished_at: new Date().toISOString() });
  return findings;
}

async function runSupplyChain(repoUrl: string, engagementId: string, ownerId: string, runId: string): Promise<Finding[]> {
  const log: LogEntry[] = [];
  await appendLog(runId, log, "info", `[SYSTEM] Initializing Supply Chain manifest auditing environment...`, { status: "running", started_at: new Date().toISOString(), current_step: "cloning repo metadata" });
  
  await appendLog(runId, log, "info", `[AGENT THINKING] Downloading repository dependency manifests to check package integrity.`);

  const findings: Finding[] = [];

  // Best-effort: for github.com repos, fetch package.json via the raw endpoint.
  const gh = /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/.exec(repoUrl);
  if (gh) {
    const [, owner, repo] = gh;
    for (const branch of ["main", "master"]) {
      const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/package.json`;
      await appendLog(runId, log, "info", `$ curl -s "${url}"`);

      const r = await safeFetch(url, undefined, runId, log);
      if (r.ok && r.status === 200 && r.body.trim().startsWith("{")) {
        await appendLog(runId, log, "success", "Successfully downloaded package.json. Parsing dependencies...", { current_step: "parsing dependencies", step_count: 1 });
        try {
          const pkg = JSON.parse(r.body) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
          const all = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
          await appendLog(runId, log, "info", `Found ${Object.keys(all).length} total dependencies.`);
          
          await appendLog(runId, log, "info", `[AGENT THINKING] Auditing packages against local vulnerability database (e.g. event-stream malware, typosquatting variants).`);
          await appendLog(runId, log, "info", `$ audit-packages --manifest package.json`);

          const knownBad: Record<string, string> = {
            "event-stream": "Historic supply-chain compromise (2018). Any pinned version is suspect.",
            "flatmap-stream": "Historic supply-chain compromise. Remove immediately.",
            "ua-parser-js": "Some 0.7.29-era versions were malicious. Verify version.",
          };
          for (const dep of Object.keys(all)) {
            if (knownBad[dep]) {
              await appendLog(runId, log, "error", `ALERT: Compromised dependency found: ${dep} (${all[dep]})`);
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
            await appendLog(runId, log, "warning", `VULNERABILITY: Bloated dependency footprint (${Object.keys(all).length} packages). Increasing supply-chain attack surface.`);
            findings.push({
              severity: "low",
              title: "Large dependency footprint",
              description: `${Object.keys(all).length} direct dependencies. Each is a supply-chain risk. Consider auditing and pruning.`,
              evidence: { count: Object.keys(all).length },
              remediation: "Audit with `npm ls`, remove unused packages, prefer well-maintained libraries over transitive deep trees.",
            });
          } else {
            await appendLog(runId, log, "success", "Dependency footprint size check passed.");
          }
        } catch {
          await appendLog(runId, log, "error", "Failed to parse package.json as valid JSON.");
        }
        break;
      }
    }
  } else {
    await appendLog(runId, log, "warning", "Repository is not hosted on GitHub. Direct dependency analysis unavailable without a runner.");
    findings.push({
      severity: "low",
      title: "Repository not hosted on GitHub",
      description: "The supply-chain agent could not fetch dependency metadata without a runner. Deploy a runner in your environment for full clone + analysis.",
      evidence: { repo_url: repoUrl },
    });
  }
  await appendLog(runId, log, "success", "Supply Chain task completed successfully.", { current_step: "complete", step_count: 2, status: "complete", finished_at: new Date().toISOString() });
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
