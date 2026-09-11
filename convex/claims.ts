import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import schema from "./schema";

const verdict = v.union(v.literal("causal"), v.literal("correlation"), v.literal("insufficient"), v.literal("mixed"));
const causalNode = v.object({ id: v.string(), label: v.string(), type: v.union(v.literal("treatment"), v.literal("outcome"), v.literal("confounder"), v.literal("collider"), v.literal("mediator")) });
const causalEdge = v.object({ from: v.string(), to: v.string(), confidence: v.number(), rationale: v.string(), grounded: v.boolean() });
const causalStructure = v.object({ status: v.union(v.literal("pending"), v.literal("complete"), v.literal("error")), nodes: v.array(causalNode), edges: v.array(causalEdge), errorMessage: v.optional(v.string()) });

export const listRecent = query({
  args: {},
  returns: v.array(schema.doc("claims")),
  handler: async (ctx) => await ctx.db.query("claims").withIndex("by_created_at").order("desc").take(12),
});


export const createPending = internalMutation({
  args: { text: v.string(), source: v.optional(v.string()) }, returns: v.id("claims"),
  handler: async (ctx, args) => await ctx.db.insert("claims", {
    text: args.text, source: args.source, verdict: "insufficient", confidence: 0,
    summary: "Analysis pending.", studyDesign: "Pending analysis", causalPathway: "The causal structure is being extracted.",
    evidence: [], caveats: [], causalStructure: { status: "pending", nodes: [], edges: [] }, createdAt: Date.now(),
  }),
});

export const completeAnalysis = internalMutation({
  args: { claimId: v.id("claims"), verdict, confidence: v.number(), summary: v.string(), studyDesign: v.string(), causalPathway: v.string(), evidence: v.array(v.string()), caveats: v.array(v.string()), causalStructure },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.claimId, { verdict: args.verdict, confidence: args.confidence, summary: args.summary, studyDesign: args.studyDesign, causalPathway: args.causalPathway, evidence: args.evidence, caveats: args.caveats, causalStructure: args.causalStructure });
    return null;
  },
});

export const markError = internalMutation({
  args: { claimId: v.id("claims"), errorMessage: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.claimId, { causalStructure: { status: "error", nodes: [], edges: [], errorMessage: args.errorMessage } });
    return null;
  },
});

export const deleteClaim = mutation({
  args: { claimId: v.id("claims") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.claimId);
    return null;
  },
});

export const getClaim = internalQuery({
  args: { claimId: v.id("claims") },
  handler: async (ctx, args) => await ctx.db.get(args.claimId),
});

export const setAgentMailStatus = internalMutation({
  args: {
    claimId: v.id("claims"),
    status: v.union(v.literal("sent"), v.literal("error")),
    recipient: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.claimId, {
      agentMailStatus: args.status,
      agentMailRecipient: args.recipient,
      agentMailSentAt: Date.now(),
    });
  },
});
