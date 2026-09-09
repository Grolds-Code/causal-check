import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'
import './App.css'

const examples = [
  'Drinking coffee causes longer life.',
  'Daily walking is associated with lower depression scores.',
  'A randomized controlled trial found that air filters reduce indoor particles.',
]

function App() {
  const [text, setText] = useState(examples[0])
  const [source, setSource] = useState('')
  const [error, setError] = useState('')
  const check = useMutation(api.claims.check)
  const claims = useQuery(api.claims.listRecent)

  async function submit(event: FormEvent) {
    event.preventDefault(); setError('')
    try { await check({ text, source: source || undefined }); setSource('') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to check this claim.') }
  }

  return <main>
    <header><p className="eyebrow">CAUSAL CHECK</p><h1>Does the evidence show cause — or only company?</h1><p className="intro">Paste a viral science claim for a fast, structured causal reasoning check. This is an evidence-reading aid, not a substitute for the original research.</p></header>
    <section className="checker" aria-labelledby="checker-title">
      <div><h2 id="checker-title">Check a claim</h2><p>State the claim exactly as you saw it. Add a source if you have one.</p></div>
      <form onSubmit={submit}>
        <label htmlFor="claim">Claim</label><textarea id="claim" value={text} onChange={(event) => setText(event.target.value)} maxLength={800} required />
        <label htmlFor="source">Source <span>(optional)</span></label><input id="source" value={source} onChange={(event) => setSource(event.target.value)} maxLength={240} placeholder="Article, study, or post" />
        {error && <p className="error" role="alert">{error}</p>}<button type="submit">Check causal strength <span>→</span></button>
      </form>
      <div className="examples"><span>Try an example</span>{examples.map((example) => <button type="button" key={example} onClick={() => setText(example)}>{example}</button>)}</div>
    </section>
    <section className="results" aria-live="polite"><div className="section-heading"><h2>Recent checks</h2><p>Live results stored in Convex</p></div>
      {!claims && <p className="loading">Loading the evidence board…</p>}{claims?.length === 0 && <p className="loading">Your first checked claim will appear here.</p>}
      <div className="claim-grid">{claims?.map((claim: any) => <article className="claim-card" key={claim._id}>
        <div className="card-top"><span className={`verdict ${claim.verdict}`}>{claim.verdict}</span><strong>{claim.confidence}% confidence</strong></div>
        <blockquote>“{claim.text}”</blockquote><p>{claim.summary}</p>
        <dl><div><dt>Evidence type</dt><dd>{claim.studyDesign}</dd></div><div><dt>Key question</dt><dd>{claim.evidence[0]}</dd></div></dl><p className="caveat"><b>Watch for:</b> {claim.caveats[0]}</p>
      </article>)}</div>
    </section>
  </main>
}
export default App
