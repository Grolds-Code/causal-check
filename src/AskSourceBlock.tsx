import { useState } from 'react'
import { useAction } from 'convex/react'
import { api } from '../convex/_generated/api'
import type { Id } from '../convex/_generated/dataModel'

interface AskSourceBlockProps {
  claimId: Id<'claims'>
  lastSentTo?: string
}

export default function AskSourceBlock({ claimId, lastSentTo }: AskSourceBlockProps) {
  const askSource = useAction(api.claimsActions.askSource)
  const [isOpen, setIsOpen] = useState(false)
  const [recipient, setRecipient] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [justSentTo, setJustSentTo] = useState('')

  async function handleSend() {
    if (!recipient.trim()) return
    setSending(true)
    setError('')
    try {
      await askSource({ claimId, recipient: recipient.trim() })
      setJustSentTo(recipient.trim())
      setIsOpen(false)
      setRecipient('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to send the question.')
    } finally {
      setSending(false)
    }
  }

  const confirmedRecipient = justSentTo || lastSentTo

  return (
    <div className="ask-source-block">
      {!isOpen ? (
        <>
          <p className="ask-source-hint">Click to ask the source a clarifying question about its weakest causal link</p>
          <button type="button" className="ask-source-button" onClick={() => setIsOpen(true)}>
            Ask the source →
          </button>
        </>
      ) : (
        <div className="ask-source-form">
          <label htmlFor={`recipient-${claimId}`}>Send the question to</label>
          <input
            id={`recipient-${claimId}`}
            type="email"
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            placeholder="you@example.com"
            autoFocus
          />
          <div className="ask-source-form-buttons">
            <button type="button" onClick={handleSend} disabled={sending || !recipient.trim()}>
              {sending ? 'Sending…' : 'Send'}
            </button>
            <button type="button" className="secondary" onClick={() => { setIsOpen(false); setError('') }}>
              Cancel
            </button>
          </div>
          {error && <p className="ask-source-error">{error}</p>}
        </div>
      )}
      {confirmedRecipient && !isOpen && (
        <p className="agentmail-status">✓ Last asked: {confirmedRecipient}</p>
      )}
    </div>
  )
}
