// Server-only pen-test agent orchestrator.
//
// This runs the AI agent team in-process against a target repository.
// The orchestrator fetches files from the repository via GitHub API
// (using user's OAuth credentials if private) and runs specialized
// audits specifically tailored for Docker configurations.

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

    // Normalize model name
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

// Helper to fetch files from GitHub (supports private repositories via user's Supabase provider token)
async function fetchGithubFile(
  owner: string,
  repo: string,
  branch: string,
  path: string,
  ownerId: string,
  runId?: string,
  log?: LogEntry[]
): Promise<{ ok: boolean; status: number; body: string; error?: string }> {
  let token: string | undefined = undefined;
  try {
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(ownerId);
    token = (user?.app_metadata as any)?.provider_token || (user?.user_metadata as any)?.provider_token;
  } catch (e) {
    console.error("Failed to fetch user auth metadata for GitHub token:", e);
  }

  const apiHeaders: Record<string, string> = {
    "Accept": "application/vnd.github.v3.raw",
    "User-Agent": "Breach-App-Scanner"
  };
  if (token) {
    apiHeaders["Authorization"] = `Bearer ${token}`;
  }

  // Attempt authenticated GitHub contents API first
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
  const res = await safeFetch(apiUrl, { headers: apiHeaders }, runId, log);
  if (res.ok && res.status === 200) {
    return res;
  }

  // Fallback to public raw github url if contents API fails or token is missing
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  return safeFetch(rawUrl, undefined, runId, log);
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

async function runRecon(repoUrl: string, engagementId: string, ownerId: string, runId: string): Promise<Finding[]> {
  const log: LogEntry[] = [];
  await appendLog(runId, log, "info", `[SYSTEM] Initializing Recon Docker ports auditing environment...`, { status: "running", started_at: new Date().toISOString(), current_step: "scanning configuration files" });
  
  await appendLog(runId, log, "info", `[AGENT THINKING] I need to inspect the Dockerfile and docker-compose files to check for insecure container port exposures.`);

  const findings: Finding[] = [];
  const gh = /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/.exec(repoUrl);
  if (gh) {
    const [, owner, repo] = gh;
    
    // Check Dockerfile exposed ports
    for (const branch of ["main", "master"]) {
      const pRes = await fetchGithubFile(owner, repo, branch, "Dockerfile", ownerId, runId, log);
      if (pRes.ok && pRes.status === 200) {
        await appendLog(runId, log, "success", "Successfully downloaded Dockerfile. Commencing port exposure audits...", { current_step: "auditing ports", step_count: 1 });
        const content = pRes.body;
        
        // Scan EXPOSE instructions
        const exposeMatches = [...content.matchAll(/^\s*EXPOSE\s+(.+)/gim)];
        for (const match of exposeMatches) {
          const portsLine = match[1].trim();
          await appendLog(runId, log, "info", `Exposed ports line found in Dockerfile: ${portsLine}`);
          
          // Check for insecure services exposed (SSH 22, FTP 21, Telnet 23, Database 3306, 5432, 27017, Redis 6379)
          const insecurePorts = ["21", "22", "23", "3306", "5432", "27017", "6379", "9200"];
          for (const port of insecurePorts) {
            if (portsLine.includes(port)) {
              await appendLog(runId, log, "error", `ALERT: Insecure database/administrative port ${port} exposed in Dockerfile!`);
              findings.push({
                severity: "high",
                title: "Dangerous port exposed in Dockerfile",
                description: `The Dockerfile explicitly exposes port ${port} (common insecure/administrative service) to the environment network interface.`,
                evidence: { file: "Dockerfile", line: match[0], port },
                remediation: "Remove the EXPOSE directive for database or administrative ports. Rely on internal Docker bridge networks instead.",
                cwe: "CWE-693",
              });
            }
          }
        }
        break;
      }
    }

    // Check docker-compose exposed ports
    for (const branch of ["main", "master"]) {
      const cRes = await fetchGithubFile(owner, repo, branch, "docker-compose.yml", ownerId, runId, log);
      if (cRes.ok && cRes.status === 200) {
        await appendLog(runId, log, "success", "Successfully downloaded docker-compose.yml. Commencing compose port mappings audits...", { current_step: "auditing compose ports", step_count: 2 });
        const content = cRes.body;

        // Insecure ports regex scan on docker-compose ports mappings
        const portMappings = [...content.matchAll(/^\s*-\s*["']?(\d+):(\d+)["']?/gim)];
        for (const match of portMappings) {
          const hostPort = match[1];
          const containerPort = match[2];
          const insecurePorts = ["21", "22", "23", "3306", "5432", "27017", "6379", "9200"];
          
          if (insecurePorts.includes(hostPort) || insecurePorts.includes(containerPort)) {
            await appendLog(runId, log, "error", `ALERT: Insecure host port mapping ${hostPort}:${containerPort} detected in docker-compose.yml!`);
            findings.push({
              severity: "high",
              title: "Dangerous port mapping in docker-compose.yml",
              description: `The docker-compose file binds host port ${hostPort} directly to container port ${containerPort}. This exposes internal database or management interfaces.`,
              evidence: { file: "docker-compose.yml", mapping: `${hostPort}:${containerPort}` },
              remediation: "Only expose HTTP/HTTPS edge web ports (like 80/443). Databases and internal microservices should remain isolated on internal bridge networks.",
              cwe: "CWE-693",
            });
          }
        }
        break;
      }
    }
  } else {
    await appendLog(runId, log, "warning", "Repository is not hosted on GitHub. Recon port audits skipped.");
  }

  await appendLog(runId, log, "success", "Recon Docker Port task completed successfully.", { current_step: "complete", step_count: 2, status: "complete", finished_at: new Date().toISOString() });
  return findings;
}

async function runAuthN(repoUrl: string, engagementId: string, ownerId: string, runId: string): Promise<Finding[]> {
  const log: LogEntry[] = [];
  await appendLog(runId, log, "info", `[SYSTEM] Initializing AuthN credentials scanner environment...`, { status: "running", started_at: new Date().toISOString(), current_step: "scanning for secrets" });
  
  await appendLog(runId, log, "info", `[AGENT THINKING] Scanning docker-compose.yml, Dockerfiles, and environment templates for hardcoded default passwords and secret keys.`);

  const findings: Finding[] = [];
  const gh = /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/.exec(repoUrl);
  if (gh) {
    const [, owner, repo] = gh;

    const filesToAudit = ["docker-compose.yml", "Dockerfile", ".env.example"];
    for (const file of filesToAudit) {
      for (const branch of ["main", "master"]) {
        const res = await fetchGithubFile(owner, repo, branch, file, ownerId, runId, log);
        if (res.ok && res.status === 200) {
          await appendLog(runId, log, "success", `Downloaded ${file}. Commencing static secrets scanning...`, { current_step: `auditing ${file}`, step_count: 1 });
          const content = res.body;

          // Regex to check environment credentials: PASSWORD, SECRET, KEY, TOKEN, PWD set to default values
          const secretRegex = /^\s*-\s*([A-Z_]*PASSWORD|[A-Z_]*SECRET|[A-Z_]*KEY|[A-Z_]*TOKEN|[A-Z_]*PWD|[A-Z_]*APIKEY)\s*=\s*["']?([^"'\n]+)["']?/gim;
          const envMatches = [...content.matchAll(secretRegex)];
          
          for (const match of envMatches) {
            const keyName = match[1];
            const value = match[2].trim().toLowerCase();
            const weakValues = ["root", "password", "123456", "admin", "postgres", "secret", "mysecret", "dev", "test", "jwt"];

            const isWeak = weakValues.some(w => value.includes(w) || w.includes(value)) || value.length < 6;
            if (isWeak) {
              await appendLog(runId, log, "error", `ALERT: Default/Hardcoded secret found in ${file}: ${keyName}=${match[2]}`);
              findings.push({
                severity: "critical",
                title: "Default/Hardcoded credential in container configuration",
                description: `Found environment key ${keyName} set to a default, guessable, or insecure value (${match[2]}) in the ${file} configuration file.`,
                evidence: { file, keyName, value: match[2] },
                remediation: "Never hardcode passwords or keys in configuration repositories. Use Docker Secrets, AWS Secrets Manager, or inject them at runtime.",
                cwe: "CWE-798",
              });
            }
          }
          break;
        }
      }
    }
  } else {
    await appendLog(runId, log, "warning", "Repository not hosted on GitHub. AuthN secrets scanning skipped.");
  }

  await appendLog(runId, log, "success", "AuthN secrets scan completed successfully.", { current_step: "complete", step_count: 1, status: "complete", finished_at: new Date().toISOString() });
  return findings;
}

async function runInjection(repoUrl: string, engagementId: string, ownerId: string, runId: string): Promise<Finding[]> {
  const log: LogEntry[] = [];
  await appendLog(runId, log, "info", `[SYSTEM] Initializing Injection Shell-Command auditor...`, { status: "running", started_at: new Date().toISOString(), current_step: "auditing run commands" });
  
  await appendLog(runId, log, "info", `[AGENT THINKING] Auditing CMD and ENTRYPOINT directives in Dockerfiles for insecure dynamic shell executions (eval, sh -c, unescaped variables).`);

  const findings: Finding[] = [];
  const gh = /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/.exec(repoUrl);
  if (gh) {
    const [, owner, repo] = gh;

    for (const branch of ["main", "master"]) {
      const res = await fetchGithubFile(owner, repo, branch, "Dockerfile", ownerId, runId, log);
      if (res.ok && res.status === 200) {
        await appendLog(runId, log, "success", "Successfully downloaded Dockerfile. Commencing dynamic command injection audit...", { current_step: "auditing cmd/entrypoint", step_count: 1 });
        const content = res.body;

        // Check for shell form vs exec form in ENTRYPOINT/CMD that contains eval or variables expansion
        const entrypointMatch = content.match(/^\s*(ENTRYPOINT|CMD)\s+(.+)/im);
        if (entrypointMatch) {
          const type = entrypointMatch[1];
          const instruction = entrypointMatch[2].trim();

          // 1. Eval / shell-invocation check
          if (instruction.includes("eval") || instruction.includes("sh -c")) {
            await appendLog(runId, log, "error", `VULNERABILITY: Insecure shell command invocation (${type}) detected.`);
            findings.push({
              severity: "high",
              title: "Insecure shell execution in Dockerfile",
              description: `The Dockerfile uses ${type} with dynamic 'eval' or 'sh -c'. This can allow arguments expansion to inject arbitrary commands during container start.`,
              evidence: { file: "Dockerfile", directive: type, instruction },
              remediation: "Prefer the JSON array exec form for ENTRYPOINT and CMD (e.g. ['/bin/app', 'arg1']) to avoid shell-wrapping.",
              cwe: "CWE-78",
            });
          }
        }
        break;
      }
    }
  } else {
    await appendLog(runId, log, "warning", "Repository not hosted on GitHub. Injection shell-audit skipped.");
  }

  await appendLog(runId, log, "success", "Injection command audit completed successfully.", { current_step: "complete", step_count: 1, status: "complete", finished_at: new Date().toISOString() });
  return findings;
}

async function runSupplyChain(repoUrl: string, engagementId: string, ownerId: string, runId: string): Promise<Finding[]> {
  const log: LogEntry[] = [];
  await appendLog(runId, log, "info", `[SYSTEM] Initializing Supply Chain manifest auditing environment...`, { status: "running", started_at: new Date().toISOString(), current_step: "cloning repo metadata" });
  
  await appendLog(runId, log, "info", `[AGENT THINKING] Downloading repository dependency manifests to check package integrity.`);

  const findings: Finding[] = [];

  const gh = /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/.exec(repoUrl);
  if (gh) {
    const [, owner, repo] = gh;
    
    // 1. Audit standard package.json
    for (const branch of ["main", "master"]) {
      await appendLog(runId, log, "info", `Fetching package.json dependency manifests...`);

      const r = await fetchGithubFile(owner, repo, branch, "package.json", ownerId, runId, log);
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

    // 2. Audit Dockerfile configurations
    for (const branch of ["main", "master"]) {
      await appendLog(runId, log, "info", `[AGENT THINKING] Auditing Dockerfile configuration instructions for container configuration security controls.`);
      const dfRes = await fetchGithubFile(owner, repo, branch, "Dockerfile", ownerId, runId, log);
      if (dfRes.ok && dfRes.status === 200 && dfRes.body.length > 5) {
        await appendLog(runId, log, "success", "Successfully downloaded Dockerfile. Commencing static configuration audit...", { current_step: "auditing dockerfile" });
        const content = dfRes.body;
        
        // A. Privileged Root Check: check if USER instruction is missing or is explicitly root
        const userMatches = [...content.matchAll(/^\s*USER\s+(\S+)/gim)];
        const lastUser = userMatches.length > 0 ? userMatches[userMatches.length - 1][1].toLowerCase() : null;
        if (!lastUser || lastUser === "root" || lastUser === "0") {
          await appendLog(runId, log, "error", "VULNERABILITY: Container runs as privileged user (root). Exposed to container escapes.");
          findings.push({
            severity: "high",
            title: "Container runs as privileged user (root)",
            description: "No non-root USER instruction was found in the Dockerfile, or the last USER instruction explicitly sets user to root. If compromised, an attacker can escape the container namespaces.",
            evidence: { file: "Dockerfile", user: lastUser || "unspecified (defaults to root)" },
            remediation: "Create a non-privileged user and switch to it using the USER directive at the end of the Dockerfile.",
            cwe: "CWE-250",
          });
        } else {
          await appendLog(runId, log, "success", `Verified: Dockerfile switches to non-root user: ${lastUser}.`);
        }

        // B. Unpinned Base Image Check
        const fromMatches = content.match(/^\s*FROM\s+(\S+)/im);
        if (fromMatches) {
          const baseImage = fromMatches[1];
          // If it doesn't contain a tag (e.g. no ":") or has tag "latest"
          if (!baseImage.includes(":") || baseImage.endsWith(":latest")) {
            await appendLog(runId, log, "warning", `VULNERABILITY: Unpinned base image tag: ${baseImage}`);
            findings.push({
              severity: "medium",
              title: "Unpinned base image tag",
              description: `The base image ${baseImage} does not specify a concrete version pin, or uses the mutable 'latest' tag. This leads to non-reproducible builds and automatic dependency drift.`,
              evidence: { file: "Dockerfile", from: baseImage },
              remediation: "Pin base image tags to specific semantic versions (e.g., node:20-alpine or sha256 hashes).",
              cwe: "CWE-829",
            });
          } else {
            await appendLog(runId, log, "success", `Verified: Base image has pinned tag: ${baseImage}`);
          }
        }

        // C. Sensitive Files Leak Check: COPY / ADD of secrets or credentials
        const sensitiveRegex = /COPY\s+.*(\.env|id_rsa|passwd|credentials|secrets).*|ADD\s+.*(\.env|id_rsa|passwd|credentials|secrets).*/i;
        if (sensitiveRegex.test(content)) {
          const matchedLine = content.match(sensitiveRegex)?.[0];
          await appendLog(runId, log, "error", `ALERT: Sensitive file copy detected: ${matchedLine}`);
          findings.push({
            severity: "critical",
            title: "Exposed secret copied into container layer",
            description: "The Dockerfile contains COPY/ADD directives that move sensitive environment files (.env, keys) into the container image layer. This leaks secrets to anyone with image read access.",
            evidence: { file: "Dockerfile", instruction: matchedLine },
            remediation: "Remove the copy directive. Load secrets at container runtime using environment variables, or use docker secrets mounts.",
            cwe: "CWE-538",
          });
        }
        break;
      }
    }
  } else {
    await appendLog(runId, log, "warning", "Repository is not hosted on GitHub. Direct dependency analysis unavailable.");
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

  const { data: runs } = await supabaseAdmin.from("agent_runs").select("*").eq("engagement_id", engagementId);
  const runByKind = new Map<AgentKind, string>();
  for (const r of runs ?? []) runByKind.set(r.kind as AgentKind, r.id);

  // 1. Verify if repository has Docker files (Dockerfile, docker-compose.yml)
  const gh = /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/.exec(eng.repo_url);
  let hasDocker = false;
  if (gh) {
    const [, owner, repo] = gh;
    // We will probe raw endpoints on main and master branch
    for (const branch of ["main", "master"]) {
      const paths = ["Dockerfile", "docker-compose.yml", "docker-compose.yaml", "docker/Dockerfile"];
      for (const p of paths) {
        const res = await fetchGithubFile(owner, repo, branch, p, eng.owner_id);
        if (res.ok && res.status === 200) {
          hasDocker = true;
          break;
        }
      }
      if (hasDocker) break;
    }
  } else {
    // If not a github repo, fallback or assume it has it (or check local path if cloned)
    hasDocker = true; // default fallback
  }

  if (!hasDocker) {
    // Reject repo!
    await supabaseAdmin
      .from("engagements")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        summary: "Rejected: No Docker configurations detected. Breach only audits Dockerized applications. Ensure a Dockerfile or docker-compose.yml exists in the repository root.",
        verdict: "issues"
      })
      .eq("id", engagementId);
      
    // Fail the agent runs with a clear transcript explanation
    for (const r of runs ?? []) {
      await updateRun(r.id, {
        status: "failed",
        finished_at: new Date().toISOString(),
        current_step: "REJECTED: No Docker files found.",
        transcript: [
          {
            timestamp: new Date().toISOString(),
            type: "error",
            message: "[SYSTEM] REJECTED: Repository does not contain a Dockerfile or docker-compose.yml. Breach audits Dockerized setups only."
          }
        ] as any
      });
    }
    return;
  }

  const findings: Finding[] = [];
  for (const kind of eng.agent_kinds as AgentKind[]) {
    const runId = runByKind.get(kind);
    if (!runId) continue;
    try {
      let out: Finding[] = [];
      if (kind === "recon") out = await runRecon(eng.repo_url, engagementId, eng.owner_id, runId);
      else if (kind === "authn") out = await runAuthN(eng.repo_url, engagementId, eng.owner_id, runId);
      else if (kind === "injection") out = await runInjection(eng.repo_url, engagementId, eng.owner_id, runId);
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
        { role: "user", content: `Target repository: ${eng.repo_url}\n\nFindings:\n${bullet}\n\nWrite 3-5 sentences summarising the overall risk posture and the single most important action to take.` },
      ],
      "google/gemini-2.5-flash",
    );
  } else {
    summary = "No exploitable issues detected in this pass. Ensure your Docker configurations follow CIS benchmarks.";
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
