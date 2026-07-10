import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'

const WEBHOOK_URL = `${import.meta.env.VITE_N8N_BASE_URL}/${import.meta.env.VITE_VOICE_APP_WEBHOOK_PATH}`
const WEBHOOK_SECRET = import.meta.env.VITE_VOICE_APP_SECRET

export function AssignTaskForm({ onSuccess }) {
  const { profile } = useAuth()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return
    setSubmitting(true)
    setError(null)
    setSuccess(false)
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-secret-token': WEBHOOK_SECRET,
        },
        body: JSON.stringify({
          sender_name: profile.name,
          sender_email: profile.email,
          task_text: text.trim(),
        }),
      })
      if (!response.ok) throw new Error('Submission failed — please try again.')
      setText('')
      setSuccess(true)
      setOpen(false)
      if (onSuccess) onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="assign-task-form">
      {!open ? (
        <button
          type="button"
          className="assign-task-form__toggle"
          onClick={() => { setOpen(true); setSuccess(false) }}
        >
          + Assign Task
        </button>
      ) : (
        <form className="assign-task-form__body" onSubmit={handleSubmit}>
          <p className="assign-task-form__hint">
            Type the assignment as you would say it — e.g.{' '}
            <em>"Assign to Charles — pour the footing at Star Spencer by Friday."</em>
          </p>
          <textarea
            className="assign-task-form__textarea"
            rows={4}
            placeholder="Describe the task and who it's for…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={submitting}
            autoFocus
          />
          {error && <p className="state-message state-message--error">{error}</p>}
          <div className="assign-task-form__actions">
            <button type="submit" disabled={submitting || !text.trim()}>
              {submitting ? 'Sending…' : 'Send Task'}
            </button>
            <button
              type="button"
              className="btn--secondary"
              onClick={() => { setOpen(false); setText(''); setError(null) }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {success && !open && (
        <p className="state-message state-message--success">
          Task sent — it will appear once processed.
        </p>
      )}
    </div>
  )
}
