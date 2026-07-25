import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listEngagements from "./tools/list-engagements";
import getEngagement from "./tools/get-engagement";
import listFindings from "./tools/list-findings";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "breach-mcp",
  title: "Breach — Pen-test findings",
  version: "0.1.0",
  instructions:
    "Read-only access to the signed-in user's Breach pen-test engagements and findings. Use list_engagements to browse pen-tests, get_engagement for full detail (agent runs + findings), and list_findings to scan security issues across engagements filtered by severity.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listEngagements, getEngagement, listFindings],
});
