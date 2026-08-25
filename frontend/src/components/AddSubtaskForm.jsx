import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// Standalone add-subtask form. Viewing/toggling/deleting existing
// subtasks now lives in TaskCard's own cascading stack instead of a
// separate list component — this is just the "create a new one" half.
// `onCancel` is optional — call sites that reveal this form inline
// (TaskCard/TaskDetailPage's "Want to break this down..." prompt) pass
// it so there's a way back out without submitting; AddTaskFab's own
// popover already has its own close (X) button, so it doesn't need a
// second one in here.
export function AddSubtaskForm({ onAdd, onCancel }) {
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
          className="h-8 flex-1 text-xs"
          required
        />
        <Button type="submit" size="sm" disabled={adding}>
          {adding ? 'Adding…' : 'Add'}
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={adding}>
            Cancel
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  )
}
