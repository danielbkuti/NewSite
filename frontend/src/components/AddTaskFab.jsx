import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createTask } from '@/lib/tasks'
import { cn } from '@/lib/utils'

const GRADIENT = 'bg-gradient-to-br from-[#e0c3fc] via-[#7c5fb0] to-[#8ec5fc]'

// Global quick-add entry point, fixed bottom-right on every
// authenticated page. There's no dedicated "add" page yet, and no
// single-task detail view either — task cards only ever live inline on
// the /tasks list — so there's nowhere to make this context-aware
// between "new task" and "new subtask of the task I'm looking at" the
// way a real add flow eventually would. For now it always creates a
// plain task, then drops you on /tasks to see it.
export function AddTaskFab() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await createTask({ name })
      setName('')
      setOpen(false)
      if (location.pathname === '/tasks') {
        // Already there — navigating to the same route wouldn't remount
        // TaskList to pick up the new task, since each page fetches its
        // own task state independently. A full reload is a known rough
        // edge until that's shared instead of per-page.
        window.location.reload()
      } else {
        navigate('/tasks')
      }
    } catch (err) {
      setError(err.data?.name?.[0] ?? 'Could not add that task.')
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed right-6 bottom-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <form
          onSubmit={handleSubmit}
          className="flex w-64 flex-col gap-2 rounded-xl border bg-card p-3 shadow-lg"
        >
          <label htmlFor="fab-task-name" className="text-xs font-medium text-muted-foreground">
            New task
          </label>
          <input
            id="fab-task-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Task name…"
            required
            className="rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add'}
            </Button>
          </div>
        </form>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Add a task"
        title="Add a task"
        className={cn(
          GRADIENT,
          'flex size-14 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105'
        )}
      >
        <Plus className="size-6" />
      </button>
    </div>
  )
}
