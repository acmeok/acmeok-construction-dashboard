import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useOutletContext } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useAuth } from '../auth/AuthContext'
import { acknowledgeTask, completeTask } from '../api/dashboardApi'
import { assigneeStatusLabel, isOverdue } from '../taskStatus'
import { NotesThread } from '../components/NotesThread'
import { Loader } from '../components/Loader'

gsap.registerPlugin(ScrollTrigger)

export function TaskDetailPage() {
  const { id } = useParams()
  const { profile } = useAuth()
  const { data, loading, error, refetch } = useOutletContext()
  const [actionError, setActionError] = useState(null)
  const [actingOn, setActingOn] = useState(null) // taskId currently submitting
  const detailRef = useRef(null)

  useEffect(() => {
    if (!detailRef.current) return
    const sections = detailRef.current.querySelectorAll('section, details')
    if (!sections.length) return

    const triggers = Array.from(sections).map((section) =>
      gsap.from(section, {
        opacity: 0,
        y: 20,
        duration: 0.35,
        ease: 'power2.out',
        scrollTrigger: { trigger: section, start: 'top 92%' },
      })
    )

    return () => triggers.forEach((t) => t.scrollTrigger?.kill())
  }, [id])

  if (loading) return <Loader label="Loading task..." />
  if (error) return <p className="state-message state-message--error">{error}</p>

  const task = data.tasks.find((t) => t.id === id)
  if (!task) return <p className="state-message">Task not found.</p>

  const overdue = isOverdue(task)

  async function handleAction(assignee, action) {
    setActingOn(assignee.taskId)
    setActionError(null)
    try {
      if (action === 'acknowledge') await acknowledgeTask(assignee.taskId)
      else await completeTask(assignee.taskId)
      await refetch()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setActingOn(null)
    }
  }

  return (
    <div className="task-detail" ref={detailRef}>
      <Link to="/" className="task-detail__back">
        &larr; Back to tasks
      </Link>

      <section className="task-detail__header">
        <h1>{task.label || '(no description)'}</h1>
        <p>Assigned by: {task.assignedByName}</p>
        <p>Assigned to: {task.assignees.map((a) => a.name).join(', ')}</p>
        <p>
          Deadline: {task.deadline || 'Not specified'}
          {overdue && <span className="task-card__overdue"> &middot; OVERDUE</span>}
        </p>
        <p>Created: {task.timestamp ? new Date(task.timestamp).toLocaleString() : 'Unknown'}</p>
      </section>

      <section className="task-detail__status">
        <h2>Status</h2>
        {actionError && <p className="state-message state-message--error">{actionError}</p>}
        {task.assignees.map((assignee) => {
          const label = assigneeStatusLabel(assignee)
          const isMe = assignee.email.toLowerCase() === profile.email.toLowerCase()
          const busy = actingOn === assignee.taskId
          return (
            <div key={assignee.taskId} className="status-row">
              <span>{assignee.name}</span>
              <span className={`status-badge status-badge--${label.replace(/\s+/g, '-').toLowerCase()}`}>
                {label}
              </span>
              {isMe && label === 'Not Acknowledged' && (
                <button type="button" disabled={busy} onClick={() => handleAction(assignee, 'acknowledge')}>
                  Acknowledge
                </button>
              )}
              {isMe && label === 'Acknowledged' && (
                <button type="button" disabled={busy} onClick={() => handleAction(assignee, 'complete')}>
                  Complete
                </button>
              )}
            </div>
          )
        })}
      </section>

      {task.audioUrl && (
        <section className="task-detail__audio">
          <h2>Voice recording</h2>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio controls src={task.audioUrl} />
        </section>
      )}

      <section className="task-detail__notes">
        <h2>Notes</h2>
        <NotesThread taskId={task.id} />
      </section>

      {task.originalTranscript && (
        <details className="task-detail__transcript">
          <summary>Original transcript</summary>
          <p>{task.originalTranscript}</p>
        </details>
      )}
    </div>
  )
}
