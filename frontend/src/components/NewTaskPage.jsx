import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DeadlineEditor } from '@/components/DeadlineEditor'
import { createTask } from '@/lib/tasks'
import { useTaskStore } from '@/context/TaskStoreContext'
import { formatDeadline } from '@/lib/utils'

// The dedicated task-creation page — previously "adding a task" only
// meant the FAB's one-field quick form (name only, no description or
// deadline at creation time). Reached from the "Add a new task" option
// in the add menu, from every context that offers it.
export function NewTaskPage() {
  const navigate = useNavigate()
  const { mergeTask } = useTaskStore()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [dateDeadline, setDateDeadline] = useState(null)
  const [editingDeadline, setEditingDeadline] = useState(false)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // DeadlineEditor normally commits straight to the server the moment
  // its own Save is clicked (see TaskCard/TaskDetailPage) — here there
  // isn't a task to save to yet, so this just holds the picked value
  // in local form state instead; the real create() call below is what
  // actually sends it, together with everything else on the form.
  function handlePickDeadline(iso) {
    setDateDeadline(iso)
    setEditingDeadline(false)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const task = await createTask({
        name,
        description: description.trim() ? description.trim() : undefined,
        dateDeadline,
      })
      // Fold the new task into the shared store before navigating —
      // otherwise the detail page it's about to land on would find
      // nothing under this id until the store's next full refresh.
      mergeTask(task)
      navigate(`/tasks/${task.id}`)
    } catch (err) {
      setError(err.data?.name?.[0] ?? err.data?.dateDeadline?.[0] ?? 'Could not create that task.')
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl px-8 py-8">
      <Link
        to="/tasks"
        className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to tasks
      </Link>

      <h1 className="text-2xl font-bold tracking-tight">New task</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="task-name" className="text-xs font-medium text-muted-foreground">
            Name
          </label>
          <input
            id="task-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Task name…"
            autoFocus
            required
            className="rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="task-description" className="text-xs font-medium text-muted-foreground">
            Description <span className="font-normal">(optional)</span>
          </label>
          <textarea
            id="task-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="What's this task about?"
            className="rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Deadline (optional)</span>
          <div className="relative w-fit">
            <button
              type="button"
              onClick={() => setEditingDeadline(true)}
              className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
            >
              {dateDeadline ? `Due ${formatDeadline(dateDeadline)}` : 'Set deadline'}
            </button>
            {editingDeadline && (
              <DeadlineEditor
                value={dateDeadline}
                onSave={handlePickDeadline}
                onCancel={() => setEditingDeadline(false)}
                minDayOffset={0}
              />
            )}
          </div>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create task'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate(-1)} disabled={submitting}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
