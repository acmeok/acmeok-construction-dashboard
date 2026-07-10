import { useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { acknowledgeTask, completeTask, cancelTask, undoCompletion, reassignTask } from '../api/dashboardApi'
import { assigneeStatusLabel, isOverdue } from '../taskStatus'
import { parseChicagoTimestamp, formatDuration, formatDisplayTime } from '../timeUtils'

export function TaskCard({ task, onRefetch, roster = [] }) {
  const { profile, getToken } = useAuth()
  const [open, setOpen] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [actingOn, setActingOn] = useState(null)
  const [submittedIds, setSubmittedIds] = useState(new Set())
  const [noteTexts, setNoteTexts] = useState({})
  const [audioKey, setAudioKey] = useState(0)
  // Cancel UI state
  const [cancellingId, setCancellingId] = useState(null)
  const [cancelNotes, setCancelNotes] = useState({})
  // Reassign UI state
  const [reassigningId, setReassigningId] = useState(null)
  const [reassignEmails, setReassignEmails] = useState({})
  const cardRef = useRef(null)
  const overdue = isOverdue(task)

  const assignedAt = task.timestamp ? new Date(task.timestamp) : null
  const isVoiceTask = !!task.audioUrl
  const isAssigner = (task.assignedByEmail || '').toLowerCase() === (profile?.email || '').toLowerCase()

  const driveFileId = task.audioUrl
    ? (task.audioUrl.match(/[?&]id=([^&]+)/) || [])[1] ?? null
    : null

  function timings(assignee) {
    const ackedAt = parseChicagoTimestamp(assignee.acknowledgedAt)
    const doneAt = parseChicagoTimestamp(assignee.completedAt)
    return {
      assignToAck: assignedAt && ackedAt ? formatDuration(ackedAt - assignedAt) : null,
      ackToComplete: ackedAt && doneAt ? formatDuration(doneAt - ackedAt) : null,
      assignToComplete: assignedAt && doneAt ? formatDuration(doneAt - assignedAt) : null,
    }
  }

  async function handleAction(assignee, action) {
    setActingOn(assignee.taskId)
    setActionError(null)
    try {
      if (action === 'acknowledge') {
        await acknowledgeTask(assignee.taskId)
      } else {
        const note = noteTexts[assignee.taskId] || ''
        await completeTask(assignee.taskId, note)
        setSubmittedIds((prev) => new Set([...prev, assignee.taskId]))
      }
      await onRefetch()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setActingOn(null)
    }
  }

  async function handleCancel(assignee) {
    setActingOn(assignee.taskId)
    setActionError(null)
    try {
      const idToken = await getToken()
      await cancelTask(idToken, assignee.taskId, cancelNotes[assignee.taskId] || '')
      setCancellingId(null)
      await onRefetch()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setActingOn(null)
    }
  }

  async function handleUndo(assignee) {
    setActingOn(assignee.taskId)
    setActionError(null)
    try {
      const idToken = await getToken()
      await undoCompletion(idToken, assignee.taskId)
      setSubmittedIds((prev) => { const s = new Set(prev); s.delete(assignee.taskId); return s })
      await onRefetch()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setActingOn(null)
    }
  }

  async function handleReassign(assignee) {
    const newEmail = reassignEmails[assignee.taskId]
    if (!newEmail) return
    setActingOn(assignee.taskId)
    setActionError(null)
    try {
      const idToken = await getToken()
      await reassignTask(idToken, assignee.taskId, newEmail)
      setReassigningId(null)
      await onRefetch()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setActingOn(null)
    }
  }

  return (
    <div className={`task-card${open ? ' task-card--open' : ''}${overdue ? ' task-card--overdue' : ''}`} ref={cardRef}>

      {/* ── collapsed summary row ── */}
      <button type="button" className="task-card__summary" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <div className="task-card__summary-grid">
          <span className="task-card__label">
            {task.label || '(no description)'}
            <span className="task-card__task-id">
              #{task.assignees.map((a) => a.taskId).join(', ')}
            </span>
          </span>
          <span className="task-card__meta-item"><span className="task-card__field">BY</span> {task.assignedByName}</span>
          <span className="task-card__meta-item"><span className="task-card__field">TO</span> {task.assignees.map((a) => a.name).join(', ')}</span>
          <span className="task-card__meta-item">
            <span className="task-card__field">CREATED</span>{' '}
            {assignedAt ? formatDisplayTime(assignedAt) : '—'}
          </span>
          <span className="task-card__meta-item">
            <span className="task-card__field">DEADLINE</span>{' '}
            {task.deadline || 'Not specified'}
            {overdue && <span className="task-card__overdue-badge"> OVERDUE</span>}
          </span>
        </div>
        {!open && (
          <div className="task-card__badges">
            {task.assignees.map((a) => (
              <span key={a.taskId} className={`status-badge status-badge--${assigneeStatusLabel(a).replace(/\s+/g, '-').toLowerCase()}`}>
                {a.name}: {assigneeStatusLabel(a)}
              </span>
            ))}
          </div>
        )}
        <span className="task-card__chevron" aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>

      {/* ── expanded detail ── */}
      {open && (
        <div className="task-card__detail">

          {/* Status + actions per assignee */}
          <section className="task-card__section">
            <h3 className="task-card__section-title">Status</h3>
            {actionError && <p className="state-message state-message--error">{actionError}</p>}
            {task.assignees.map((assignee) => {
              const label = assigneeStatusLabel(assignee)
              const isCancelled = assignee.cancelled === 'Yes'
              const isMe = assignee.email.toLowerCase() === profile.email.toLowerCase()
              const busy = actingOn === assignee.taskId
              const alreadySubmitted = submittedIds.has(assignee.taskId)
              const t = timings(assignee)
              const ackedDate = parseChicagoTimestamp(assignee.acknowledgedAt)
              const doneDate = parseChicagoTimestamp(assignee.completedAt)
              const cancelledDate = parseChicagoTimestamp(assignee.cancelledAt)

              const canCancel = !isCancelled && (isMe || isAssigner)
              const canUndo = !isCancelled && isMe && label === 'Completed' && !alreadySubmitted
              const canReassign = !isCancelled && isAssigner

              const showingCancelUI = cancellingId === assignee.taskId
              const showingReassignUI = reassigningId === assignee.taskId

              return (
                <div key={assignee.taskId} className={`status-row${isCancelled ? ' status-row--cancelled' : ''}`}>
                  <div className="status-row__info">
                    <span className="status-row__name">{assignee.name}</span>
                    <span className={`status-badge status-badge--${label.replace(/\s+/g, '-').toLowerCase()}`}>
                      {label}
                    </span>
                    {ackedDate && !isCancelled && (
                      <span className="status-row__ts">Acknowledged: {formatDisplayTime(ackedDate)}</span>
                    )}
                    {doneDate && !isCancelled && (
                      <span className="status-row__ts">Completed: {formatDisplayTime(doneDate)}</span>
                    )}
                    {assignee.completionNote && !isCancelled && (
                      <span className="status-row__note">Note: {assignee.completionNote}</span>
                    )}
                    {isCancelled && (
                      <span className="status-row__cancel-info">
                        Cancelled by {assignee.cancelledBy || 'unknown'}
                        {cancelledDate ? ` · ${formatDisplayTime(cancelledDate)}` : ''}
                        {assignee.cancellationNote ? ` · "${assignee.cancellationNote}"` : ''}
                      </span>
                    )}
                    {!isCancelled && (t.assignToAck || t.ackToComplete || t.assignToComplete) && (
                      <div className="status-row__timings">
                        {t.assignToAck && <span>Assign → Ack: <strong>{t.assignToAck}</strong></span>}
                        {t.ackToComplete && <span>Ack → Done: <strong>{t.ackToComplete}</strong></span>}
                        {t.assignToComplete && <span>Assign → Done: <strong>{t.assignToComplete}</strong></span>}
                      </div>
                    )}
                  </div>

                  {/* Regular actions (acknowledge / complete) */}
                  {isMe && !isCancelled && (
                    <div className="status-row__actions">
                      <button
                        type="button"
                        disabled={busy || label !== 'Not Acknowledged'}
                        onClick={() => handleAction(assignee, 'acknowledge')}
                      >
                        {busy && label === 'Not Acknowledged' ? 'Acknowledging…' : 'Acknowledge'}
                      </button>
                      <div className="status-row__complete-group">
                        <textarea
                          className="status-row__note-input"
                          placeholder="Completion note (optional)…"
                          value={noteTexts[assignee.taskId] || ''}
                          onChange={(e) => setNoteTexts((p) => ({ ...p, [assignee.taskId]: e.target.value }))}
                          disabled={label === 'Not Acknowledged' || label === 'Completed' || alreadySubmitted}
                          rows={2}
                        />
                        <button
                          type="button"
                          disabled={label === 'Not Acknowledged' || label === 'Completed' || alreadySubmitted || busy}
                          onClick={() => handleAction(assignee, 'complete')}
                        >
                          {busy && label === 'Acknowledged' ? 'Completing…' : 'Complete'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Undo completion */}
                  {canUndo && (
                    <div className="status-row__secondary-actions">
                      <button
                        type="button"
                        className="action-btn action-btn--undo"
                        disabled={busy}
                        onClick={() => handleUndo(assignee)}
                      >
                        {busy ? 'Undoing…' : '↺ Undo Completion'}
                      </button>
                    </div>
                  )}

                  {/* Cancel task UI */}
                  {canCancel && !showingReassignUI && (
                    <div className="status-row__secondary-actions">
                      {showingCancelUI ? (
                        <div className="status-row__cancel-form">
                          <textarea
                            className="status-row__note-input"
                            placeholder="Reason for cancellation (optional)…"
                            value={cancelNotes[assignee.taskId] || ''}
                            onChange={(e) => setCancelNotes((p) => ({ ...p, [assignee.taskId]: e.target.value }))}
                            rows={2}
                          />
                          <div className="status-row__cancel-form-btns">
                            <button
                              type="button"
                              className="action-btn action-btn--cancel-confirm"
                              disabled={busy}
                              onClick={() => handleCancel(assignee)}
                            >
                              {busy ? 'Cancelling…' : 'Confirm Cancel'}
                            </button>
                            <button
                              type="button"
                              className="action-btn action-btn--secondary"
                              onClick={() => setCancellingId(null)}
                            >
                              Back
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="action-btn action-btn--cancel"
                          onClick={() => { setCancellingId(assignee.taskId); setReassigningId(null) }}
                        >
                          ✕ Cancel Task
                        </button>
                      )}
                    </div>
                  )}

                  {/* Reassign UI */}
                  {canReassign && !showingCancelUI && (
                    <div className="status-row__secondary-actions">
                      {showingReassignUI ? (
                        <div className="status-row__reassign-form">
                          <select
                            className="status-row__reassign-select"
                            value={reassignEmails[assignee.taskId] || ''}
                            onChange={(e) => setReassignEmails((p) => ({ ...p, [assignee.taskId]: e.target.value }))}
                          >
                            <option value="">Select new assignee…</option>
                            {roster
                              .filter((p) => p.email.toLowerCase() !== assignee.email.toLowerCase())
                              .map((p) => (
                                <option key={p.email} value={p.email}>{p.name}</option>
                              ))}
                          </select>
                          <div className="status-row__cancel-form-btns">
                            <button
                              type="button"
                              className="action-btn action-btn--reassign-confirm"
                              disabled={busy || !reassignEmails[assignee.taskId]}
                              onClick={() => handleReassign(assignee)}
                            >
                              {busy ? 'Reassigning…' : 'Confirm Reassign'}
                            </button>
                            <button
                              type="button"
                              className="action-btn action-btn--secondary"
                              onClick={() => setReassigningId(null)}
                            >
                              Back
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="action-btn action-btn--reassign"
                          onClick={() => { setReassigningId(assignee.taskId); setCancellingId(null) }}
                        >
                          ↪ Reassign
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </section>

          {/* Voice tasks: audio player | Text tasks: original typed text */}
          {isVoiceTask && driveFileId ? (
            <section className="task-card__section">
              <h3 className="task-card__section-title">Voice Recording</h3>
              <div className="task-card__audio-row">
                <div className="task-card__audio-clip">
                  <iframe
                    key={audioKey}
                    src={`https://drive.google.com/file/d/${driveFileId}/preview`}
                    className="task-card__audio-embed"
                    allow="autoplay"
                    title="Voice recording"
                  />
                </div>
                <button
                  type="button"
                  className="audio-retry-btn"
                  onClick={() => setAudioKey((k) => k + 1)}
                >
                  ↺ Reload
                </button>
              </div>
            </section>
          ) : (
            task.originalTranscript && (
              <section className="task-card__section">
                <h3 className="task-card__section-title">Original Text Assignment</h3>
                <p className="task-card__body-text task-card__typed-text task-card__full-text">
                  {task.originalTranscript}
                </p>
              </section>
            )
          )}

          {/* Full description — always shown */}
          {task.taskDescription && (
            <section className="task-card__section">
              <h3 className="task-card__section-title">Full Description</h3>
              <p className="task-card__body-text">{task.taskDescription}</p>
            </section>
          )}

        </div>
      )}
    </div>
  )
}
