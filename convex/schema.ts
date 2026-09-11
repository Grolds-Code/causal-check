import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const verdict = v.union(v.literal("causal"), v.literal("correlation"), v.literal("insufficient"), v.literal("mixed"));
const causalStructure = v.object({
  status: v.union(v.literal("pending"), v.literal("complete"), v.literal("error")),
  nodes: v.array(v.object({
    id: v.string(), label: v.string(),
    type: v.union(v.literal("treatment"), v.literal("outcome"), v.literal("confounder"), v.literal("collider"), v.literal("mediator")),
  })),
  edges: v.array(v.object({
    from: v.string(), to: v.string(), confidence: v.number(), rationale: v.string(), grounded: v.boolean(),
  })),
  errorMessage: v.optional(v.string()),
});

export default defineSchema({
  claims: defineTable({
    text: v.string(), source: v.optional(v.string()), verdict, confidence: v.number(),
    summary: v.string(), studyDesign: v.string(), causalPathway: v.string(),
    evidence: v.array(v.string()), caveats: v.array(v.string()), causalStructure, createdAt: v.number(),
    agentMailStatus: v.optional(v.union(v.literal("sent"), v.literal("error"))),
    agentMailRecipient: v.optional(v.string()),
    agentMailSentAt: v.optional(v.number()),
  }).index("by_created_at", ["createdAt"]),
});
