import { useEffect, useState } from 'react'
import { TaskCard } from '@/components/TaskCard'
import {
  fetchTasks,
  fetchTask,
  updateTask,
  deleteTask,
  createSubTask,
  updateSubTask,
  deleteSubTask,
} from '@/lib/tasks'

export function TaskList() {
  // 'loading' | 'ready' | 'error'
  const [status, setStatus] = useState('loading')
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    fetchTasks()
      .then((data) => {
        setTasks(data.results)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [])

  // Optimistic: flip the checkbox immediately rather than waiting on the
  // PATCH round-trip, revert only if the request actually fails. Once
  // it succeeds, merges the server's response back in rather than
  // trusting the optimistic patch alone — completing a task also sets
  // dateCompleted server-side, which the client has no way to know in
  // advance.
  async function handleToggle(task, checked) {
    setTasks((current) =>
      current.map((t) => (t.id === task.id ? { ...t, completed: checked } : t))
    )
    try {
      const updated = await updateTask(task.id, { completed: checked })
      setTasks((current) => current.map((t) => (t.id === task.id ? { ...t, ...updated } : t)))
    } catch {
      setTasks((current) =>
        current.map((t) => (t.id === task.id ? { ...t, completed: task.completed } : t))
      )
    }
  }

  // Same optimistic pattern as handleToggle, but re-throws on failure
  // instead of swallowing the error — TaskCard awaits this itself so it
  // can show the specific validation message (e.g. "can't be in the
  // past") right next to the field that caused it, not just revert
  // silently.
  async function handleSetDeadline(task, dateDeadline) {
    const previous = task.dateDeadline
    setTasks((current) =>
      current.map((t) => (t.id === task.id ? { ...t, dateDeadline } : t))
    )
    try {
      await updateTask(task.id, { dateDeadline })
    } catch (err) {
      setTasks((current) =>
        current.map((t) => (t.id === task.id ? { ...t, dateDeadline: previous } : t))
      )
      throw err
    }
  }

  // Optimistic like the others, but re-throws on failure — TaskCard
  // awaits this itself so it can show a delete-specific error next to
  // the confirm button instead of the task just silently reappearing.
  async function handleDelete(task) {
    const previous = tasks
    setTasks((current) => current.filter((t) => t.id !== task.id))
    try {
      await deleteTask(task.id)
    } catch (err) {
      setTasks(previous)
      throw err
    }
  }

  // Re-fetches one task and replaces it in local state — used after any
  // subtask mutation. Completing/adding a subtask can flip the parent
  // task's own `completed` field server-side (Task.update_completion_status),
  // so pulling the authoritative task back down is simpler and safer
  // than re-deriving that logic here.
  async function refreshTask(taskId) {
    const fresh = await fetchTask(taskId)
    setTasks((current) => current.map((t) => (t.id === taskId ? fresh : t)))
  }

  async function handleAddSubtask(task, name) {
    await createSubTask({ task: task.id, name })
    await refreshTask(task.id)
  }

  async function handleToggleSubtask(task, subtask, completed) {
    await updateSubTask(subtask.id, { completed })
    await refreshTask(task.id)
  }

  async function handleDeleteSubtask(task, subtask) {
    await deleteSubTask(subtask.id)
    await refreshTask(task.id)
  }

  if (status === 'loading') {
    return <p className="text-sm text-muted-foreground">Loading tasks…</p>
  }

  if (status === 'error') {
    return (
      <p className="text-sm text-destructive">Couldn&apos;t load your tasks. Try reloading.</p>
    )
  }

  const activeTasks = tasks.filter((t) => !t.completed)
  const completedTasks = tasks.filter((t) => t.completed)

  function renderCard(task) {
    return (
      <TaskCard
        key={task.id}
        task={task}
        onToggleComplete={handleToggle}
        onSetDeadline={handleSetDeadline}
        onDelete={handleDelete}
        onAddSubtask={handleAddSubtask}
        onToggleSubtask={handleToggleSubtask}
        onDeleteSubtask={handleDeleteSubtask}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No tasks yet — add one with the + button in the corner.
        </p>
      ) : (
        <>
          {activeTasks.map(renderCard)}

          {completedTasks.length > 0 && (
            <div className="mt-6 flex flex-col gap-4">
              <h2 className="text-sm font-semibold text-muted-foreground">
                Completed ({completedTasks.length})
              </h2>
              {completedTasks.map(renderCard)}
            </div>
          )}
        </>
      )}
    </div>
  )
}
