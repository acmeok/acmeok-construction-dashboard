import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { acknowledgeTask, completeTask, cancelTask, undoCompletion, reassignTask } from '../api/dashboardApi'
import { assigneeStatusLabel, isOverdue } from '../taskStatus'
import { parseChicagoTimestamp, formatDuration, formatDisplayTime } from '../timeUtils'

const COL_COUNT = 9

function flattenToRows(tasks) {
  const rows = []
  tasks.forEach((task, groupIdx) => {
    task.assignees.forEach((assignee, i) => {
      rows.push({ task, assignee, isFirst: i === 0, groupIdx })
    })
  })
  return rows
}

function RowDetail({ row, onClose, onRefetch, roster, profile }) {
  const { getToken } = useAuth()
  const { task, assignee } = row
  const [actingOn, setActingOn] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [noteText, setNoteText] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [cancelNote, setCancelNote] = useState('')
  const [undoReason, setUndoReason] = useState('')
  const [showReassignForm, setShowReassignForm] = useState(false)
  const [reassignEmail, setReassignEmail] = useState('')
  const [audioKey, setAudioKey] = useState(0)

  const label = assigneeStatusLabel(assignee)
  const isCancelled = assignee.cancelled === 'Yes'
  const isMe = (assignee.email || '').toLowerCase() === (profile?.email || '').toLowerCase()
  const isAssigner = (task.assignedByEmail || '').toLowerCase() === (profile?.email || '').toLowerCase()
  const busy = !!actingOn

  const assignedAt = task.timestamp ? new Date(task.timestamp) : null
  const ackedAt = parseChicagoTimestamp(assignee.acknowledgedAt)
  const doneAt = parseChicagoTimestamp(assignee.completedAt)
  const cancelledAt = parseChicagoTimestamp(assignee.cancelledAt)

  const driveFileId = task.audioUrl
    ? (task.audioUrl.match(/[?&]id=([^&]+)/) || [])[1] ?? null
    : null

  const hasAudio = !!(task.audioUrl && driveFileId)
  const canCancel = !isCancelled && (isMe || isAssigner)
  const canReassign = !isCancelled && isAssigner

  // Which columns to show
  const showCol1 = hasAudio || (isMe && !isCancelled)
  const showCol2 = isMe && !isCancelled
  const showCol3 = canCancel

  // In col 2: completed state (show Undo) vs not yet (show Complete)
  const isCompleted = label === 'Completed' || submitted

  async function handleAction(action) {
    setActingOn(action)
    setActionError(null)
    try {
      if (action === 'acknowledge') {
        await acknowledgeTask(assignee.taskId)
      } else {
        await completeTask(assignee.taskId, noteText)
        setSubmitted(true)
      }
      await onRefetch()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setActingOn(null)
    }
  }

  async function handleCancel() {
    if (!cancelNote.trim()) return
    setActingOn('cancel')
    setActionError(null)
    try {
      const idToken = await getToken()
      await cancelTask(idToken, assignee.taskId, cancelNote)
      await onRefetch()
      onClose()
    } catch (err) {
      setActionError(err.message)
      setActingOn(null)
    }
  }

  async function handleUndo() {
    setActingOn('undo')
    setActionError(null)
    try {
      const idToken = await getToken()
      await undoCompletion(idToken, assignee.taskId, undoReason)
      setSubmitted(false)
      await onRefetch()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setActingOn(null)
    }
  }

  async function handleReassign() {
    if (!reassignEmail) return
    setActingOn('reassign')
    setActionError(null)
    try {
      const idToken = await getToken()
      await reassignTask(idToken, assignee.taskId, reassignEmail)
      await onRefetch()
      onClose()
    } catch (err) {
      setActionError(err.message)
      setActingOn(null)
    }
  }

  return (
    <div className="row-detail">
      {/* ── Header: status summary + close ── */}
      <div className="row-detail__header">
        <div className="row-detail__info">
          <strong className="row-detail__name">{assignee.name}</strong>
          <span className={`status-badge status-badge--${label.replace(/\s+/g, '-').toLowerCase()}`}>
            {label}
          </span>
          {ackedAt && !isCancelled && (
            <span className="row-detail__ts">Ack&rsquo;d: {formatDisplayTime(ackedAt)}</span>
          )}
          {doneAt && !isCancelled && (
            <span className="row-detail__ts">Done: {formatDisplayTime(doneAt)}</span>
          )}
          {assignee.completionNote && !isCancelled && (
            <span className="row-detail__ts">Note: {assignee.completionNote}</span>
          )}
          {isCancelled && (
            <span className="status-row__cancel-info">
              Cancelled by {assignee.cancelledBy || 'unknown'}
              {cancelledAt ? ` · ${formatDisplayTime(cancelledAt)}` : ''}
              {assignee.cancellationNote ? ` · "${assignee.cancellationNote}"` : ''}
            </span>
          )}
          {assignedAt && ackedAt && !isCancelled && (
            <span className="row-detail__ts">
              Assign→Ack: <strong>{formatDuration(ackedAt - assignedAt)}</strong>
            </span>
          )}
          {ackedAt && doneAt && !isCancelled && (
            <span className="row-detail__ts">
              Ack→Done: <strong>{formatDuration(doneAt - ackedAt)}</strong>
            </span>
          )}
        </div>
        <button type="button" className="row-detail__close" onClick={onClose}>✕</button>
      </div>

      {actionError && <p className="state-message state-message--error">{actionError}</p>}

      {/* ── 3-column action grid ── */}
      {(showCol1 || showCol2 || showCol3) && (
        <div className="row-detail__action-grid">

          {/* Column 1: Audio + Acknowledge — wider */}
          {showCol1 && (
            <div className="row-detail__col row-detail__col--lg">
              <p className="row-detail__col-title">
                {hasAudio ? 'Listen & Acknowledge' : 'Acknowledge'}
              </p>

              {hasAudio ? (
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
                    title="Reload audio"
                  >
                    ↺
                  </button>
                </div>
              ) : (
                <p className="row-detail__no-audio">
                  This task was assigned as text — no audio recording available.
                </p>
              )}

              {isMe && !isCancelled && (
                label === 'Not Acknowledged' ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleAction('acknowledge')}
                  >
                    {actingOn === 'acknowledge' ? 'Acknowledging…' : 'Acknowledge'}
                  </button>
                ) : (
                  <span className="row-detail__done-note">✓ Acknowledged</span>
                )
              )}
            </div>
          )}

          {/* Column 2: Complete Task  –or–  Undo Completion */}
          {showCol2 && (
            <div className="row-detail__col">
              {!isCompleted ? (
                <>
                  <p className="row-detail__col-title">Complete Task</p>
                  <textarea
                    className="status-row__note-input row-detail__col-textarea"
                    placeholder="Completion note (optional)…"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    disabled={label === 'Not Acknowledged'}
                    rows={3}
                  />
                  <button
                    type="button"
                    disabled={label === 'Not Acknowledged' || busy}
                    onClick={() => handleAction('complete')}
                  >
                    {actingOn === 'complete' ? 'Completing…' : '✓ Complete'}
                  </button>
                </>
              ) : (
                <>
                  <p className="row-detail__col-title">Undo Completion</p>
                  <textarea
                    className="status-row__note-input row-detail__col-textarea"
                    placeholder="Reason for undoing (optional)…"
                    value={undoReason}
                    onChange={(e) => setUndoReason(e.target.value)}
                    rows={3}
                  />
                  <button
                    type="button"
                    className="action-btn action-btn--undo"
                    disabled={busy}
                    onClick={handleUndo}
                  >
                    {actingOn === 'undo' ? 'Undoing…' : '↺ Undo Completion'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Column 3: Cancel Task (mandatory note) */}
          {showCol3 && (
            <div className="row-detail__col">
              <p className="row-detail__col-title">
                Cancel Task <span className="row-detail__required">*</span>
              </p>
              <textarea
                className="status-row__note-input row-detail__col-textarea"
                placeholder="Reason for cancellation (required)…"
                value={cancelNote}
                onChange={(e) => setCancelNote(e.target.value)}
                rows={3}
              />
              <button
                type="button"
                className="action-btn action-btn--cancel-confirm"
                disabled={busy || !cancelNote.trim()}
                onClick={handleCancel}
              >
                {actingOn === 'cancel' ? 'Cancelling…' : '✕ Cancel Task'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Reassign (assigner only, below the grid) ── */}
      {canReassign && (
        <div className="row-detail__reassign">
          {showReassignForm ? (
            <div className="status-row__reassign-form">
              <select
                className="status-row__reassign-select"
                value={reassignEmail}
                onChange={(e) => setReassignEmail(e.target.value)}
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
                  disabled={busy || !reassignEmail}
                  onClick={handleReassign}
                >
                  {actingOn === 'reassign' ? 'Reassigning…' : 'Confirm Reassign'}
                </button>
                <button
                  type="button"
                  className="action-btn action-btn--secondary"
                  onClick={() => setShowReassignForm(false)}
                >
                  Back
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="action-btn action-btn--reassign"
              onClick={() => setShowReassignForm(true)}
            >
              ↪ Reassign to Someone Else
            </button>
          )}
        </div>
      )}

      {/* ── Full description ── */}
      {task.taskDescription && (
        <div className="row-detail__section">
          <p className="task-card__section-title">Full Description</p>
          <p className="task-card__body-text">{task.taskDescription}</p>
        </div>
      )}

      {/* ── Original text (text tasks only, audio tasks show player in col 1) ── */}
      {!hasAudio && task.originalTranscript && (
        <div className="row-detail__section">
          <p className="task-card__section-title">Original Text</p>
          <p className="task-card__body-text task-card__typed-text task-card__full-text">
            {task.originalTranscript}
          </p>
        </div>
      )}
    </div>
  )
}

export function TaskTable({ tasks, roster, onRefetch }) {
  const { profile } = useAuth()
  const [expandedKey, setExpandedKey] = useState(null)

  const rows = flattenToRows(tasks)

  if (rows.length === 0) {
    return <p className="state-message">No tasks to display.</p>
  }

  function toggleRow(key) {
    setExpandedKey((prev) => (prev === key ? null : key))
  }

  return (
    <div className="task-table-wrapper">
      <table className="task-table">
        <thead>
          <tr>
            <th>Task</th>
            <th>Assigned To</th>
            <th>Assigned By</th>
            <th>Created</th>
            <th>Deadline</th>
            <th>Status</th>
            <th>Ack&rsquo;d At</th>
            <th>Assign → Ack</th>
            <th>Ack → Done</th>
          </tr>
        </thead>
        <tbody>
          {rows.flatMap((row) => {
            const { task, assignee, isFirst, groupIdx } = row
            const key = assignee.taskId
            const isExpanded = expandedKey === key
            const label = assigneeStatusLabel(assignee)
            const isCancelled = assignee.cancelled === 'Yes'
            const overdue = isOverdue(task)

            const assignedAt = task.timestamp ? new Date(task.timestamp) : null
            const ackedAt = parseChicagoTimestamp(assignee.acknowledgedAt)
            const doneAt = parseChicagoTimestamp(assignee.completedAt)

            const assignToAck =
              !isCancelled && assignedAt && ackedAt ? formatDuration(ackedAt - assignedAt) : '—'
            const ackToDone =
              !isCancelled && ackedAt && doneAt ? formatDuration(doneAt - ackedAt) : '—'

            const rowClass = [
              'task-row',
              groupIdx % 2 === 0 ? 'task-row--even' : 'task-row--odd',
              isExpanded ? 'task-row--expanded' : '',
              isCancelled ? 'task-row--cancelled' : '',
            ]
              .filter(Boolean)
              .join(' ')

            const result = [
              <tr key={key} className={rowClass} onClick={() => toggleRow(key)}>
                <td>
                  <div className="task-cell__task">
                    {isFirst ? (
                      <>
                        <span
                          className="task-cell__desc"
                          title={task.taskDescription || task.label || ''}
                        >
                          {task.label || task.taskDescription || '(no description)'}
                        </span>
                        <span className="task-cell__id">#{assignee.taskId}</span>
                      </>
                    ) : (
                      <span className="task-cell__continuation" title={task.label || ''}>
                        └ {task.label || ''}
                      </span>
                    )}
                  </div>
                </td>
                <td>{assignee.name}</td>
                <td>{task.assignedByName}</td>
                <td className="task-cell--muted">
                  {assignedAt ? formatDisplayTime(assignedAt) : '—'}
                </td>
                <td className={overdue && !isCancelled ? 'task-cell--overdue' : ''}>
                  {task.deadline || '—'}
                  {overdue && !isCancelled && (
                    <span className="task-cell__overdue-badge"> !</span>
                  )}
                </td>
                <td>
                  <span
                    className={`status-badge status-badge--${label
                      .replace(/\s+/g, '-')
                      .toLowerCase()}`}
                  >
                    {label}
                  </span>
                </td>
                <td className="task-cell--muted">
                  {ackedAt ? formatDisplayTime(ackedAt) : '—'}
                </td>
                <td className="task-cell--muted">{assignToAck}</td>
                <td className="task-cell--muted">{ackToDone}</td>
              </tr>,
            ]

            if (isExpanded) {
              result.push(
                <tr key={`${key}-detail`} className="task-row task-row--detail">
                  <td colSpan={COL_COUNT}>
                    <RowDetail
                      row={row}
                      onClose={() => setExpandedKey(null)}
                      onRefetch={onRefetch}
                      roster={roster}
                      profile={profile}
                    />
                  </td>
                </tr>
              )
            }

            return result
          })}
        </tbody>
      </table>
    </div>
  )
}
