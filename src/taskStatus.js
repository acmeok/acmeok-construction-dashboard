export function assigneeStatusLabel(assignee) {
  if (assignee.cancelled === 'Yes') return 'Cancelled'
  if (assignee.completed === 'Yes') return 'Completed'
  if (assignee.acknowledged === 'Yes') return 'Acknowledged'
  return 'Not Acknowledged'
}

// Task-level status derived from all assignees
export function getTaskStatus(task) {
  const active = task.assignees.filter((a) => a.cancelled !== 'Yes')
  if (active.length === 0) return 'cancelled'
  const allDone = active.every((a) => a.completed === 'Yes')
  if (allDone) return 'done'
  const anyStarted = active.some((a) => a.acknowledged === 'Yes' || a.completed === 'Yes')
  if (anyStarted) return 'in-progress'
  return 'not-started'
}

export function isOverdue(task) {
  if (!task.deadline) return false
  const allDoneOrCancelled = task.assignees.every((a) => a.completed === 'Yes' || a.cancelled === 'Yes')
  return !allDoneOrCancelled && new Date(task.deadline) < new Date()
}
