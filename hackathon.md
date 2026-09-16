# Hackathon log

- **Project:** Causal Check
- **Event:** Convex All Gas Hackathon
- **What it does:** A live causal-reasoning checker for viral science and health claims. Users paste a claim (and optionally a source), and the app extracts the underlying causal structure — treatment, outcome, confounders, colliders, mediators — as an interactive diagram, distinguishing evidence that's *grounded* in the crawled source from reasoning that's merely *inferred*. Every completed check can trigger a real clarifying question emailed to a source/reviewer, and semantically similar past claims are surfaced automatically.
- **Live app:** [to be filled in after deployment]
- **Repo:** https://github.com/Grolds-Code/causal-check
- **Convex deployment:** production (deployed via @convex-dev/static-hosting)

## Convex features used
- **Actions** (`submitClaim`, `askSource`) orchestrating external API calls (Firecrawl, OpenAI, AgentMail) without blocking the UI
- **Mutations** for pending/complete/error state transitions, so the UI updates live as analysis progresses
- **Reactive queries** (`listRecent`) powering the live "Recent checks" feed with zero manual polling
- **Vector Search** — claim text is embedded via OpenAI and indexed in Convex; every new claim is checked against prior claims for semantic similarity (not just keyword matching), surfacing related past checks even when worded completely differently
- **Schema-enforced structured data** for the causal graph (nodes/edges with type, confidence, and grounding), validated end-to-end from OpenAI's structured output through to the rendered diagram

## Sponsor stack — how each is used
- **OpenAI**: extracts causal structure (nodes, edges, confidence, grounding) as strict structured JSON from the claim + crawled source, using a reasoning model with explicit instructions against overconfidence; also generates the claim's text embedding for similarity search
- **Firecrawl**: crawls the user-provided source URL in real time to ground the causal analysis in actual page content, rather than the claim's wording alone
- **AgentMail**: sends a genuine, content-aware clarifying email — auto-composed around the weakest link in the extracted causal chain — to a recipient the user specifies, demonstrating a real agentic action, not a static inbox

## Tooling disclosure
The project was scaffolded and initially built using Codex CLI with the official Convex plugin (project setup, initial schema, first DAG visualization pass, initial AgentMail wiring). After exhausting the free-tier Codex usage allowance mid-build, development continued manually in VS Code, with each change designed and reviewed turn-by-turn through an AI coding assistant in chat, then applied by hand. The app is deployed to `convex.site` (not `chatgpt.site`), so this fully satisfies the hackathon's Convex-as-backend requirement without relying on Codex for the deployment path itself.

## Started
2026-09-08T12:42:49Z

## Last updated
[update this to today's date when you finalize before submission]

## Log
- Scaffolded React + Convex app via Codex and the official Convex plugin
- Built core claim-checking pipeline: Firecrawl scrape → OpenAI structured causal extraction → live Convex state updates
- Built custom SVG-based causal DAG visualization with responsive layout, tap-to-inspect nodes/edges, and grounded-vs-inferred visual distinction
- Added AgentMail integration for sending real clarifying questions based on the weakest causal link
- Added OpenAI-embedding-based Convex Vector Search to detect and surface semantically similar past claims
- Added delete confirmation, mobile-responsive layout, and an illustrative example panel for first-time visitors
- Deployed to Convex production via @convex-dev/static-hosting
