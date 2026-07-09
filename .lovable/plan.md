# Breach — AI Pen-Test Team

Reframe the app from "AWS credential vault + proxy" to **a team of AI web-app pen-test agents** that clone the user's Git repo into a sandboxed Docker container (run by a runner the user hosts) and probe it for real vulnerabilities. The Lovable app is the control plane, agent brain, and findings UI. The runner is a small open-source Docker-host binary the user drops on any VM.

Keep everything the user answered "keep": auth + RBAC (admin/member/viewer), environments, hash-chained audit log.

## What the user sees

1. **Landing page** — reframed. Same Apple-clean visual system (Söhne/Inter stack, black/white, subtle motion). New copy: "A team of AI agents pen-tests your app in a disposable sandbox." Short "How it works" strip (Repo → Sandbox → Agents → Report). Ships in the same turn.
2. **/app dashboard** — list of *engagements* (one engagement = one pen-test of one target). Columns: target, status (queued → provisioning → running → complete → failed), verdict (clean / issues / critical), findings count, started, duration.
3. **New engagement wizard** — 3 steps: (1) paste public Git URL or select a linked GitHub repo (via existing GitHub connector, optional), pick branch, (2) pick environment (dev/staging/prod), pick agent team (Recon / AuthN / Injection / Supply-chain — all four on by default), (3) confirm & launch. On launch: a job row is queued and the assigned runner picks it up.
4. **Engagement detail** — live agent-by-agent stream. Each agent card shows: status, current step ("fingerprinting stack", "probing /login for user enumeration"), token/step count, and its findings as they land. Findings have severity, title, evidence (request/response snippet), reproduction steps, and remediation.
5. **Runners page** — user creates a runner (gets a one-time bootstrap token + a copy-paste `docker run` command). Shows runner status (online/offline, last heartbeat, jobs run). Admin-only.
6. **Findings** — filter by severity/agent/engagement, export SOC2-style JSON/CSV report, tied into existing audit log.

## Architecture

```text
Browser ── TanStack app (control plane, UI, agent brain)
                │
                ├── createServerFn: create engagement, list findings, mint runner tokens
                │
                ├── Lovable AI Gateway (google/gemini-2.5-flash for planning,
                │   google/gemini-2.5-pro for verdict synthesis) — AI SDK agents
                │
                └── /api/public/runner/*  ← HMAC-signed webhook API
                                                │
                                                ▼
                                    User-hosted runner (Node/Bun binary + Docker)
                                       - polls for jobs
                                       - `git clone` target repo into /workspace
                                       - `docker build` from repo Dockerfile (or
                                         Nixpacks fallback) into a scratch network
                                       - runs container on isolated bridge network,
                                         no host mounts, memory/cpu capped, no
                                         internet by default (allowlist only)
                                       - exposes container URL back to agents via
                                         signed callbacks
                                       - executes commands the agents request
                                         (curl probes, nmap-lite, sqlmap-lite payloads)
                                       - streams stdout + HTTP traces back
                                       - tears down container + volume on finish
```

The **agent loop lives server-side** using AI SDK `streamText` + `tool()`. Each specialist agent gets a narrow tool surface: `http_request(target, method, path, headers, body)`, `run_container_command(cmd)`, `record_finding(severity, title, evidence, remediation)`. Those tools proxy to the runner over the signed webhook channel. Agents run with `stopWhen: stepCountIs(50)` and a per-engagement token budget.

## Data model

Keep: `profiles`, `user_roles`, `environments`, `audit_log`.
Drop (pivot away from AWS vault): `aws_credentials`, `detection_rules`, `intercepts`, `vault_master_key`.

New tables (all with GRANTs + RLS + role-based policies):

- `runners` — id, owner_id, environment_id, name, token_hash, status, last_seen_at, created_by
- `engagements` — id, owner_id, environment_id, runner_id, repo_url, branch, commit_sha, status, verdict, started_at, finished_at, token_usage
- `agent_runs` — id, engagement_id, agent_kind (recon | authn | injection | supply_chain), status, current_step, step_count, started_at, finished_at
- `findings` — id, engagement_id, agent_run_id, severity (low/med/high/critical), title, description, evidence_jsonb, remediation, cwe, created_at
- `job_queue` — id, engagement_id, runner_id, status, claim_token, claimed_at, payload_jsonb (for runner polling)

All scoped by `owner_id` + environment membership. Admin sees all in their environments; member sees own engagements; viewer read-only.

## Runner protocol (public, HMAC-signed)

Under `/api/public/runner/`:
- `POST /register` — one-time bootstrap token → long-lived signing secret
- `POST /heartbeat` — runner keepalive
- `POST /claim` — long-poll for next queued job
- `POST /report` — stream stdout / HTTP traces / findings
- `POST /finish` — mark engagement done, upload summary

Every request: `X-Runner-Id`, `X-Signature: hmac_sha256(body, secret)`, timing-safe compare, body validated with Zod.

## Landing / design

Keep the current Apple-inspired minimal system (Söhne/Inter, near-black on off-white, generous whitespace, Framer Motion micro-transitions). New hero: **"Ship, then break it."** — one-line subhead — single primary CTA. Below: 4-step diagram, agent team lineup (4 cards, each with a role and one sentence), CTA to start engagement. No stock illustrations, no gradients, no icons soup.

## Build order (one turn)

1. Migration: drop old tables, create new schema with grants/RLS/policies, add helper fn `is_engagement_owner`.
2. Server functions (`src/lib/engagements.functions.ts`, `runners.functions.ts`, `findings.functions.ts`) — auth-gated.
3. Public runner routes under `src/routes/api/public/runner/*` — HMAC-verified, admin loads inside handlers.
4. Agent orchestration (`src/lib/agents/*.server.ts`) — one file per specialist + orchestrator using AI SDK, tool set proxies to runner over job_queue.
5. UI: rewrite `/`, `/app` (engagements list + new-engagement modal), new `/app/engagements/$id`, `/app/runners`, `/app/findings`.
6. Kill old routes/components that referenced the AWS vault; strip old server fns.
7. Update `<head>` metadata (title "Breach — AI pen-testing for your app", matching OG).
8. README snippet in-app for the runner one-liner (docker command with bootstrap token).

## Explicitly out of scope for v1

- Runner binary source (we ship the protocol + the copy-paste command; the runner itself is a separate repo the user runs).
- Real exploit payloads that would touch third parties — agents stay inside the sandboxed container network.
- Scheduled/recurring engagements, Slack/webhook alerts (easy follow-up).
- Bedrock — using Lovable AI Gateway (Gemini/GPT) instead; equivalent quality, no key needed.

Approve to build.
