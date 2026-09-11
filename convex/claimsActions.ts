"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const nodeTypes = new Set(["treatment", "outcome", "confounder", "collider", "mediator"]);
const verdicts = new Set(["causal", "correlation", "insufficient", "mixed"]);
type NodeType = "treatment" | "outcome" | "confounder" | "collider" | "mediator";
type Assessment = { verdict: "causal" | "correlation" | "insufficient" | "mixed"; confidence: number; summary: string; studyDesign: string; causalPathway: string; evidence: string[]; caveats: string[]; causalStructure: { nodes: Array<{ id: string; label: string; type: NodeType }>; edges: Array<{ from: string; to: string; confidence: number; rationale: string; grounded: boolean }> } };

class StructuredOutputError extends Error {
  readonly rawResponse: string;

  constructor(rawResponse: string) {
    super("OpenAI structured output could not be parsed.");
    this.name = "StructuredOutputError";
    this.rawResponse = rawResponse;
  }
}

const outputSchema = {
  type: "object", additionalProperties: false,
  required: ["verdict", "confidence", "summary", "studyDesign", "causalPathway", "evidence", "caveats", "causalStructure"],
  properties: {
    verdict: { type: "string", enum: ["causal", "correlation", "insufficient", "mixed"] }, confidence: { type: "integer", minimum: 0, maximum: 100 }, summary: { type: "string" }, studyDesign: { type: "string" }, causalPathway: { type: "string" }, evidence: { type: "array", items: { type: "string" } }, caveats: { type: "array", items: { type: "string" } },
    causalStructure: { type: "object", additionalProperties: false, required: ["nodes", "edges"], properties: {
      nodes: { type: "array", items: { type: "object", additionalProperties: false, required: ["id", "label", "type"], properties: { id: { type: "string" }, label: { type: "string" }, type: { type: "string", enum: [...nodeTypes] } } } },
      edges: { type: "array", items: { type: "object", additionalProperties: false, required: ["from", "to", "confidence", "rationale", "grounded"], properties: { from: { type: "string" }, to: { type: "string" }, confidence: { type: "number", minimum: 0, maximum: 100 }, rationale: { type: "string" }, grounded: { type: "boolean" } } } },
    } },
  },
};

function message(cause: unknown) { return (cause instanceof Error ? cause.message : "Unknown pipeline failure.").slice(0, 500); }
function string(value: unknown, field: string) { if (typeof value !== "string") throw new Error(`OpenAI returned an invalid ${field}.`); return value; }
function strings(value: unknown, field: string) { if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) throw new Error(`OpenAI returned an invalid ${field}.`); return value; }
function parseAssessment(value: unknown): Assessment {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("OpenAI returned invalid JSON.");
  const record = value as Record<string, unknown>;
  if (typeof record.verdict !== "string" || !verdicts.has(record.verdict)) throw new Error("OpenAI returned an invalid verdict.");
  if (typeof record.confidence !== "number" || record.confidence < 0 || record.confidence > 100) throw new Error("OpenAI returned an invalid confidence.");
  if (typeof record.causalStructure !== "object" || record.causalStructure === null || Array.isArray(record.causalStructure)) throw new Error("OpenAI returned an invalid causal structure.");
  const structure = record.causalStructure as Record<string, unknown>;
  if (!Array.isArray(structure.nodes) || !Array.isArray(structure.edges)) throw new Error("OpenAI returned an invalid causal structure.");
  const nodes = structure.nodes.map((value) => { if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("OpenAI returned an invalid causal node."); const node = value as Record<string, unknown>; if (typeof node.type !== "string" || !nodeTypes.has(node.type)) throw new Error("OpenAI returned an invalid causal node type."); return { id: string(node.id, "node id"), label: string(node.label, "node label"), type: node.type as NodeType }; });
  const edges = structure.edges.map((value) => { if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("OpenAI returned an invalid causal edge."); const edge = value as Record<string, unknown>; if (typeof edge.confidence !== "number" || edge.confidence < 0 || edge.confidence > 100 || typeof edge.grounded !== "boolean") throw new Error("OpenAI returned an invalid causal edge."); return { from: string(edge.from, "edge from"), to: string(edge.to, "edge to"), confidence: edge.confidence, rationale: string(edge.rationale, "edge rationale"), grounded: edge.grounded }; });
  const confidence = record.confidence <= 1 ? Math.round(record.confidence * 100) : Math.round(record.confidence);
  return { verdict: record.verdict as Assessment["verdict"], confidence, summary: string(record.summary, "summary"), studyDesign: string(record.studyDesign, "study design"), causalPathway: string(record.causalPathway, "causal pathway"), evidence: strings(record.evidence, "evidence"), caveats: strings(record.caveats, "caveats"), causalStructure: { nodes, edges } };
}
async function scrapeSource(url: string) {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY is not configured.");
  const response = await fetch("https://api.firecrawl.dev/v1/scrape", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ url, formats: ["markdown"] }) });
  if (!response.ok) throw new Error(`Firecrawl scrape failed (${response.status}).`);
  const body: unknown = await response.json();
  const markdown = typeof body === "object" && body !== null && "data" in body && typeof (body as { data?: unknown }).data === "object" ? (body as { data: { markdown?: unknown } }).data.markdown : undefined;
  if (typeof markdown !== "string" || !markdown) throw new Error("Firecrawl returned no readable source content.");
  return markdown.slice(0, 100_000);
}
async function analyzeClaim(text: string, sourceContent?: string): Promise<Assessment> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  const input = ["Assess this claim for a rigorous fact-checking tool.", `Claim: ${text}`, sourceContent ? `Crawled source content:\n${sourceContent}` : "No crawled source was provided.", "Extract causal nodes and directed edges. Set grounded to true only when the crawled source directly supports that edge; otherwise set grounded to false. Confidence must be an integer percentage from 0 to 100, never a 0-to-1 decimal. Do not overstate confidence. Mark uncertain relationships conservatively when the source does not clearly establish them. Return only JSON matching the requested schema."].join("\n\n");
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "gpt-5.6-luna", store: false, input, reasoning: { effort: "low" }, max_output_tokens: 2000, text: { format: { type: "json_schema", name: "causal_assessment", strict: true, schema: outputSchema } } }) });
  if (!response.ok) throw new Error(`OpenAI analysis failed (${response.status}).`);
  const body: unknown = await response.json();
  const rawResponse = JSON.stringify(body).slice(0, 2000);
  if (typeof body !== "object" || body === null || Array.isArray(body)) throw new StructuredOutputError(rawResponse);
  const output = (body as { output?: unknown }).output;
  if (!Array.isArray(output)) throw new StructuredOutputError(rawResponse);
  const outputTypes = output.map((item) => typeof item === "object" && item !== null && !Array.isArray(item) && typeof (item as { type?: unknown }).type === "string" ? (item as { type: string }).type : "unknown");
  console.log("OpenAI output diagnostics", JSON.stringify({ outputLength: output.length, outputTypes }));
  const messageItem = output.find((item) => typeof item === "object" && item !== null && !Array.isArray(item) && (item as { type?: unknown }).type === "message");
  const content = messageItem && typeof messageItem === "object" && !Array.isArray(messageItem) ? (messageItem as { content?: unknown }).content : undefined;
  const textPart = Array.isArray(content) ? content.find((part) => typeof part === "object" && part !== null && !Array.isArray(part) && (part as { type?: unknown }).type === "output_text" && typeof (part as { text?: unknown }).text === "string") : undefined;
  if (!textPart || typeof textPart !== "object" || Array.isArray(textPart) || typeof (textPart as { text?: unknown }).text !== "string") throw new StructuredOutputError(rawResponse);
  try {
    return parseAssessment(JSON.parse((textPart as { text: string }).text));
  } catch {
    throw new StructuredOutputError(rawResponse);
  }
}
export const submitClaim = action({
  args: { text: v.string(), source: v.optional(v.string()) }, returns: v.id("claims"),
  handler: async (ctx, args): Promise<Id<"claims">> => {
    const text = args.text.trim();
    if (text.length < 12 || text.length > 800) throw new Error("Enter a claim between 12 and 800 characters.");
    const source = args.source?.trim();
    if (source && source.length > 240) throw new Error("Source must be 240 characters or fewer.");
    const claimId: Id<"claims"> = await ctx.runMutation(internal.claims.createPending, { text, source: source || undefined });
    try {
      const assessment = await analyzeClaim(text, source ? await scrapeSource(source) : undefined);
      await ctx.runMutation(internal.claims.completeAnalysis, { claimId, ...assessment, causalStructure: { status: "complete", ...assessment.causalStructure } });
    } catch (cause) {
      const errorMessage = cause instanceof StructuredOutputError ? cause.rawResponse : message(cause);
      await ctx.runMutation(internal.claims.markError, { claimId, errorMessage });
    }
    return claimId;
  },
});
export const askSource = action({
  args: { claimId: v.id("claims"), recipient: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const claim = await ctx.runQuery(internal.claims.getClaim, { claimId: args.claimId });
    if (!claim) throw new Error("Claim not found.");

    const edges = claim.causalStructure.edges;
    const weakestEdge = edges.length
      ? [...edges].sort((a, b) => a.confidence - b.confidence)[0]
      : null;

    const questionBody = weakestEdge
      ? `I'm reviewing the claim: "${claim.text}"\n\nBased on your source, I have a question about one of the weaker links in the causal chain: the connection between "${weakestEdge.from}" and "${weakestEdge.to}" (currently assessed as ${weakestEdge.grounded ? "grounded but low-confidence" : "inferred, not directly stated"}).\n\nCould you clarify: ${weakestEdge.rationale}\n\nThanks for your time.`
      : `I'm reviewing the claim: "${claim.text}"\n\nI'd like to better understand the study design and evidence behind this claim. Could you share more detail on the methodology used?\n\nThanks for your time.`;

    const apiKey = process.env.AGENTMAIL_API_KEY;
    if (!apiKey) throw new Error("AGENTMAIL_API_KEY is not configured.");

    const response = await fetch(
      "https://api.agentmail.to/v0/inboxes/causal-check@agentmail.to/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: args.recipient,
          subject: `Clarifying question: "${claim.text.slice(0, 60)}${claim.text.length > 60 ? "..." : ""}"`,
          text: questionBody,
        }),
      }
    );

    if (!response.ok) {
      await ctx.runMutation(internal.claims.setAgentMailStatus, {
        claimId: args.claimId,
        status: "error",
        recipient: args.recipient,
      });
      throw new Error(`AgentMail send failed (${response.status}).`);
    }

    await ctx.runMutation(internal.claims.setAgentMailStatus, {
      claimId: args.claimId,
      status: "sent",
      recipient: args.recipient,
    });
    return null;
  },
});
