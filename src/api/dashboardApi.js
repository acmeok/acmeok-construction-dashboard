const BASE_URL = import.meta.env.VITE_N8N_BASE_URL

async function call(path, idToken, { method = 'GET', body } = {}) {
  const response = await fetch(`${BASE_URL}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${idToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const responseBody = await response.json()
  if (!response.ok || responseBody.ok === false) {
    throw new Error(responseBody.message || 'Request failed.')
  }
  return responseBody
}

export function verifyLogin(idToken) {
  return call('dashboard-verify-login', idToken)
}

export function getTasks(idToken, { mode, person }) {
  const params = new URLSearchParams({ mode })
  if (person) params.set('person', person)
  return call(`dashboard-get-tasks?${params.toString()}`, idToken)
}

export function getNotes(idToken, taskId) {
  return call(`dashboard-get-notes?taskId=${encodeURIComponent(taskId)}`, idToken)
}

export function addNote(idToken, taskId, text) {
  return call('dashboard-add-note', idToken, { method: 'POST', body: { taskId, text } })
}

// Pre-existing public endpoints (no auth header - same ones the email
// Acknowledge/Complete links use). They respond with an HTML confirmation
// page, not JSON, so we only check response.ok here.
export async function acknowledgeTask(taskId) {
  const response = await fetch(`${BASE_URL}/task-acknowledge?taskId=${encodeURIComponent(taskId)}`)
  if (!response.ok) throw new Error('Failed to acknowledge task.')
}

export async function completeTask(taskId, note = '') {
  const params = new URLSearchParams({ taskId, confirm: '1' })
  if (note.trim()) params.set('note', note.trim())
  const response = await fetch(`${BASE_URL}/task-complete?${params.toString()}`)
  if (!response.ok) throw new Error('Failed to complete task.')
}

export function cancelTask(idToken, taskId, note = '') {
  return call('dashboard-cancel-task', idToken, { method: 'POST', body: { taskId, note } })
}

export function undoCompletion(idToken, taskId, reason = '') {
  return call('dashboard-undo-completion', idToken, { method: 'POST', body: { taskId, reason } })
}

export function reassignTask(idToken, taskId, newEmail) {
  return call('dashboard-reassign-task', idToken, { method: 'POST', body: { taskId, newEmail } })
}

