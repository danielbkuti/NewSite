import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { fetchTasks as apiFetchTasks, fetchTask as apiFetchTask } from '@/lib/tasks'

const TaskStoreContext = createContext(null)

// One shared copy of the task list for every authenticated page —
// Dashboard, TaskList, TaskDetailPage, and AddTaskFab all read/write
// through here instead of each independently fetching its own copy.
// This is what closes the "AddTaskFab does a full page reload because
// it has no shared state with the page it's acting on" gap: the FAB
// mutates through the same store the page underneath is reading from,
// so the page just re-renders with the new data instead of needing a
// reload to see it.
//
// Deliberately thin: it's a fetch-and-cache, not a normalized client-side
// database. Consumers that need "the truth after a mutation" still
// re-fetch that one task from the API themselves (server-side effects
// like a subtask completion cascading its parent's own `completed`
// field are real and easy to get wrong by guessing locally) — they just
// fold the result back in here via `mergeTask` instead of keeping a
// private copy, which is what actually makes the update visible
// elsewhere.
export function TaskStoreProvider({ children }) {
  const [tasks, setTasks] = useState([])
  // 'loading' | 'ready' | 'error'
  const [status, setStatus] = useState('loading')

  const refreshTasks = useCallback(() => {
    return apiFetchTasks()
      .then((data) => {
        setTasks(data.results)
        setStatus('ready')
        return data.results
      })
      .catch((err) => {
        setStatus('error')
        throw err
      })
  }, [])

  useEffect(() => {
    refreshTasks().catch(() => {})
  }, [refreshTasks])

  // Folds one task into the shared list — inserts it if it's not there
  // yet (a just-created task), replaces it in place otherwise. Never
  // shuffles order, so a card doesn't jump around just because it was
  // the one that got patched.
  const mergeTask = useCallback((task) => {
    setTasks((current) => {
      const idx = current.findIndex((t) => t.id === task.id)
      if (idx === -1) return [...current, task]
      if (current[idx] === task) return current
      const next = current.slice()
      next[idx] = task
      return next
    })
  }, [])

  const removeTask = useCallback((id) => {
    setTasks((current) => current.filter((t) => t.id !== id))
  }, [])

  // The common "re-fetch this one task and fold it back in" pattern —
  // used after any subtask mutation, since those can flip the parent
  // task's own `completed` field server-side.
  const refreshTask = useCallback(
    async (id) => {
      const fresh = await apiFetchTask(id)
      mergeTask(fresh)
      return fresh
    },
    [mergeTask]
  )

  const value = {
    tasks,
    status,
    setTasks,
    refreshTasks,
    mergeTask,
    removeTask,
    refreshTask,
  }

  return <TaskStoreContext.Provider value={value}>{children}</TaskStoreContext.Provider>
}

export function useTaskStore() {
  const ctx = useContext(TaskStoreContext)
  if (!ctx) {
    throw new Error('useTaskStore must be used within a TaskStoreProvider')
  }
  return ctx
}
