import { useState } from 'react'
import { Trash2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SubtaskList } from '@/components/SubtaskList'
import { cn } from '@/lib/utils'

const PROGRESS_GRADIENT = 'bg-gradient-to-r from-[#e0c3fc] via-[#7c5fb0] to-[#8ec5fc]'

function formatDeadline(iso) {
  // Explicit UTC so the displayed date always matches what was actually
  // stored/submitted, regardless of the viewer's local timezone — a
  // plain toLocaleDateString() can roll the date back a day for anyone
  // west of UTC.
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

// Subtasks collectively count for 80% of the bar; the last 20% only
// closes up when the task itself is explicitly checked off complete —
// finishing every subtask does not do this automatically (see
// Task.update_completion_status on the backend), so the last 20% is a
// deliberate separate action, gated on every subtask already being
// done. A task with no subtasks has no 80/20 split to make — its own
// completion is the whole bar.
function calculateProgress(task) {
  const total = task.subtasks.length
  if (total === 0) {
    return task.completed ? 100 : 0
  }
  const completed = task.subtasks.filter((s) => s.completed).length
  const subtaskShare = (completed / total) * 80
  const completionShare = task.completed ? 20 : 0
  return Math.round(subtaskShare + completionShare)
}

// Presentational, with local UI state for the deadline editor, the
// delete confirm step, and whether the full subtask manager is
// expanded. `onToggleComplete`/`onSetDeadline` are called with the task
// and the new value; the parent (TaskList) owns updating the server and
// reconciling local state — this component never talks to the API
// directly.
export function TaskCard({
  task,
  onToggleComplete,
  onSetDeadline,
  onDelete,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
}) {
  const [editingDeadline, setEditingDeadline] = useState(false)
  const [deadlineInput, setDeadlineInput] = useState(
    task.dateDeadline ? task.dateDeadline.slice(0, 10) : ''
  )
  const [deadlineError, setDeadlineError] = useState(null)
  const [savingDeadline, setSavingDeadline] = useState(false)
  const [expanded, setExpanded] = useState(false)

  // Two clicks to actually delete: the first just reveals a confirm
  // step, in-line rather than a browser confirm() dialog. Only reset
  // `deleting` on failure — on success the card unmounts along with the
  // rest of this state.
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  async function handleDeleteConfirm() {
    setDeleteError(null)
    setDeleting(true)
    try {
      await onDelete(task)
    } catch (err) {
      setDeleteError(err.data?.detail ?? 'Could not delete this task.')
      setDeleting(false)
      setConfirmingDelete(false)
    }
  }

  async function handleDeadlineSubmit(event) {
    event.preventDefault()
    setDeadlineError(null)
    setSavingDeadline(true)

    try {
      await onSetDeadline(
        task,
        deadlineInput ? new Date(deadlineInput).toISOString() : null
      )
      setEditingDeadline(false)
    } catch (err) {
      setDeadlineError(err.data?.dateDeadline?.[0] ?? 'Could not update the deadline.')
    } finally {
      setSavingDeadline(false)
    }
  }

  const progress = calculateProgress(task)

  // Completing a task is gated on every subtask already being done —
  // this only blocks the pending -> completed direction; reopening an
  // already-completed task is always allowed regardless of subtask
  // state.
  const hasIncompleteSubtasks = task.subtasks.some((s) => !s.completed)
  const blockedFromCompleting = !task.completed && hasIncompleteSubtasks

  function handleToggleClick() {
    if (blockedFromCompleting) return
    onToggleComplete(task, !task.completed)
  }

  // Subtasks with a deadline come first (soonest first) since those are
  // the ones actually "due" — but the cascade shouldn't just disappear
  // for a task whose subtasks don't have dates yet, so if that leaves
  // fewer than 2 showing, it's backfilled with other incomplete
  // subtasks up to 2 (only when at least 2 incomplete subtasks actually
  // exist — never manufacturing a second entry that isn't there).
  // Capped at 3 either way — that's what the expanded manager below is
  // for.
  const incompleteSubtasks = task.subtasks.filter((s) => !s.completed)
  const dueSubtasks = incompleteSubtasks
    .filter((s) => s.dateDeadline)
    .sort((a, b) => new Date(a.dateDeadline) - new Date(b.dateDeadline))
  const undatedSubtasks = incompleteSubtasks.filter((s) => !s.dateDeadline)
  const minToShow = Math.min(2, incompleteSubtasks.length)
  const nextUp = [
    ...dueSubtasks,
    ...undatedSubtasks.slice(0, Math.max(0, minToShow - dueSubtasks.length)),
  ].slice(0, 3)

  return (
    <div className="w-full rounded-2xl border bg-card p-5 shadow-sm">
      {/* ---- header row: status toggle, name, due date, delete ---- */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleToggleClick}
          disabled={blockedFromCompleting}
          title={blockedFromCompleting ? 'Complete all subtasks first' : undefined}
          className={cn(
            'shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
            task.completed
              ? cn(PROGRESS_GRADIENT, 'text-white hover:opacity-90')
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
            blockedFromCompleting && 'cursor-not-allowed opacity-60 hover:bg-secondary'
          )}
        >
          {task.completed ? 'Completed' : 'Pending'}
        </button>

        <span
          className={cn(
            'flex-1 truncate text-lg font-semibold',
            task.completed && 'text-muted-foreground line-through'
          )}
        >
          {task.name}
        </span>

        {task.completed ? (
          // Once completed, this slot shows when it was finished rather
          // than the (now moot) deadline — not editable, just a record.
          // Older tasks completed before dateCompleted existed won't
          // have one; the label still makes sense without a date.
          <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            Completed{task.dateCompleted ? ` ${formatDeadline(task.dateCompleted)}` : ''}
          </span>
        ) : editingDeadline ? (
          <form onSubmit={handleDeadlineSubmit} className="flex shrink-0 items-center gap-2">
            <Input
              type="date"
              value={deadlineInput}
              onChange={(e) => setDeadlineInput(e.target.value)}
              className="h-8 w-36"
              autoFocus
            />
            <Button type="submit" size="sm" disabled={savingDeadline}>
              {savingDeadline ? 'Saving…' : 'Save'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingDeadline(false)
                setDeadlineError(null)
                setDeadlineInput(task.dateDeadline ? task.dateDeadline.slice(0, 10) : '')
              }}
            >
              Cancel
            </Button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setEditingDeadline(true)}
            className="shrink-0 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
          >
            {task.dateDeadline ? `Due ${formatDeadline(task.dateDeadline)}` : 'Set deadline'}
          </button>
        )}

        {confirmingDelete ? (
          <div className="flex shrink-0 items-center gap-1">
            <Button size="sm" variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Confirm'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(false)} disabled={deleting}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={() => setConfirmingDelete(true)}
            aria-label="Delete task"
            className="shrink-0"
          >
            <Trash2 />
          </Button>
        )}
      </div>

      {deleteError && <p className="mt-2 text-xs text-destructive">{deleteError}</p>}
      {deadlineError && <p className="mt-2 text-xs text-destructive">{deadlineError}</p>}
      {blockedFromCompleting && (
        <p className="mt-2 text-xs text-muted-foreground">Complete all subtasks to mark this task done.</p>
      )}

      {/* ---- progress meter ---- */}
      <div className="mt-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full transition-all duration-500 ease-out', PROGRESS_GRADIENT)}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{progress}% complete</p>
      </div>

      {/* ---- cascading preview of the next due subtask(s) ---- */}
      {nextUp.length > 0 && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setExpanded(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setExpanded(true)
            }
          }}
          className="mt-4 cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Next up <span className="text-muted-foreground/70">— click to see all subtasks</span>
          </p>
          <div
            className="relative"
            style={{ height: `${40 + (nextUp.length - 1) * 12}px` }}
          >
            {nextUp.map((subtask, i) => (
              <div
                key={subtask.id}
                className={cn(
                  'absolute inset-x-0 flex items-center justify-between rounded-lg border px-3 py-2 text-xs transition-all',
                  i === 0 ? 'bg-card font-medium shadow-sm' : 'bg-muted/60 text-muted-foreground'
                )}
                style={{
                  top: `${i * 12}px`,
                  zIndex: nextUp.length - i,
                  opacity: 1 - i * 0.3,
                  transform: `scale(${1 - i * 0.03})`,
                }}
              >
                <span className="truncate">{subtask.name}</span>
                {subtask.dateDeadline && (
                  <span className="shrink-0 pl-2 text-muted-foreground">
                    Due {formatDeadline(subtask.dateDeadline)}
                  </span>
                )}
              </div>
            ))}
            {/* fades the bottom of the stack out instead of ending on a
                hard edge, reinforcing that it's a peek, not the full list */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-card to-transparent" />
          </div>
        </div>
      )}

      {/* ---- expandable manager: full subtask list (deadline editing
          now lives inline in the header, on the due-date text itself) ----
          A task with no subtasks yet gets an invitation to add its first
          one instead of a "manage" toggle that would just open onto an
          empty list. */}
      {task.subtasks.length === 0 && !expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-4 text-xs font-medium text-sky-600 hover:text-sky-700 hover:underline"
        >
          Want to break this down into smaller chunks? Add subtasks
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className={cn('size-3.5 transition-transform', expanded && 'rotate-180')} />
          {expanded ? 'Hide details' : 'Manage subtasks'}
        </button>
      )}

      {expanded && (
        <div className="mt-3 flex flex-col gap-3 border-t pt-3">
          <SubtaskList
            task={task}
            onAdd={(name) => onAddSubtask(task, name)}
            onToggle={(subtask, completed) => onToggleSubtask(task, subtask, completed)}
            onDelete={(subtask) => onDeleteSubtask(task, subtask)}
          />
        </div>
      )}
    </div>
  )
}
