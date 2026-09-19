# Causal Check

**Is that a cause, or just a coincidence?**

🔗 **[Live app: admired-fennec-408.convex.site](https://admired-fennec-408.convex.site)**



A live causal-reasoning checker for viral science and health claims. Paste a claim, and optionally a source, and Causal Check extracts the underlying causal structure (treatment, outcome, confounders, colliders, mediators) as an interactive diagram, clearly distinguishing evidence that's grounded in the source from reasoning that's merely inferred.

Built for the [Convex All Gas Hackathon](https://www.convex.dev/hackathons/all-gas).

## The problem

Every week, a claim like "coffee reduces dementia risk" or "screen time causes depression" goes viral, and most readers, including many journalists, have no easy way to tell whether that's a real causal finding or a confounded correlation. Causal Check applies real causal-inference reasoning (confounders, colliders, mediators, grounding) to make that distinction visible and legible, instead of just summarizing a headline.

## What it does

1. You submit a claim, optionally with a source URL.
2. Firecrawl crawls the source in real time, pulling actual page content, not just a snippet.
3. OpenAI extracts the claim's causal structure as strict, schema-validated JSON: nodes (treatment, outcome, confounder, collider, mediator) and directed edges, each with a confidence score and a grounding flag indicating whether the source actually supports that link or it is inferred.
4. A custom SVG diagram renders that structure live, color-coded by node type, with solid versus dashed edges for grounded versus inferred connections. Tap or click any node or edge to see the full reasoning behind it.
5. Convex Vector Search embeds the claim and checks it against every prior claim in the database, surfacing semantically similar past checks even when worded completely differently.
6. AgentMail can send a real, claim-specific clarifying email, auto-composed around the weakest link in the extracted causal chain, to a recipient you choose.

Every result is stored and streamed live via Convex, so the Recent Checks board updates in real time as analyses complete.

## Tech stack

Backend: Convex, using actions, mutations, reactive queries, and vector search.
Causal reasoning: OpenAI, via structured JSON output using the Responses API.
Source retrieval: Firecrawl.
Outbound verification: AgentMail.
Frontend: React and Vite, with a hand-built SVG causal diagram rather than a graph library.

## Convex features used

Actions, specifically submitClaim and askSource, orchestrate external API calls without blocking the UI. Mutations handle pending to complete or error state transitions. Reactive queries power the live results feed. Vector Search runs over OpenAI embeddings for semantic, not keyword, similarity detection between claims. The full causal graph is schema-enforced structured data, validated end to end from the OpenAI response through to the rendered diagram.

## Running locally

Install dependencies with npm install. Start the Convex dev deployment with npx convex dev. Start the Vite frontend with npm run dev.

You will need three environment variables set in your Convex deployment, under Dashboard, Settings, Environment Variables: OPENAI_API_KEY, FIRECRAWL_API_KEY, and AGENTMAIL_API_KEY.

## Project structure

Inside convex: schema.ts defines the data model, including the causal graph shape and vector index. claims.ts contains queries and mutations. claimsActions.ts orchestrates Firecrawl, OpenAI, and AgentMail.

Inside src: App.tsx is the main UI. CausalGraph.tsx is the SVG causal diagram component. AskSourceBlock.tsx is the AgentMail clarifying-question UI. ExampleCard.tsx is the illustrative worked example shown on first load.

## Notes on rigor

Confidence and grounding are never conflated. The model is explicitly instructed not to overstate certainty, and every inferred, non-grounded edge is visually distinct from one directly supported by crawled source content. This is an evidence-reading aid, not a substitute for reading the underlying research.

## Hackathon build log

See hackathon.md in this repository for the full development log, including tooling disclosure and Convex and sponsor integration details.
