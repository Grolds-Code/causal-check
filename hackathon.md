# Hackathon log

- **Project:** Causal Check
- **Event:** Convex All Gas Hackathon
- **What it does:** A live causal-reasoning checker for viral science and health claims. Users paste a claim, optionally with a source, and the app extracts the underlying causal structure as an interactive DAG (directed acyclic graph): treatment, outcome, confounders, colliders, and mediators, visually distinguishing evidence that is *grounded* in the crawled source from reasoning that is merely *inferred*. Every completed check can trigger a real clarifying question emailed to a source or reviewer, and semantically similar past claims are surfaced automatically through vector search.
- **Live app:** [fill in after deployment]
- **Repo:** https://github.com/Grolds-Code/causal-check
- **Convex deployment:** production (deployed via @convex-dev/static-hosting)

## Why this project stands out

- **The DAG is the centerpiece, not decoration.** Rather than just outputting a text verdict, the app renders the actual causal structure it inferred: a hand-built, responsive SVG diagram with color-coded node types (treatment, outcome, confounder, collider, mediator), solid versus dashed edges for grounded versus inferred claims, and tap or click to inspect the reasoning behind every node and edge. This makes the model's reasoning auditable, not just asserted.
- **Genuine causal-inference rigor, not a fact-checking wrapper.** The model is explicitly instructed never to overstate confidence, and every claimed causal link is separately flagged as grounded (directly supported by the crawled source) or inferred (plausible but not established), a distinction most AI fact-checkers collapse into a single confidence score.
- **All three sponsor tools do real, load-bearing work**, not decorative integration. Firecrawl retrieves actual source content, OpenAI performs structured causal extraction and generates embeddings, and AgentMail sends genuinely content-aware outbound emails built from the specific weakest link in each claim's causal chain.
- **Convex Vector Search adds a layer most entrants will not touch.** Every claim is embedded and checked against prior claims for semantic similarity, not keyword matching, surfacing related past checks even when worded completely differently and demonstrating a Convex capability well beyond basic CRUD.
- **Built for real people, on a real problem.** Viral health and science misinformation is a universal, everyday pain point, not a niche or a developer tool.

## Convex features used
- **Actions** (`submitClaim`, `askSource`) orchestrate external API calls (Firecrawl, OpenAI, AgentMail) without blocking the UI.
- **Mutations** handle pending, complete, and error state transitions, so the UI updates live as analysis progresses.
- **Reactive queries** (`listRecent`) power the live "Recent checks" feed with zero manual polling.
- **Vector Search**: claim text is embedded via OpenAI and indexed in Convex; every new claim is checked against prior claims for semantic similarity.
- **Schema-enforced structured data** for the causal DAG (nodes and edges with type, confidence, and grounding), validated end to end from OpenAI's structured output through to the rendered diagram.

## Sponsor stack: how each is used
- **OpenAI:** extracts causal structure (nodes, edges, confidence, grounding) as strict structured JSON from the claim and crawled source, using a reasoning model explicitly instructed against overconfidence. Also generates the claim's text embedding for similarity search.
- **Firecrawl:** crawls the user-provided source URL in real time to ground the causal analysis in actual page content, rather than the claim's wording alone.
- **AgentMail:** sends a genuine, content-aware clarifying email, auto-composed around the weakest link in the extracted causal chain, to a recipient the user specifies. This demonstrates a real agentic action, not a static inbox.

## Tooling disclosure
The project was scaffolded and initially built using Codex CLI with the official Convex plugin (project setup, initial schema, first DAG visualization pass, initial AgentMail wiring). After exhausting the free-tier Codex usage allowance mid-build, development continued manually in VS Code, with each change designed and reviewed turn by turn through an AI coding assistant in chat, then applied by hand. The app is deployed to `convex.site`, not `chatgpt.site`, so this fully satisfies the hackathon's Convex-as-backend requirement without relying on Codex for the deployment path itself.

## Started
2026-09-08T12:42:49Z

## Last updated
[fill in with today's date before final submission]

## Log
- Scaffolded React and Convex app via Codex and the official Convex plugin.
- Built core claim-checking pipeline: Firecrawl scrape, then OpenAI structured causal extraction, then live Convex state updates.
- Built custom SVG-based causal DAG visualization with responsive layout, tap-to-inspect nodes and edges, and grounded versus inferred visual distinction.
- Added AgentMail integration for sending real clarifying questions based on the weakest causal link.
- Added OpenAI-embedding-based Convex Vector Search to detect and surface semantically similar past claims.
- Added delete confirmation, mobile-responsive layout, and an illustrative example panel for first-time visitors.
- Deployed to Convex production via @convex-dev/static-hosting.
