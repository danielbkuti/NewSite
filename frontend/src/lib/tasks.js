import { apiFetch } from './api'

// GET /api/tasks/ is paginated server-side (PAGE_SIZE=10) — this fetches
// just page 1 for now. Real pagination UI is a later addition, not an
// oversight.
export function fetchTasks() {
  return apiFetch('/api/tasks/')
}

export function createTask({ name, status = 'pending', completed = false }) {
  return apiFetch('/api/tasks/', {
    method: 'POST',
    body: { name, status, completed },
  })
}

export function updateTask(id, updates) {
  return apiFetch(`/api/tasks/${id}/`, {
    method: 'PATCH',
    body: updates,
  })
}

export function deleteTask(id) {
  return apiFetch(`/api/tasks/${id}/`, { method: 'DELETE' })
}

// Used to pull a single task back down after a subtask mutation —
// creating/completing a subtask can flip the parent's own `completed`
// field server-side (Task.update_completion_status), so re-fetching the
// task is simpler and more correct than re-deriving that logic here.
export function fetchTask(id) {
  return apiFetch(`/api/tasks/${id}/`)
}

export function createSubTask({ task, name }) {
  return apiFetch('/api/subtasks/', {
    method: 'POST',
    body: { task, name },
  })
}

export function updateSubTask(id, updates) {
  return apiFetch(`/api/subtasks/${id}/`, {
    method: 'PATCH',
    body: updates,
  })
}

export function deleteSubTask(id) {
  return apiFetch(`/api/subtasks/${id}/`, { method: 'DELETE' })
}
