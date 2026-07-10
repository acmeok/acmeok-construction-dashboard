import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getNotes, addNote } from '../api/dashboardApi'
import { Loader } from './Loader'

export function NotesThread({ taskId }) {
  const { getToken } = useAuth()
  const [notes, setNotes] = useState(null)
  const [error, setError] = useState(null)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    setError(null)
    try {
      const token = await getToken()
      const result = await getNotes(token, taskId)
      setNotes(result.notes)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const token = await getToken()
      await addNote(token, taskId, text.trim())
      setText('')
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="notes-thread">
      <form className="notes-thread__form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a note..."
          aria-label="Add a note"
        />
        <button type="submit" disabled={submitting || !text.trim()}>
          Add Note
        </button>
      </form>

      {error && <p className="state-message state-message--error">{error}</p>}

      {notes === null ? (
        <Loader label="Loading notes..." size="inline" />
      ) : notes.length === 0 ? (
        <p className="state-message">No notes yet.</p>
      ) : (
        <ul className="notes-thread__list">
          {notes.map((note, i) => (
            <li key={i} className="notes-thread__item">
              <div className="notes-thread__meta">
                <strong>{note.authorName}</strong>
                <span>{note.timestamp ? new Date(note.timestamp).toLocaleString() : ''}</span>
              </div>
              <p>{note.text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
