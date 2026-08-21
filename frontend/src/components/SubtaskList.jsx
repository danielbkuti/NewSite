import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// One subtask row, with its own busy/error state so toggling or
// deleting one subtask doesn't disable the whole list while it's in
// flight.
function SubtaskRow({ subtask, onToggle, onDelete }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function handleToggle(checked) {
    setError(null)
    setBusy(true)
    try {
      await onToggle(checked)
    } catch {
      setError('Could not update this subtask.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    setError(null)
    setBusy(true)
    try {
      await onDelete()
    } catch {
      setError('Could not delete this subtask.')
      setBusy(false)
    }
    // no finally on success — the row unmounts along with this state
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-2">
        <Checkbox checked={subtask.completed} onCheckedChange={handleToggle} disabled={busy} />
        <span
          className={cn(
            'flex-1 text-sm',
            subtask.completed && 'text-muted-foreground line-through'
          )}
        >
          {subtask.name}
        </span>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={handleDelete}
          disabled={busy}
          aria-label="Delete subtask"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      {error && <p className="pl-6 text-xs text-destructive">{error}</p>}
    </div>
  )
}

function AddSubtaskForm({ onAdd }) {
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setAdding(true)
    try {
      await onAdd(name)
      setName('')
    } catch (err) {
      setError(err.data?.name?.[0] ?? 'Could not add that subtask.')
    } finally {
      setAdding(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1">
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add a subtask…"
          className="h-7 flex-1 text-xs"
          required
        />
        <Button type="submit" size="xs" disabled={adding}>
          {adding ? 'Adding…' : 'Add'}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  )
}

// Nested inside a TaskCard. `task.subtasks` comes straight off the
// TaskSerializer response (nested, read-only) — no separate fetch to
// display them. Mutations (add/toggle/delete) are handled by the
// parent (TaskList), which re-fetches the whole task afterward since
// completing/adding a subtask can change the parent's own completed
// state on the server.
export function SubtaskList({ task, onAdd, onToggle, onDelete }) {
  const total = task.subtasks.length
  const done = task.subtasks.filter((s) => s.completed).length

  return (
    <div className="flex flex-col gap-2 border-t pt-2">
      {total > 0 && (
        <>
          <p className="text-xs font-medium text-muted-foreground">
            Subtasks ({done}/{total})
          </p>
          <div className="flex flex-col gap-1.5 pl-1">
            {task.subtasks.map((subtask) => (
              <SubtaskRow
                key={subtask.id}
                subtask={subtask}
                onToggle={(checked) => onToggle(subtask, checked)}
                onDelete={() => onDelete(subtask)}
              />
            ))}
          </div>
        </>
      )}
      <AddSubtaskForm onAdd={onAdd} />
    </div>
  )
}
