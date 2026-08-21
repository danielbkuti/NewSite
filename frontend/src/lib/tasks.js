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
