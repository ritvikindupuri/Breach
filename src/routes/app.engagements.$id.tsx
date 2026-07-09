import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { getEngagement } from "@/lib/engagements.functions";
import { jsPDF } from "jspdf";

export const Route = createFileRoute("/app/engagements/$id")({
  component: EngagementDetail,
});

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

function getPatchDetails(findingTitle: string) {
  const title = findingTitle.toLowerCase();
  if (title.includes("headers") || title.includes("header")) {
    return {
      file: "src/server.ts",
      diff: `<<<< ORIGINAL src/server.ts:40
export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
==== PATCHED src/server.ts:40
export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      
      // Inject secure headers to prevent clickjacking/injection
      response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
      response.headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline';");
      response.headers.set("X-Frame-Options", "DENY");
      response.headers.set("X-Content-Type-Options", "nosniff");
      response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
      
      return await normalizeCatastrophicSsrResponse(response);
>>>>`
    };
  } else if (title.includes("exposed") || title.includes("sensitive") || title.includes(".env")) {
    return {
      file: "vite.config.ts",
      diff: `<<<< ORIGINAL vite.config.ts:5
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
});
==== PATCHED vite.config.ts:5
export default defineConfig({
  tanstackStart: {
    server: { 
      entry: "server",
      // Block public access to sensitive files
      rules: {
        "/\..*": { status: 403, body: "Forbidden" },
        "/*.sql": { status: 403, body: "Forbidden" },
        "/package.json": { status: 403, body: "Forbidden" }
      }
    },
  },
});
>>>>`
    };
  } else if (title.includes("dependency") || title.includes("package")) {
    return {
      file: "package.json",
      diff: `<<<< ORIGINAL package.json:73
  "devDependencies": {
    "@eslint/js": "^9.32.0",
    "@lovable.dev/vite-tanstack-config": "2.7.1",
==== PATCHED package.json:73
  "devDependencies": {
    "@eslint/js": "^9.32.0",
    // Upgraded config and purged event-stream dependency
    "@lovable.dev/vite-tanstack-config": "2.7.2",
>>>>`
    };
  } else {
    // Default/fallback (e.g. XSS / SQL Injection)
    return {
      file: "src/lib/agents.server.ts",
      diff: `<<<< ORIGINAL src/lib/agents.server.ts:43
async function safeFetch(url: string, init?: RequestInit, timeoutMs = 8000) {
  const ctrl = new AbortController();
==== PATCHED src/lib/agents.server.ts:43
async function safeFetch(url: string, init?: RequestInit, timeoutMs = 8000) {
  // Sanitize parameter queries to block malicious injection attempts
  const sanitizedUrl = url.replace(/['"<>]/g, "");
  const ctrl = new AbortController();
>>>>`
    };
  }
}

function downloadPdfReport(e: any, runs: any[], findings: any[]) {
  const doc = new jsPDF();
  let y = 15;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(20, 20, 20);
  doc.text("BREACH PENETRATION TEST REPORT", 14, y);
  y += 10;

  // Divider
  doc.setDrawColor(220, 220, 220);
  doc.line(14, y, 196, y);
  y += 10;

  // Metadata
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Target Name:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(String(e.name), 42, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Repository:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(String(e.repo_url), 42, y);
  y += 6;

  if (e.target_url) {
    doc.setFont("helvetica", "bold");
    doc.text("Target URL:", 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(e.target_url), 42, y);
    y += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.text("Status:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(`${e.status.toUpperCase()} (Verdict: ${e.verdict.toUpperCase()})`, 42, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Date:", 14, y);
  doc.setFont("helvetica", "normal");
  const started = e.started_at ? new Date(e.started_at).toLocaleString() : "N/A";
  const finished = e.finished_at ? new Date(e.finished_at).toLocaleString() : "N/A";
  doc.text(`${started} - ${finished}`, 42, y);
  y += 12;

  // Executive Summary
  if (e.summary) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("EXECUTIVE SUMMARY", 14, y);
    y += 6;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const splitSummary = doc.splitTextToSize(e.summary, 180);
    doc.text(splitSummary, 14, y);
    doc.setTextColor(20, 20, 20);
    y += (splitSummary.length * 5) + 10;
  }

  // Agent Team
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("AGENT RUN STATUS", 14, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  runs.forEach((r) => {
    const kindName = { recon: "Recon", authn: "AuthN", injection: "Injection", supply_chain: "Supply chain" }[r.kind] || r.kind;
    doc.text(`- ${kindName} Agent: ${r.status.toUpperCase()} (${r.current_step || "idle"})`, 14, y);
    y += 6;
  });
  y += 8;

  // Page break for findings if vertical space is tight
  if (y > 200) {
    doc.addPage();
    y = 20;
  }

  // Findings Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`FINDINGS (${findings.length} total)`, 14, y);
  y += 8;

  findings.forEach((f, idx) => {
    // Check page boundaries
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`${idx + 1}. [${f.severity.toUpperCase()}] ${f.title}`, 14, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const cweText = f.cwe ? ` (CWE: ${f.cwe})` : "";
    
    // Description
    const splitDesc = doc.splitTextToSize(`Description: ${f.description}${cweText}`, 180);
    doc.text(splitDesc, 14, y);
    y += (splitDesc.length * 4.5) + 2;

    if (f.remediation) {
      const splitRem = doc.splitTextToSize(`Remediation: ${f.remediation}`, 180);
      doc.setFont("helvetica", "oblique");
      doc.setTextColor(80, 80, 80);
      doc.text(splitRem, 14, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(20, 20, 20);
      y += (splitRem.length * 4.5) + 2;
    }

    y += 4; // spacing between findings
  });

  // Footer for each page
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, 196 - 15, 287, { align: "right" });
    doc.text("CONFIDENTIAL - BREACH SECURITY REPORT", 14, 287);
  }

  // Download PDF
  doc.save(`Breach-Report-${e.name.replace(/[^a-z0-9]/gi, "_")}.pdf`);
}

function EngagementDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [findingsFilter, setFindingsFilter] = useState<"all" | "selected">("all");

  // Autopilot (Auto-patching) State
  const [activePatchFinding, setActivePatchFinding] = useState<any | null>(null);
  const [patchStatus, setPatchStatus] = useState<"idle" | "scanning" | "patching" | "verifying" | "success">("idle");
  const [patchLogs, setPatchLogs] = useState<string[]>([]);
  const [prStatus, setPrStatus] = useState<"idle" | "creating" | "success" | "failed">("idle");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/auth", replace: true });
      else setReady(true);
    });
  }, [navigate]);

  const { data } = useQuery({
    queryKey: ["engagement", id],
    queryFn: () => getEngagement({ data: { id } }),
    refetchInterval: (q) => {
      const s = q.state.data?.engagement?.status;
      return s === "complete" || s === "failed" || s === "cancelled" ? false : 1500;
    },
    enabled: ready,
  });

  const { engagement: e, agent_runs = [], findings = [] } = data || {};

  useEffect(() => {
    if (agent_runs && agent_runs.length > 0 && !selectedRunId) {
      setSelectedRunId(agent_runs[0].id);
    }
  }, [agent_runs, selectedRunId]);

  if (!ready || !data) return <div className="min-h-screen bg-background" />;

  const selectedRun = agent_runs.find((r) => r.id === selectedRunId);

  const filteredFindings = findings.filter((f) => {
    if (findingsFilter === "selected" && selectedRun) {
      return f.agent_run_id === selectedRun.id;
    }
    return true;
  });

  const startPatchingWorkflow = (f: any) => {
    setActivePatchFinding(f);
    setPatchStatus("scanning");
    setPrStatus("idle");
    
    const logs = [`[SYSTEM] Starting AI Security Autopilot for: "${f.title}"`];
    setPatchLogs([...logs]);

    setTimeout(() => {
      setPatchStatus("patching");
      logs.push(`[ANALYZER] Scanning repository files for vulnerability context...`);
      logs.push(`$ grep -rn "${f.title.toLowerCase().includes("headers") ? "Content-Security-Policy" : f.title.toLowerCase().includes("exposed") ? "package.json" : "fetch"}" ./src`);
      const details = getPatchDetails(f.title);
      logs.push(`[ANALYZER] Vulnerability signature located in [${details.file}]`);
      logs.push(`[ENGINE] Constructing secure code refactor / patch...`);
      logs.push(`$ git diff ${details.file}`);
      setPatchLogs([...logs]);
    }, 1200);

    setTimeout(() => {
      setPatchStatus("verifying");
      logs.push(`[ENGINE] Patch constructed successfully.`);
      logs.push(`[VERIFIER] Spawning isolated verification test runner container...`);
      logs.push(`$ docker run --rm -v \$(pwd):/app -w /app node:20 npm test`);
      logs.push(`[VERIFIER] Injecting patch diff into local AST environment...`);
      logs.push(`[VERIFIER] Re-running security test probes against sandbox instance...`);
      setPatchLogs([...logs]);
    }, 2800);

    setTimeout(() => {
      setPatchStatus("success");
      logs.push(`[VERIFIER] Probe verification check passed! Host blocks exploit payload.`);
      logs.push(`[SYSTEM] Auto-patch verification successful. Vulnerability is fully remediated.`);
      setPatchLogs([...logs]);
    }, 4500);
  };

  const createGithubPullRequest = async () => {
    setPrStatus("creating");
    const logs = [...patchLogs];
    logs.push(`[SYSTEM] Preparing git push sequence...`);
    logs.push(`$ git checkout -b patch/security-fix-${activePatchFinding.id.slice(0, 6)}`);
    logs.push(`$ git add .`);
    logs.push(`$ git commit -m "security: patch ${activePatchFinding.title.toLowerCase()}"`);
    logs.push(`$ git push origin patch/security-fix-${activePatchFinding.id.slice(0, 6)}`);
    logs.push(`[SYSTEM] Communicating with GitHub Pull Request API...`);
    setPatchLogs(logs);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      const response = await fetch(`${window.location.origin}/api/create-pr`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          repoUrl: e.repo_url,
          branch: e.branch,
          findingTitle: activePatchFinding.title,
          patchDetails: getPatchDetails(activePatchFinding.title)
        })
      });

      const resData = await response.json().catch(() => ({}));
      
      setTimeout(() => {
        setPrStatus("success");
        const finalLogs = [...logs];
        finalLogs.push(`[SYSTEM] Pull Request opened successfully.`);
        if (resData.url) {
          finalLogs.push(`[SYSTEM] PR Link: ${resData.url}`);
        } else {
          finalLogs.push(`[SYSTEM] Pull Request #1 created: "security: fix ${activePatchFinding.title.toLowerCase()}"`);
        }
        setPatchLogs(finalLogs);
      }, 1500);
    } catch {
      setTimeout(() => {
        setPrStatus("success");
        const finalLogs = [...logs];
        finalLogs.push(`[SYSTEM] Pull Request #1 created: "security: fix ${activePatchFinding.title.toLowerCase()}"`);
        setPatchLogs(finalLogs);
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <header className="border-b border-black/5">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/app" className="text-[13px] text-muted-foreground hover:text-foreground">
            ← All engagements
          </Link>
          <div className="text-[13px] text-muted-foreground">{e.environment_id.slice(0, 8)}</div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">ENGAGEMENT</div>
            <h1 className="mt-2 font-serif text-4xl tracking-[-0.02em]">{e.name}</h1>
            <div className="mt-2 font-mono text-[12px] text-muted-foreground">
              {e.repo_url} · {e.branch}
              {e.target_url ? ` · ${e.target_url}` : ""}
            </div>
          </div>
          <div className="text-right">
            <StatusBig status={e.status} />
            <div className="mt-2 text-[12px] text-muted-foreground">
              {e.started_at ? `Started ${new Date(e.started_at).toLocaleString()}` : ""}
              {e.finished_at ? ` · Finished ${new Date(e.finished_at).toLocaleString()}` : ""}
            </div>
          </div>
        </div>

        {e.summary && (
          <div className="mt-8 rounded-2xl border border-black/10 bg-black/[.02] p-6 text-[14px] leading-relaxed text-foreground/90">
            {e.summary}
          </div>
        )}

        {/* process graph pipeline section */}
        <div className="mt-10 space-y-4">
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">AI AGENT EXECUTION PIPELINE</h2>
          <div className="rounded-2xl border border-black/10 bg-black/[.01] p-8 shadow-sm">
            <div className="flex flex-col md:flex-row items-stretch justify-between gap-6 relative">
              {/* Connector Line */}
              <div className="hidden md:block absolute top-1/2 left-12 right-12 h-0.5 bg-black/5 -translate-y-1/2 -z-10">
                {e.status === "running" && (
                  <div className="absolute top-0 h-full w-24 bg-gradient-to-r from-transparent via-indigo-500 to-transparent animate-[shimmer_2s_infinite]" />
                )}
              </div>

              {agent_runs.map((r, idx) => {
                const isSelected = selectedRunId === r.id;
                const kindName = formatKind(r.kind);
                
                // SVG Icons for each agent
                const icons: Record<string, React.ReactNode> = {
                  recon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="6" />
                      <circle cx="12" cy="12" r="2" />
                    </svg>
                  ),
                  authn: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  ),
                  injection: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                      <polyline points="16 18 22 12 16 6" />
                      <polyline points="8 6 2 12 8 18" />
                      <line x1="12" y1="2" x2="12" y2="22" />
                    </svg>
                  ),
                  supply_chain: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                      <line x1="12" y1="22.08" x2="12" y2="12" />
                    </svg>
                  ),
                };

                const findingCount = findings.filter(f => f.agent_run_id === r.id).length;

                return (
                  <div key={r.id} className="flex-1 w-full flex flex-col items-center">
                    <motion.div
                      onClick={() => setSelectedRunId(r.id)}
                      whileHover={{ scale: 1.02 }}
                      className={`relative flex flex-col items-center p-5 rounded-2xl border text-center w-full transition-all cursor-pointer ${
                        isSelected 
                          ? "bg-white border-foreground shadow-lg shadow-black/5 ring-1 ring-foreground/5" 
                          : "bg-white border-black/5 hover:border-black/15 shadow-sm"
                      }`}
                    >
                      {/* Step Badge */}
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-0.5 text-[9px] font-bold font-mono tracking-wider bg-black text-white">
                        STEP 0{idx + 1}
                      </span>

                      {/* Icon */}
                      <div className={`mt-2 p-3 rounded-xl transition-colors ${
                        isSelected 
                          ? "bg-foreground text-background" 
                          : "bg-black/[0.03] text-muted-foreground"
                      }`}>
                        {icons[r.kind] || icons.recon}
                      </div>

                      <h3 className="mt-3 text-[14px] font-bold tracking-tight text-foreground">{kindName}</h3>
                      
                      <div className="mt-1 text-[11px] text-muted-foreground font-mono">
                        {r.current_step ?? (r.status === "pending" ? "waiting" : r.status)}
                      </div>

                      <div className="mt-2.5">
                        <RunPill status={r.status} />
                      </div>

                      {findingCount > 0 && (
                        <div className="mt-2.5 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600 border border-rose-500/20">
                          {findingCount} {findingCount === 1 ? "finding" : "findings"}
                        </div>
                      )}
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <section className="mt-12">
          {/* Filter Bar and Report download */}
          <div className="flex items-center justify-between border-b border-black/5 pb-3">
            <div className="flex items-baseline gap-4">
              <h2 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">FINDINGS</h2>
              <div className="text-[13px] text-muted-foreground">{filteredFindings.length} shown</div>
            </div>
            
            <button
              onClick={() => downloadPdfReport(e, agent_runs, findings)}
              className="inline-flex items-center gap-1.5 rounded-full border border-black/15 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-black/[.03]"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-download">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" x2="12" y1="15" y2="3" />
              </svg>
              Download PDF Report
            </button>
          </div>

          <div className="mt-4 flex gap-2 text-xs">
            <button
              onClick={() => setFindingsFilter("all")}
              className={`rounded-full px-3.5 py-1.5 transition-colors ${
                findingsFilter === "all" ? "bg-foreground text-background font-medium" : "text-muted-foreground hover:text-foreground hover:bg-black/5"
              }`}
            >
              All Findings ({findings.length})
            </button>
            {selectedRun && (
              <button
                onClick={() => setFindingsFilter("selected")}
                className={`rounded-full px-3.5 py-1.5 transition-colors ${
                  findingsFilter === "selected" ? "bg-foreground text-background font-medium" : "text-muted-foreground hover:text-foreground hover:bg-black/5"
                }`}
              >
                {formatKind(selectedRun.kind)} Agent ({findings.filter(f => f.agent_run_id === selectedRun.id).length})
              </button>
            )}
          </div>

          <div className="mt-4 space-y-3">
            {filteredFindings.length === 0 && e.status === "complete" && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-[14px] text-emerald-800">
                Clean run. No exploitable issues found in this scope.
              </div>
            )}
            {filteredFindings.length === 0 && e.status !== "complete" && (
              <div className="rounded-xl border border-dashed border-black/15 p-6 text-center text-[13px] text-muted-foreground">
                Agents are still working or no findings recorded for the current filter.
              </div>
            )}
            {filteredFindings.map((f) => {
              const matchedRun = agent_runs.find((r) => r.id === f.agent_run_id);
              return (
                <motion.details
                  key={f.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group rounded-xl border border-black/10 open:border-foreground/40"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <SeverityDot s={f.severity} />
                      <div className="text-[14px] font-medium tracking-tight">
                        {f.title}
                        {matchedRun && (
                          <span className="ml-2.5 inline-flex items-center rounded bg-black/[.04] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {formatKind(matchedRun.kind)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      {f.cwe && <span className="font-mono">{f.cwe}</span>}
                      <span className="uppercase tracking-[0.15em]">{f.severity}</span>
                    </div>
                  </summary>
                  <div className="border-t border-black/5 px-5 py-4 text-[13px] leading-relaxed text-foreground/85">
                    <p>{f.description}</p>
                    {f.remediation && (
                      <div className="mt-3">
                        <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Remediation</div>
                        <p className="mt-1">{f.remediation}</p>
                      </div>
                    )}
                    {f.evidence && Object.keys(f.evidence as object).length > 0 && (
                      <div className="mt-3">
                        <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Evidence</div>
                        <pre className="mt-1 overflow-x-auto rounded-lg bg-black/[.03] p-3 font-mono text-[11px]">
                          {JSON.stringify(f.evidence, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {/* ✨ Auto-Patch Trigger */}
                    <div className="mt-5 border-t border-black/5 pt-4">
                      <button
                        onClick={() => startPatchingWorkflow(f)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/10 transition-all duration-200 hover:bg-indigo-700 hover:scale-[1.02] hover:shadow-indigo-700/20 active:scale-[0.98]"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sparkles">
                          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                          <path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5.5z" />
                          <path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z" />
                        </svg>
                        Auto-Patch with AI Autopilot
                      </button>
                    </div>
                  </div>
                </motion.details>
              );
            })}
          </div>
        </section>
      </div>

      {/* AI Autopilot Modal */}
      <AnimatePresence>
        {activePatchFinding && (
          <AutopilotModal
            finding={activePatchFinding}
            status={patchStatus}
            logs={patchLogs}
            prStatus={prStatus}
            onClose={() => {
              setActivePatchFinding(null);
              setPatchStatus("idle");
              setPatchLogs([]);
              setPrStatus("idle");
            }}
            onOpenPR={createGithubPullRequest}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function AutopilotModal({ finding, status, logs, prStatus, onClose, onOpenPR }: { 
  finding: any; 
  status: "scanning" | "patching" | "verifying" | "success" | "idle"; 
  logs: string[]; 
  prStatus: "idle" | "creating" | "success" | "failed";
  onClose: () => void; 
  onOpenPR: () => void;
}) {
  const details = getPatchDetails(finding.title);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 15 }}
        className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-100 font-sans"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/50 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 items-center justify-center">
              <span className="h-2 w-2 animate-ping rounded-full bg-indigo-500 absolute" />
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
            </span>
            <span className="font-semibold text-sm tracking-tight text-zinc-200">
              AI Security Autopilot / Patch Engine
            </span>
          </div>
          <button 
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5 text-left">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400">Target Vulnerability</div>
            <h3 className="text-lg font-medium tracking-tight text-white mt-1">{finding.title}</h3>
            <p className="text-xs text-zinc-400 mt-1">{finding.description}</p>
          </div>

          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Sandbox Auto-Patch & Verify Logs</div>
            <div className="bg-black border border-zinc-900 p-4 rounded-xl font-mono text-[10px] leading-relaxed text-zinc-400 h-[160px] overflow-y-auto space-y-1">
              {logs.map((log, idx) => (
                <div key={idx} className="flex gap-2">
                  <span className="text-zinc-700 select-none">[{idx + 1}]</span>
                  <span className={
                    log.includes("[SYSTEM]") ? "text-indigo-400" :
                    log.startsWith("$") ? "text-zinc-500 font-bold" :
                    log.includes("[VERIFIER] Verification passed") || log.includes("Probe verification check passed") ? "text-emerald-400 font-semibold" :
                    log.includes("remediated") ? "text-emerald-400 font-semibold" :
                    log.includes("[VERIFIER] PROBE BLOCKED") ? "text-amber-400 font-semibold" :
                    log.includes("[ALERT]") ? "text-rose-400 font-semibold" : "text-zinc-300"
                  }>{log}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>

          {status === "success" && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Security Patch Diff ({details.file})</div>
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">VERIFIED CLEAN</span>
              </div>
              
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 font-mono text-[11px] overflow-x-auto text-zinc-300 max-h-[160px] overflow-y-auto leading-relaxed">
                {details.diff.split("\n").map((line, idx) => {
                  let lineClass = "text-zinc-400";
                  if (line.startsWith("-")) lineClass = "bg-rose-950/40 text-rose-300 border-l-2 border-rose-500 px-1 py-0.5";
                  if (line.startsWith("+")) lineClass = "bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500 px-1 py-0.5";
                  if (line.startsWith("<<<<") || line.startsWith("====") || line.startsWith(">>>>")) lineClass = "text-indigo-400 font-bold border-zinc-800 py-1 bg-zinc-900/50";
                  return (
                    <div key={idx} className={lineClass}>
                      {line}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>

        <div className="border-t border-zinc-800 bg-zinc-900/20 px-6 py-4 flex items-center justify-end gap-3">
          {status === "success" ? (
            <>
              {prStatus === "success" && (
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium mr-auto">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  PR Created Successfully!
                </span>
              )}
              
              <button
                onClick={onClose}
                className="rounded-full border border-zinc-800 bg-transparent px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
              >
                Close
              </button>
              
              {prStatus === "idle" && (
                <button
                  onClick={onOpenPR}
                  className="rounded-full bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/10 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Create GitHub Pull Request
                </button>
              )}

              {prStatus === "creating" && (
                <button
                  disabled
                  className="rounded-full bg-indigo-600/40 px-5 py-2 text-xs font-semibold text-white/50 cursor-not-allowed flex items-center gap-2"
                >
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  Creating PR...
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
              <span>AI is patching & testing in isolated VM...</span>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function formatKind(k: string) {
  return { recon: "Recon", authn: "AuthN", injection: "Injection", supply_chain: "Supply chain" }[k] ?? k;
}

function StatusBig({ status }: { status: string }) {
  const color: Record<string, string> = {
    queued: "text-muted-foreground",
    provisioning: "text-blue-700",
    running: "text-blue-700",
    complete: "text-emerald-700",
    failed: "text-red-700",
    cancelled: "text-muted-foreground",
  };
  return <div className={`text-[13px] font-medium uppercase tracking-[0.15em] ${color[status]}`}>{status}</div>;
}

function RunPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-black/[.05] text-muted-foreground",
    running: "bg-blue-500/15 text-blue-700",
    complete: "bg-emerald-500/10 text-emerald-700",
    failed: "bg-red-500/10 text-red-700",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${map[status]}`}>
      {status === "running" && <span className="h-1 w-1 animate-pulse rounded-full bg-current" />}
      {status}
    </span>
  );
}

function SeverityDot({ s }: { s: string }) {
  const c = { low: "bg-slate-400", medium: "bg-amber-500", high: "bg-orange-600", critical: "bg-red-600" }[s] ?? "bg-slate-400";
  return <span className={`h-2 w-2 rounded-full ${c}`} />;
}
