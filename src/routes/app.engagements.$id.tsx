import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
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

function downloadPdfReport(e: any, runs: any[], findings: any[]) {
  const doc = new jsPDF();
  
  // Color Palette Constants
  const primaryColor = [15, 23, 42]; // Slate 900
  const secondaryColor = [71, 85, 105]; // Slate 600
  const lightBgColor = [248, 250, 252]; // Slate 50
  const accentRed = [185, 28, 28]; // Red 700
  const accentOrange = [194, 65, 12]; // Orange 700
  const accentGray = [100, 116, 139]; // Slate 500

  // Helper: Header & Footer decoration (page number added at end)
  const drawPageBorder = (pageNum: number, totalPages: number) => {
    if (pageNum === 1) return; // Skip title page header/border
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.5);
    doc.line(14, 15, 196, 15); // Top header line
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("BREACH DOCKER SECURITY AUDIT REPORT", 14, 11);
    doc.text(`Page ${pageNum} of ${totalPages}`, 196, 11, { align: "right" });
  };

  // ----------------------------------------------------
  // PAGE 1: TITLE PAGE
  // ----------------------------------------------------
  // Decorative side color bar
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 8, 297, "F");

  // Title page branding
  doc.setFont("helvetica", "bold");
  doc.setFontSize(36);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("BREACH", 25, 60);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text("Autonomous Docker Security Audit & Vulnerability Assessment", 25, 70);

  // Large decorative line
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(1.5);
  doc.line(25, 80, 180, 80);

  // Metadata Table Container
  doc.setFillColor(lightBgColor[0], lightBgColor[1], lightBgColor[2]);
  doc.rect(25, 110, 155, 95, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  
  let my = 125;
  doc.text("AUDIT TARGET DETAILS", 35, my - 5);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(35, my - 2, 170, my - 2);
  
  doc.setFont("helvetica", "bold");
  doc.text("Configuration Title:", 35, my + 8);
  doc.setFont("helvetica", "normal");
  doc.text(String(e.name), 80, my + 8);
  
  doc.setFont("helvetica", "bold");
  doc.text("Repository URL:", 35, my + 18);
  doc.setFont("helvetica", "normal");
  doc.text(String(e.repo_url).length > 40 ? String(e.repo_url).slice(0, 38) + "..." : String(e.repo_url), 80, my + 18);
  
  doc.setFont("helvetica", "bold");
  doc.text("Git Branch:", 35, my + 28);
  doc.setFont("helvetica", "normal");
  doc.text(String(e.branch), 80, my + 28);
  
  doc.setFont("helvetica", "bold");
  doc.text("Environment Mode:", 35, my + 38);
  doc.setFont("helvetica", "normal");
  doc.text(String(e.environment_id).slice(0, 12) + "...", 80, my + 38);
  
  doc.setFont("helvetica", "bold");
  doc.text("Compliance Verdict:", 35, my + 48);
  const verdictText = String(e.verdict).toUpperCase();
  if (verdictText === "CRITICAL" || verdictText === "ISSUES") {
    doc.setTextColor(accentRed[0], accentRed[1], accentRed[2]);
  } else {
    doc.setTextColor(16, 185, 129); // emerald 500
  }
  doc.text(verdictText, 80, my + 48);
  
  // Date Block
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setFont("helvetica", "bold");
  doc.text("Audit Date:", 35, my + 58);
  doc.setFont("helvetica", "normal");
  const started = e.started_at ? new Date(e.started_at).toLocaleDateString() : "N/A";
  doc.text(started, 80, my + 58);

  // Confidentiality footer on Title page
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(accentRed[0], accentRed[1], accentRed[2]);
  doc.text("CONFIDENTIAL — INTERNAL SECURITY REVIEW ONLY", 25, 270);
  
  // ----------------------------------------------------
  // PAGE 2: EXEC SUMMARY & AGENTS
  // ----------------------------------------------------
  doc.addPage();
  let y = 30;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("1. EXECUTIVE SUMMARY", 14, y);
  y += 8;

  if (e.summary) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(51, 65, 85); // Slate 700
    const splitSummary = doc.splitTextToSize(e.summary, 180);
    doc.text(splitSummary, 14, y);
    y += (splitSummary.length * 5) + 15;
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(51, 65, 85);
    doc.text("No general executive summary recorded for this configuration run.", 14, y);
    y += 15;
  }

  // Divider
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.5);
  doc.line(14, y, 196, y);
  y += 12;

  // Agent Status List
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("2. AGENT PIPELINE RUNS", 14, y);
  y += 8;

  runs.forEach((r) => {
    const kindName = { recon: "Network & Ports", authn: "Secrets & Credentials", injection: "Runtime Commands", supply_chain: "Images & Dependencies" }[r.kind] || r.kind;
    
    // Status Pill color mapping
    let statusColor = accentGray;
    if (r.status === "complete") statusColor = [16, 185, 129];
    else if (r.status === "failed") statusColor = accentRed;
    else if (r.status === "running") statusColor = [59, 130, 246];

    // Card background
    doc.setFillColor(lightBgColor[0], lightBgColor[1], lightBgColor[2]);
    doc.rect(14, y, 182, 16, "F");

    // Agent name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(kindName, 18, y + 10);

    // Status
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(r.status.toUpperCase(), 120, y + 10);

    // Current step
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(r.current_step || "idle", 150, y + 10);

    y += 20;
  });

  // ----------------------------------------------------
  // PAGE 3+: FINDINGS
  // ----------------------------------------------------
  doc.addPage();
  y = 30;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("3. DETAILED SECURITY FINDINGS", 14, y);
  y += 10;

  if (findings.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(16, 185, 129);
    doc.text("✔ Clean Audit: No vulnerabilities or configuration flaws detected.", 14, y);
    y += 15;
  } else {
    findings.forEach((f, idx) => {
      // Check page boundary for new finding card
      if (y > 220) {
        doc.addPage();
        y = 30;
      }

      const severityName = f.severity.toUpperCase();
      let sevColor = accentGray;
      if (severityName === "CRITICAL" || severityName === "HIGH") sevColor = accentRed;
      else if (severityName === "MEDIUM") sevColor = accentOrange;

      // Findings Card Header Bar
      doc.setFillColor(lightBgColor[0], lightBgColor[1], lightBgColor[2]);
      doc.rect(14, y, 182, 10, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`${idx + 1}. ${f.title}`, 18, y + 7);

      // Severity tag
      doc.setFillColor(sevColor[0], sevColor[1], sevColor[2]);
      doc.rect(160, y + 2.5, 30, 5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(severityName, 175, y + 6, { align: "center" });

      y += 14;

      // CWE code
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      const cweText = f.cwe ? `Classification: ${f.cwe}` : "Classification: Generic Flaw";
      doc.text(cweText, 14, y);
      y += 6;

      // Description details
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
      const splitDesc = doc.splitTextToSize(f.description, 180);
      doc.text(splitDesc, 14, y);
      y += (splitDesc.length * 4.5) + 4;

      // Remediation instructions
      if (f.remediation) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text("Remediation Action:", 14, y);
        y += 5;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85);
        const splitRem = doc.splitTextToSize(f.remediation, 180);
        doc.text(splitRem, 14, y);
        y += (splitRem.length * 4.5) + 6;
      }

      y += 4; // spacing between findings
    });
  }

  // ----------------------------------------------------
  // PAGE LAST: CONCLUSION
  // ----------------------------------------------------
  // Force conclusion to its own dedicated final page
  doc.addPage();
  y = 30;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("4. AUDIT CONCLUSION & ACTIONS", 14, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  
  const conclusionText = 
    "This autonomous audit assessed the static configurations of the target Dockerized repository " +
    "in alignment with Center for Internet Security (CIS) Container Benchmarks. " +
    "Vulnerabilities and flaws detected inside Dockerfiles or compose configs present direct channels " +
    "for container runtime namespace escapes, privilege escalations, and credential leakage. " +
    "Implementing the outlined remediation instructions is critical to locking down your image layers " +
    "and restricting unnecessary network and system privilege paths.";
  
  const splitConcl = doc.splitTextToSize(conclusionText, 180);
  doc.text(splitConcl, 14, y);
  y += (splitConcl.length * 5) + 15;

  // Remediation Priority Box
  doc.setFillColor(lightBgColor[0], lightBgColor[1], lightBgColor[2]);
  doc.rect(14, y, 182, 50, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("Mitigation SLA Guidance", 20, y + 8);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text("• Critical & High Severity findings: Must resolve within 7 days.", 20, y + 18);
  doc.text("• Medium Severity findings: Must resolve within 30 days.", 20, y + 28);
  doc.text("• Low Severity findings: Remediate during standard maintenance cycles.", 20, y + 38);

  y += 65;

  // Sign-off
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("AUDIT SYSTEM SIGN-OFF", 14, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text("Audited By: Breach AI Autonomous Auditor Agent Suite", 14, y + 5);
  doc.text("System Verification Hash: " + String(e.id).slice(0, 16) + "... (Signed)", 14, y + 12);
  
  doc.text("Signature: ___________________________", 120, y + 8);

  // ----------------------------------------------------
  // DECORATE ALL PAGES WITH HEADERS & FOOTERS
  // ----------------------------------------------------
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawPageBorder(i, totalPages);
    
    // Page bottom confidentiality footer on all pages
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text("CONFIDENTIAL - BREACH SECURITY REPORT", 14, 287);
  }

  // Save/Download PDF
  doc.save(`Breach-Docker-Audit-Report-${e.name.replace(/[^a-z0-9]/gi, "_")}.pdf`);
}

function EngagementDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [findingsFilter, setFindingsFilter] = useState<"all" | "selected">("all");

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

        {selectedRun && (
          <div className="mt-6 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl text-left">
            {/* Console Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/50 px-4 py-2.5">
              <div className="flex items-center gap-2 font-mono text-[11px] font-semibold text-zinc-300">
                <span className="flex h-3 w-3 items-center justify-center">
                  <span className={`h-2 w-2 rounded-full ${
                    selectedRun.status === "running" ? "bg-blue-500 animate-pulse" :
                    selectedRun.status === "complete" ? "bg-emerald-500" :
                    selectedRun.status === "failed" ? "bg-rose-500" : "bg-zinc-500"
                  }`} />
                </span>
                <span>{selectedRun.kind.toUpperCase()}_AGENT_CONSOLE@sandbox</span>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-500">
                <span>tty1</span>
                <span>80x24</span>
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
                </div>
              </div>
            </div>

            {/* Console Body */}
            <div className="h-[300px] overflow-y-auto p-4 font-mono text-[11px] leading-relaxed text-zinc-300 select-text bg-zinc-950">
              {(!selectedRun.transcript || selectedRun.transcript.length === 0) ? (
                <div className="flex h-full flex-col items-center justify-center text-zinc-500 text-center">
                  <p>Initializing agent prober container...</p>
                  <p className="mt-1 text-[10px]">Real-time execution logs will print here as the agent tests parameters.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {(selectedRun.transcript as LogEntry[]).map((log, idx) => {
                    const date = new Date(log.timestamp);
                    const timeStr = date.toLocaleTimeString([], { hour12: false }) + `.${String(date.getMilliseconds()).padStart(3, "0")}`;
                    
                    let lineClass = "text-zinc-300";
                    if (log.message.includes("[AGENT THINKING]") || log.message.includes("[THINKING]")) {
                      lineClass = "text-violet-400 font-semibold italic";
                    } else if (log.message.startsWith("$")) {
                      lineClass = "text-emerald-400 font-bold";
                    } else if (log.message.includes("VULNERABILITY:") || log.message.includes("ALERT:")) {
                      lineClass = "text-rose-500 font-bold bg-rose-950/20 px-1 py-0.5 rounded";
                    } else if (log.type === "success") {
                      lineClass = "text-emerald-500";
                    } else if (log.type === "warning") {
                      lineClass = "text-amber-500";
                    } else if (log.type === "error") {
                      lineClass = "text-rose-500 font-semibold";
                    } else if (log.type === "request") {
                      lineClass = "text-blue-400";
                    }
                    
                    return (
                      <div key={idx} className="flex items-start gap-3 hover:bg-zinc-900/30 py-0.5 px-1 rounded transition-colors break-all">
                        <span className="text-zinc-600 select-none">{timeStr}</span>
                        <span className={lineClass}>
                          {log.message}
                        </span>
                      </div>
                    );
                  })}
                  
                  {/* Blinking cursor */}
                  {selectedRun.status === "running" && (
                    <div className="flex items-center gap-1 text-blue-400 font-semibold mt-2 px-1">
                      <span>{selectedRun.kind.toLowerCase()}-agent@sandbox:~$</span>
                      <span className="inline-block h-3 w-1.5 bg-blue-400 animate-pulse" />
                    </div>
                  )}

                  {selectedRun.status === "complete" && (
                    <div className="text-emerald-500 font-semibold mt-2 px-1">
                      <span>{selectedRun.kind.toLowerCase()}-agent@sandbox:~$ exit</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

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
                  </div>
                </motion.details>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function formatKind(k: string) {
  return { recon: "Network & Ports", authn: "Secrets & Credentials", injection: "Runtime Commands", supply_chain: "Images & Dependencies" }[k] ?? k;
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
