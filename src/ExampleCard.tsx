import CausalGraph from './CausalGraph'

const exampleData = {
  verdict: 'mixed' as const,
  confidence: 78,
  text: 'Regular meditation reduces symptoms of anxiety.',
  summary:
    'The claim is plausible and supported by a growing body of evidence, but the crawled review summarizes mixed-quality studies rather than a single definitive trial — so the causal strength should be read as suggestive, not conclusive.',
  causalStructure: {
    nodes: [
      { id: 'meditation', label: 'Regular meditation practice', type: 'treatment' as const },
      { id: 'cortisol', label: 'Reduced cortisol response', type: 'mediator' as const },
      { id: 'anxiety', label: 'Lower anxiety symptoms', type: 'outcome' as const },
      { id: 'motivation', label: 'Pre-existing motivation to self-improve', type: 'confounder' as const },
    ],
    edges: [
      { from: 'meditation', to: 'cortisol', confidence: 74, rationale: 'The source cites physiological studies linking meditation practice to reduced cortisol reactivity.', grounded: true },
      { from: 'cortisol', to: 'anxiety', confidence: 68, rationale: 'Lower cortisol reactivity is associated with reduced anxiety symptoms in the cited literature, though the causal chain is not fully isolated.', grounded: true },
      { from: 'motivation', to: 'meditation', confidence: 55, rationale: 'People who already want to reduce their anxiety may be more likely to adopt meditation, which could inflate the observed association.', grounded: false },
      { from: 'motivation', to: 'anxiety', confidence: 50, rationale: 'The same underlying motivation to improve mental health could independently influence anxiety symptoms, not just through meditation.', grounded: false },
    ],
  },
  studyDesign: 'Narrative review summarizing multiple randomized and observational studies on mindfulness meditation.',
  evidence: 'Several cited trials used randomized designs, but pooled effect sizes vary widely across studies.',
  caveat: 'Self-selection into meditation practice is a plausible confounder the review does not fully control for.',
}

export default function ExampleCard() {
    return (
    <div className="example-showcase">
      <span className="example-badge">Illustrative example</span>
      <div className="example-showcase-grid">
        <div className="example-showcase-text">
          <div className="card-top">
            <span className={`verdict ${exampleData.verdict}`}>{exampleData.verdict}</span>
            <strong>{exampleData.confidence}% confidence</strong>
          </div>
          <blockquote>“{exampleData.text}”</blockquote>
          <p>{exampleData.summary}</p>
          <dl>
            <div><dt>Evidence type</dt><dd>{exampleData.studyDesign}</dd></div>
            <div><dt>Key question</dt><dd>{exampleData.evidence}</dd></div>
          </dl>
          <p className="caveat"><b>Watch for:</b> {exampleData.caveat}</p>
        </div>
        <div className="example-showcase-graph">
          <CausalGraph
            nodes={exampleData.causalStructure.nodes}
            edges={exampleData.causalStructure.edges}
            emptyMessage=""
          />
        </div>
      </div>
    </div>
  )
}
