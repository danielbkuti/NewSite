import { useEffect, useState } from 'react'
import { TaskCard } from '@/components/TaskCard'
import { Button } from '@/components/ui/button'
import { fetchTasks, createTask, updateTask } from '@/lib/tasks'

export function TaskList() {
  // 'loading' | 'ready' | 'error'
  const [status, setStatus] = useState('loading')
  const [tasks, setTasks] = useState([])
  const [newTaskName, setNewTaskName] = useState('')
  const [addError, setAddError] = useState(null)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    fetchTasks()
      .then((data) => {
        setTasks(data.results)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [])

  // Optimistic: flip the checkbox immediately rather than waiting on the
  // PATCH round-trip, revert only if the request actually fails.
  async function handleToggle(task, checked) {
    setTasks((current) =>
      current.map((t) => (t.id === task.id ? { ...t, completed: checked } : t))
    )
    try {
      await updateTask(task.id, { completed: checked })
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

  async function handleAdd(event) {
    event.preventDefault()
    setAddError(null)
    setAdding(true)

    try {
      // The API hands back the full created object (id, dateCreated,
      // everything) — no need to re-fetch the whole list for it.
      const task = await createTask({ name: newTaskName })
      setTasks((current) => [task, ...current])
      setNewTaskName('')
    } catch (err) {
      // DRF's default validation error shape: { field: ["message", ...] }
      // — plain strings, unlike the {message, code} objects our own
      // Django-forms-based auth endpoints return.
      setAddError(err.data?.name?.[0] ?? 'Could not add that task. Try again.')
    } finally {
      setAdding(false)
    }
  }

  if (status === 'loading') {
    return <p className="text-sm text-muted-foreground">Loading tasks…</p>
  }

  if (status === 'error') {
    return (
      <p className="text-sm text-destructive">Couldn&apos;t load your tasks. Try reloading.</p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={newTaskName}
          onChange={(e) => setNewTaskName(e.target.value)}
          placeholder="Add a task…"
          className="flex-1 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          required
        />
        <Button type="submit" disabled={adding}>
          {adding ? 'Adding…' : 'Add'}
        </Button>
      </form>

      {addError && <p className="text-xs text-destructive">{addError}</p>}

      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tasks yet — add one above.</p>
      ) : (
        tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onToggleComplete={handleToggle}
            onSetDeadline={handleSetDeadline}
          />
        ))
      )}
    </div>
  )
}
