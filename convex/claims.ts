import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const verdict = v.union(v.literal("causal"), v.literal("correlation"), v.literal("insufficient"), v.literal("mixed"));

function assess(text: string) {
  const value = text.toLowerCase();
  const experimental = /randomi[sz]ed|randomly assigned|controlled trial|experiment/.test(value);
  const observational = /associated|association|correlat|linked to|predicts/.test(value);
  const causalLanguage = /causes?|leads? to|results? in|increases?|reduces?|prevents?/.test(value);
  if (experimental) return { verdict: "causal" as const, confidence: 82, studyDesign: "Experimental evidence mentioned", summary: "The claim names an experimental design, which can support a causal conclusion when the study was well conducted.", causalPathway: "Random assignment helps balance confounders before the exposure is applied.", evidence: ["Look for random assignment and a suitable comparison group.", "Check whether outcomes and attrition were measured consistently."], caveats: ["A single trial may not generalize to every population.", "The wording alone cannot verify the underlying study quality."] };
  if (observational && !causalLanguage) return { verdict: "correlation" as const, confidence: 88, studyDesign: "Observational association", summary: "This wording describes a relationship, not proof that one factor changes the other.", causalPathway: "A third factor, reverse causation, or selection can create an observed association.", evidence: ["Association is not an intervention.", "Ask whether likely confounders were measured and adjusted for."], caveats: ["Adjustment reduces but does not eliminate unmeasured confounding.", "The effect may differ across people or settings."] };
  if (causalLanguage) return { verdict: "insufficient" as const, confidence: 74, studyDesign: "Design not specified", summary: "The claim makes a causal leap, but it does not identify evidence that rules out competing explanations.", causalPathway: "A causal pathway needs a plausible mechanism and a design that separates cause from correlation.", evidence: ["Ask what comparison group or natural experiment supports the claim.", "Look for temporality: did the proposed cause happen before the outcome?"], caveats: ["Headline language often overstates the evidence.", "Mechanistic plausibility alone is not causal proof."] };
  return { verdict: "mixed" as const, confidence: 62, studyDesign: "Evidence type unclear", summary: "There is not enough detail in this sentence to determine whether the conclusion is causal or correlational.", causalPathway: "The proposed exposure, outcome, comparison, and timing need to be specified.", evidence: ["Identify the study design and comparison group.", "Separate the observation from the conclusion it is being used to support."], caveats: ["Missing context can change the interpretation substantially."] };
}

export const listRecent = query({
  args: {},
  returns: v.array(v.object({ _id: v.id("claims"), _creationTime: v.number(), text: v.string(), source: v.optional(v.string()), verdict, confidence: v.number(), summary: v.string(), studyDesign: v.string(), causalPathway: v.string(), evidence: v.array(v.string()), caveats: v.array(v.string()), createdAt: v.number() })),
  handler: async (ctx) => await ctx.db.query("claims").withIndex("by_created_at").order("desc").take(12),
});

export const check = mutation({
  args: { text: v.string(), source: v.optional(v.string()) }, returns: v.id("claims"),
  handler: async (ctx, args) => {
    const text = args.text.trim();
    if (text.length < 12 || text.length > 800) throw new Error("Enter a claim between 12 and 800 characters.");
    const source = args.source?.trim();
    if (source && source.length > 240) throw new Error("Source must be 240 characters or fewer.");
    return await ctx.db.insert("claims", { text, source: source || undefined, ...assess(text), createdAt: Date.now() });
  },
});
