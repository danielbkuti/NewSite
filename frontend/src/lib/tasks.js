import { apiFetch } from './api'

// GET /api/tasks/ is paginated server-side (PAGE_SIZE=10). The app has no
// "page 2" concept anywhere in its UI — /tasks shows one continuous list
// split into Active/Completed sections, and the dashboard just wants a
// preview slice — so rather than bolt on page-number controls, this walks
// every page and hands callers the full combined result set. `next` comes
// back as an absolute URL (DRF's PageNumberPagination builds it from the
// request); strip the origin so it can be replayed through apiFetch, which
// prepends API_BASE_URL itself.
export async function fetchTasks() {
  let path = '/api/tasks/'
  let results = []
  let count = 0

  while (path) {
    const data = await apiFetch(path)
    results = results.concat(data.results)
    count = data.count
    path = data.next ? data.next.replace(/^https?:\/\/[^/]+/, '') : null
  }

  return { results, count }
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
