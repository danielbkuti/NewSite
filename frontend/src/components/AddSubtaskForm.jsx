import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DeadlineEditor } from '@/components/DeadlineEditor'
import { formatDeadline } from '@/lib/utils'

// Standalone add-subtask form. Viewing/toggling/deleting existing
// subtasks now lives in TaskCard's own cascading stack instead of a
// separate list component — this is just the "create a new one" half.
// `onCancel` is optional — call sites that reveal this form inline
// (TaskCard/TaskDetailPage's "Want to break this down..." prompt) pass
// it so there's a way back out without submitting; AddTaskFab's own
// popover already has its own close (X) button, so it doesn't need a
// second one in here.
//
// The deadline picker sits right under the name field, same
// "yellow pill trigger toggles a floating DeadlineEditor" pattern as
// everywhere else a deadline gets set — but same as `NewTaskPage`
// (also creating something that doesn't exist yet), it just holds the
// picked value in local form state rather than saving immediately;
// there's no subtask to PATCH until Add actually creates one. `onAdd`
// is called with both `name` and `dateDeadline` (`null` if never set)
// so callers can include it in the create request.
export function AddSubtaskForm({ onAdd, onCancel }) {
  const [name, setName] = useState('')
  const [dateDeadline, setDateDeadline] = useState(null)
  const [editingDeadline, setEditingDeadline] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState(null)

  function handlePickDeadline(iso) {
    setDateDeadline(iso)
    setEditingDeadline(false)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setAdding(true)
    try {
      await onAdd(name, dateDeadline)
      setName('')
      setDateDeadline(null)
    } catch (err) {
      setError(err.data?.name?.[0] ?? 'Could not add that subtask.')
    } finally {
      setAdding(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add a subtask…"
          className="h-8 flex-1 bg-white text-xs"
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

      <div>
        <button
          type="button"
          onClick={() => setEditingDeadline((v) => !v)}
          disabled={adding}
          className="w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:pointer-events-none disabled:opacity-60"
        >
          {dateDeadline ? `Due ${formatDeadline(dateDeadline)}` : 'Set deadline'}
        </button>
        {editingDeadline && (
          // Flowed inline rather than the usual floating popover (see
          // DeadlineEditor's own default `absolute` positioning) —
          // this form can sit near the bottom of a short card (e.g. a
          // task with no other subtasks yet), and a popover expanding
          // downward from there has nowhere to go but over whatever's
          // below in the page, which on the list view is the *next*
          // task card. Flowing inline instead just grows the form (and
          // the card around it) to fit, the same override AddTaskFab
          // already used for its own non-floating case.
          <DeadlineEditor
            value={dateDeadline}
            onSave={handlePickDeadline}
            onCancel={() => setEditingDeadline(false)}
            className="static mt-2 w-full shadow-none"
          />
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  )
}
