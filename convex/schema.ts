import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const verdict = v.union(v.literal("causal"), v.literal("correlation"), v.literal("insufficient"), v.literal("mixed"));

export default defineSchema({
  claims: defineTable({
    text: v.string(), source: v.optional(v.string()), verdict, confidence: v.number(),
    summary: v.string(), studyDesign: v.string(), causalPathway: v.string(),
    evidence: v.array(v.string()), caveats: v.array(v.string()), createdAt: v.number(),
  }).index("by_created_at", ["createdAt"]),
});
