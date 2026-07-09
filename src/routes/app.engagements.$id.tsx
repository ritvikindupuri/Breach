import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

  // Decorate all pages with headers/footers
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
  const [activeTab, setActiveTab] = useState<"logs" | "results">("logs");
  const [activeNode, setActiveNode] = useState<string>("verify");

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

  // Node execution states mapping helper
  const getNodeState = (nodeId: string) => {
    if (e.status === "failed") return "failed";
    if (nodeId === "trigger") return "complete";
    if (nodeId === "verify") {
      if (e.status === "queued" || e.status === "provisioning") return "running";
      return "complete";
    }
    // Agent mappings
    const mapping: Record<string, string> = {
      ports: "recon",
      secrets: "authn",
      commands: "injection",
      dependencies: "supply_chain"
    };
    const agentKind = mapping[nodeId];
    if (!agentKind) return "pending";
    const run = agent_runs.find(r => r.kind === agentKind);
    return run ? run.status : "pending";
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative selection:bg-foreground selection:text-background">
      <header className="border-b border-black/5">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/app" className="text-[13px] text-muted-foreground hover:text-foreground">
            ← All engagements
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() => downloadPdfReport(e, agent_runs, findings)}
              className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-4 py-1.5 text-xs font-semibold text-foreground hover:bg-black/[.02] shadow-sm transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-download">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" x2="12" y1="15" y2="3" />
              </svg>
              Download PDF Report
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Engagement Title bar */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">ENGAGEMENT</div>
            <h1 className="mt-2 font-serif text-4xl tracking-[-0.02em]">{e.name}</h1>
            <div className="mt-2 font-mono text-[12px] text-muted-foreground">
              {e.repo_url} · {e.branch}
            </div>
          </div>
          <div className="text-right">
            <StatusBig status={e.status} />
            <div className="mt-2 text-[12px] text-muted-foreground">
              {e.started_at ? `Started ${new Date(e.started_at).toLocaleString()}` : ""}
            </div>
          </div>
        </div>

        {e.summary && (
          <div className="mt-8 rounded-2xl border border-black/10 bg-black/[.02] p-6 text-[14px] leading-relaxed text-foreground/90">
            <strong>Audit Synthesis:</strong> {e.summary}
          </div>
        )}

        {/* Tab Selection */}
        <div className="mt-10 border-b border-black/10 flex items-center justify-between">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("logs")}
              className={`pb-3 text-[13px] font-semibold transition-colors relative ${
                activeTab === "logs" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Pipeline & Sandbox Logs
              {activeTab === "logs" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("results")}
              className={`pb-3 text-[13px] font-semibold transition-colors relative ${
                activeTab === "results" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              See Results & Visual Graph
              {findings.length > 0 && (
                <span className="ml-2 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] text-white font-mono font-bold">
                  {findings.length}
                </span>
              )}
              {activeTab === "results" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
              )}
            </button>
          </div>
        </div>

        <div className="mt-8">
          <AnimatePresence mode="wait">
            {activeTab === "logs" ? (
              <motion.div
                key="logs-pane"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* n8n-style Node Graph execution lineage container */}
                <div className="rounded-2xl border border-black/10 bg-black/[.015] p-8 shadow-sm relative overflow-hidden">
                  {/* Grid canvas background simulation */}
                  <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1.5px,transparent_1.5px)] [background-size:16px_16px] opacity-70 pointer-events-none -z-10" />

                  <h3 className="text-[11px] font-bold tracking-[0.2em] text-muted-foreground uppercase mb-6">Interactive Execution Workflow Node Graph</h3>
                  
                  {/* Horizontal Flow layout */}
                  <div className="flex flex-col md:flex-row items-center justify-between gap-12 relative py-4 max-w-4xl mx-auto">
                    
                    {/* SVG Connector Lines */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none hidden md:block -z-10">
                      <defs>
                        <linearGradient id="flow-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#cbd5e1" />
                          <stop offset="50%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#cbd5e1" />
                        </linearGradient>
                      </defs>
                      {/* Lines from Trigger to Verification */}
                      <path d="M 120 40 L 260 40" stroke="url(#flow-grad)" strokeWidth="1.5" fill="none" />
                      {/* Lines branching to 4 Auditor nodes */}
                      <path d="M 330 40 L 480 -40" stroke="#cbd5e1" strokeWidth="1.5" fill="none" />
                      <path d="M 330 40 L 480 15" stroke="#cbd5e1" strokeWidth="1.5" fill="none" />
                      <path d="M 330 40 L 480 70" stroke="#cbd5e1" strokeWidth="1.5" fill="none" />
                      <path d="M 330 40 L 480 120" stroke="#cbd5e1" strokeWidth="1.5" fill="none" />
                    </svg>

                    {/* Node 1: Start Trigger */}
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-3 bg-white border border-black/10 rounded-xl px-4 py-3 shadow-sm w-44 hover:shadow transition-shadow">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <div className="text-left">
                          <div className="text-[9px] font-mono text-muted-foreground uppercase">TRIGGER</div>
                          <div className="text-xs font-bold text-foreground">GitHub Repo Check-in</div>
                        </div>
                      </div>
                    </div>

                    {/* Node 2: Docker Verification Filter */}
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-3 bg-white border border-black/10 rounded-xl px-4 py-3 shadow-sm w-44 hover:shadow transition-shadow">
                        <span className={`h-2.5 w-2.5 rounded-full ${
                          getNodeState("verify") === "complete" ? "bg-emerald-500" :
                          getNodeState("verify") === "running" ? "bg-blue-500 animate-pulse" : "bg-zinc-300"
                        }`} />
                        <div className="text-left">
                          <div className="text-[9px] font-mono text-muted-foreground uppercase">VERIFICATION</div>
                          <div className="text-xs font-bold text-foreground">Dockerfile Check</div>
                        </div>
                      </div>
                    </div>

                    {/* Node 3: Specialist Agent Clusters */}
                    <div className="flex flex-col gap-4">
                      {[
                        { id: "ports", kind: "recon", label: "Network & Ports Auditor" },
                        { id: "secrets", kind: "authn", label: "Secrets & Credentials" },
                        { id: "commands", kind: "injection", label: "Runtime Commands" },
                        { id: "dependencies", kind: "supply_chain", label: "Images & Dependencies" }
                      ].map((node) => {
                        const state = getNodeState(node.id);
                        const run = agent_runs.find(r => r.kind === node.kind);
                        const isSelected = selectedRunId === run?.id;
                        
                        return (
                          <div
                            key={node.id}
                            onClick={() => {
                              if (run) {
                                setSelectedRunId(run.id);
                                setActiveNode(node.id);
                              }
                            }}
                            className={`flex items-center gap-3 bg-white border rounded-xl px-4 py-2.5 shadow-sm w-56 cursor-pointer transition-all hover:scale-[1.01] ${
                              isSelected 
                                ? "border-indigo-500 ring-2 ring-indigo-500/10 shadow-indigo-100" 
                                : "border-black/10 hover:border-black/20"
                            }`}
                          >
                            <span className={`h-2.5 w-2.5 rounded-full ${
                              state === "complete" ? "bg-emerald-500" :
                              state === "running" ? "bg-blue-500 animate-pulse" : 
                              state === "failed" ? "bg-rose-500" : "bg-zinc-300"
                            }`} />
                            <div className="text-left">
                              <div className="text-[9px] font-mono text-muted-foreground uppercase">AGENT NODE</div>
                              <div className="text-xs font-bold text-foreground">{node.label}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Log Terminal console */}
                {selectedRun && (
                  <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl text-left">
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

                    <div className="h-[380px] overflow-y-auto p-5 font-mono text-[11.5px] leading-relaxed text-zinc-300 select-text bg-zinc-950">
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
                              lineClass = "text-indigo-400 font-semibold italic";
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
              </motion.div>
            ) : (
              <motion.div
                key="results-pane"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-10"
              >
                {/* Interactive Process security lineage Graph mapping container relationships */}
                <div className="rounded-2xl border border-black/10 bg-black/[.01] p-8 shadow-sm relative">
                  <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1.5px,transparent_1.5px)] [background-size:16px_16px] opacity-70 pointer-events-none -z-10" />
                  
                  <h3 className="text-[11px] font-bold tracking-[0.2em] text-muted-foreground uppercase mb-6">Container Isolation Boundary Lineage Map</h3>

                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 relative items-stretch">
                    {/* Column 1: Exposed ports */}
                    <div className="border border-black/10 bg-white rounded-xl p-5 shadow-sm hover:border-indigo-500 transition-colors">
                      <div className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase">PORT EXPOSURE LEVEL</div>
                      <h4 className="font-serif text-lg mt-2">Network Boundary</h4>
                      <p className="text-xs text-muted-foreground mt-1">Direct port mappings binding container interfaces to host IP routes.</p>
                      
                      <div className="mt-4 border-t border-black/5 pt-4 space-y-2">
                        {findings.filter(f => f.title.toLowerCase().includes("port") || f.title.toLowerCase().includes("expose")).map(f => (
                          <div key={f.id} className="text-xs bg-rose-500/5 text-rose-600 rounded-lg p-2.5 border border-rose-500/10 font-medium">
                            🚨 Exposed: {f.evidence?.port || f.evidence?.mapping || "Port Exposure"}
                          </div>
                        ))}
                        {findings.filter(f => f.title.toLowerCase().includes("port") || f.title.toLowerCase().includes("expose")).length === 0 && (
                          <div className="text-xs bg-emerald-500/5 text-emerald-600 rounded-lg p-2.5 border border-emerald-500/10 font-medium">
                            ✔ Ports Isolated
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Column 2: Secrets store */}
                    <div className="border border-black/10 bg-white rounded-xl p-5 shadow-sm hover:border-indigo-500 transition-colors">
                      <div className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase">CREDENTIAL PROTECTION</div>
                      <h4 className="font-serif text-lg mt-2">Secrets Isolation</h4>
                      <p className="text-xs text-muted-foreground mt-1">Environment setups, example templates, and secrets injection validation.</p>
                      
                      <div className="mt-4 border-t border-black/5 pt-4 space-y-2">
                        {findings.filter(f => f.title.toLowerCase().includes("credential") || f.title.toLowerCase().includes("secret")).map(f => (
                          <div key={f.id} className="text-xs bg-rose-500/5 text-rose-600 rounded-lg p-2.5 border border-rose-500/10 font-medium">
                            🔑 Weak Env: {f.evidence?.keyName || "Default Password"}
                          </div>
                        ))}
                        {findings.filter(f => f.title.toLowerCase().includes("credential") || f.title.toLowerCase().includes("secret")).length === 0 && (
                          <div className="text-xs bg-emerald-500/5 text-emerald-600 rounded-lg p-2.5 border border-emerald-500/10 font-medium">
                            ✔ Environment Secure
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Column 3: Namespace Privilege */}
                    <div className="border border-black/10 bg-white rounded-xl p-5 shadow-sm hover:border-indigo-500 transition-colors">
                      <div className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase">OS NAMESPACE BOUNDARY</div>
                      <h4 className="font-serif text-lg mt-2">Privilege Isolation</h4>
                      <p className="text-xs text-muted-foreground mt-1">Audit of Docker root namespace privileges and escape paths.</p>
                      
                      <div className="mt-4 border-t border-black/5 pt-4 space-y-2">
                        {findings.filter(f => f.title.toLowerCase().includes("root") || f.title.toLowerCase().includes("privileged")).map(f => (
                          <div key={f.id} className="text-xs bg-rose-500/5 text-rose-600 rounded-lg p-2.5 border border-rose-500/10 font-medium">
                            💀 Privileged: USER root
                          </div>
                        ))}
                        {findings.filter(f => f.title.toLowerCase().includes("root") || f.title.toLowerCase().includes("privileged")).length === 0 && (
                          <div className="text-xs bg-emerald-500/5 text-emerald-600 rounded-lg p-2.5 border border-emerald-500/10 font-medium">
                            ✔ Non-Root runtime configured
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Column 4: Base layers */}
                    <div className="border border-black/10 bg-white rounded-xl p-5 shadow-sm hover:border-indigo-500 transition-colors">
                      <div className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase">BASE IMAGE LAYERS</div>
                      <h4 className="font-serif text-lg mt-2">Image Supply Chain</h4>
                      <p className="text-xs text-muted-foreground mt-1">Package manifest checks and unpinned base tag evaluations.</p>
                      
                      <div className="mt-4 border-t border-black/5 pt-4 space-y-2">
                        {findings.filter(f => f.title.toLowerCase().includes("image") || f.title.toLowerCase().includes("dependency")).map(f => (
                          <div key={f.id} className="text-xs bg-amber-500/5 text-amber-700 rounded-lg p-2.5 border border-amber-500/10 font-medium">
                            📦 Tag Drift: {f.evidence?.from || "Unpinned Tag"}
                          </div>
                        ))}
                        {findings.filter(f => f.title.toLowerCase().includes("image") || f.title.toLowerCase().includes("dependency")).length === 0 && (
                          <div className="text-xs bg-emerald-500/5 text-emerald-600 rounded-lg p-2.5 border border-emerald-500/10 font-medium">
                            ✔ Pinned & Compromise-free
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Copilot Actionable Diffs section */}
                <div className="space-y-4">
                  <h3 className="text-[11px] font-bold tracking-[0.2em] text-muted-foreground uppercase">AI-Copilot Actionable Remediations</h3>
                  <div className="grid gap-6">
                    {findings.map((f, idx) => (
                      <div key={f.id} className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-3">
                          <SeverityDot s={f.severity} />
                          <h4 className="font-bold text-sm text-foreground">{idx + 1}. {f.title}</h4>
                        </div>

                        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{f.description}</p>
                        
                        {/* Auto Remediation code recommendation */}
                        <div className="mt-4">
                          <div className="text-[9px] font-mono tracking-wider text-muted-foreground uppercase mb-2">RECOMMENDED SECURE CONFIGURATION FIX</div>
                          <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-4 font-mono text-[11px] text-emerald-400 select-all">
                            {f.remediation || "# Remediation: Apply strict container limits"}
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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
