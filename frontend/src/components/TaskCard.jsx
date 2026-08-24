import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { AddSubtaskForm } from '@/components/AddSubtaskForm'
import { ConfettiBurst } from '@/components/ConfettiBurst'
import { cn, formatDeadline, calculateProgress } from '@/lib/utils'

const PROGRESS_GRADIENT = 'bg-gradient-to-r from-[#e0c3fc] via-[#7c5fb0] to-[#8ec5fc]'
// The hover-fill preview on the Pending button (see PendingCompleteButton).
const HOVER_FILL_MS = 350
// How long a just-checked subtask stays visible — checkmark filled in,
// name crossed out — before it's actually allowed to drop out of the
// stack. Comfortably over 1 second per spec.
const SUBTASK_CELEBRATION_MS = 1400

// Row pitch/height for the two states of the subtask stack: collapsed
// (overlapping peek) vs. expanded (fully separated). Both are plain
// numbers rather than CSS classes because the whole point is animating
// between them — top/height/opacity/scale all interpolate smoothly
// with a CSS transition, so switching from one set of numbers to the
// other is what produces the "drop down"/"retract" effect, not a swap
// of layout modes. It's the same set of (up to 3) subtasks in both
// states — expanding doesn't reveal more, just spreads out what's
// already there. Seeing everything is what the task detail page
// ("View more") is for.
const COLLAPSED_ROW_HEIGHT = 40
const COLLAPSED_PITCH = 12
const EXPANDED_ROW_HEIGHT = 40
const EXPANDED_PITCH = 48

// One subtask card in the stack. The checkbox and the due-date bubble
// are the interactive parts — the due-date bubble opens a small menu
// (mark complete / change deadline) as an alternative path to the same
// completion action. Every click handler here stops propagation: this
// sits inside both the stack's own expand/collapse toggle and the whole
// card's click-to-open-detail-page behavior, and interacting with
// either control should do neither. `justCompleted` is true for the
// brief window (see SUBTASK_CELEBRATION_MS) after checking it off,
// during which the parent deliberately keeps rendering it here instead
// of letting it drop out immediately — long enough for the checkmark +
// strikethrough to actually read as an animation.
function SubtaskStackCard({ subtask, dimmed, justCompleted, style, onToggleComplete, onSetDeadline }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editingDeadline, setEditingDeadline] = useState(false)
  const [deadlineInput, setDeadlineInput] = useState(
    subtask.dateDeadline ? subtask.dateDeadline.slice(0, 10) : ''
  )
  const [busy, setBusy] = useState(false)
  const menuRef = useRef(null)
  const checked = subtask.completed || justCompleted

  useEffect(() => {
    if (!menuOpen) return
    function handleOutsideClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [menuOpen])

  async function handleMarkComplete(e) {
    e.stopPropagation()
    setMenuOpen(false)
    setBusy(true)
    try {
      await onToggleComplete(true)
    } finally {
      setBusy(false)
    }
  }

  // Checkbox.onCheckedChange hands back a boolean, not an event — the
  // stopPropagation happens via the Checkbox's own onClick instead.
  async function handleCheckboxChange(value) {
    setBusy(true)
    try {
      await onToggleComplete(value)
    } finally {
      setBusy(false)
    }
  }

  async function handleDeadlineSubmit(e) {
    e.preventDefault()
    e.stopPropagation()
    setBusy(true)
    try {
      await onSetDeadline(deadlineInput ? new Date(deadlineInput).toISOString() : null)
      setEditingDeadline(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={cn(
        'absolute inset-x-0 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all duration-300 ease-in-out',
        dimmed ? 'bg-muted/60 text-muted-foreground' : 'bg-card shadow-sm'
      )}
      style={style}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={handleCheckboxChange}
        onClick={(e) => e.stopPropagation()}
        disabled={busy || justCompleted}
        className="shrink-0 data-checked:border-emerald-500 data-checked:bg-emerald-500"
      />
      <span
        className={cn(
          'flex-1 truncate font-medium transition-colors duration-300',
          checked && 'text-muted-foreground line-through'
        )}
      >
        {subtask.name}
      </span>

      {editingDeadline ? (
        <form
          onSubmit={handleDeadlineSubmit}
          onClick={(e) => e.stopPropagation()}
          className="flex shrink-0 items-center gap-1"
        >
          <input
            type="date"
            value={deadlineInput}
            onChange={(e) => setDeadlineInput(e.target.value)}
            autoFocus
            className="h-6 w-28 rounded border border-input bg-transparent px-1 text-[11px] outline-none focus-visible:border-ring"
          />
          <button type="submit" disabled={busy} className="font-medium text-emerald-700 hover:underline">
            Save
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setEditingDeadline(false)
            }}
            className="text-muted-foreground hover:underline"
          >
            Cancel
          </button>
        </form>
      ) : subtask.dateDeadline ? (
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen((v) => !v)
            }}
            className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 transition-colors hover:bg-amber-100"
          >
            Due {formatDeadline(subtask.dateDeadline)}
          </button>
          {menuOpen && (
            <div className="absolute top-full right-0 z-10 mt-1 w-40 overflow-hidden rounded-lg border bg-card py-1 shadow-lg">
              <button
                type="button"
                onClick={handleMarkComplete}
                disabled={busy}
                className="block w-full px-3 py-1.5 text-left text-[11px] font-medium hover:bg-muted"
              >
                Mark as completed
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setEditingDeadline(true)
                  setMenuOpen(false)
                }}
                className="block w-full px-3 py-1.5 text-left text-[11px] font-medium hover:bg-muted"
              >
                Change deadline
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

// The task's own status toggle. When it's clickable (not completed, and
// not blocked on incomplete subtasks), hovering previews what clicking
// it would do: the gradient sweeps in from the left like a loading bar
// and the label flips to "Complete" once it's fully filled. That preview
// is purely visual — the button is fully clickable at every point along
// the fill, not just once it finishes; a click always fires immediately
// regardless of hover progress. Moving the mouse away cancels the timer
// and the fill retreats (plain CSS transition reversing).
function PendingCompleteButton({ task, blocked, onClick }) {
  const [hoverFilled, setHoverFilled] = useState(false)
  const timerRef = useRef(null)

  function handleMouseEnter() {
    if (task.completed || blocked) return
    timerRef.current = setTimeout(() => setHoverFilled(true), HOVER_FILL_MS)
  }

  function handleMouseLeave() {
    clearTimeout(timerRef.current)
    setHoverFilled(false)
  }

  useEffect(() => () => clearTimeout(timerRef.current), [])

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      disabled={blocked}
      title={blocked ? 'Complete all subtasks first' : undefined}
      className={cn(
        'group relative shrink-0 overflow-hidden rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
        task.completed
          ? cn(PROGRESS_GRADIENT, 'text-white hover:opacity-90')
          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        blocked && 'cursor-not-allowed opacity-60 hover:bg-secondary'
      )}
    >
      {!task.completed && !blocked && (
        <span
          aria-hidden="true"
          className={cn(
            PROGRESS_GRADIENT,
            'absolute inset-0 origin-left scale-x-0 transition-transform ease-linear group-hover:scale-x-100'
          )}
          style={{ transitionDuration: `${HOVER_FILL_MS}ms` }}
        />
      )}
      <span className={cn('relative', hoverFilled && !task.completed && 'text-white')}>
        {task.completed ? 'Completed' : hoverFilled ? 'Complete' : 'Pending'}
      </span>
    </button>
  )
}

// Presentational, with local UI state for the deadline editor, the
// delete confirm step, and whether the subtask stack is expanded.
// `onToggleComplete`/`onSetDeadline` are called with the task and the
// new value; the parent (TaskList) owns updating the server and
// reconciling local state — this component never talks to the API
// directly.
export function TaskCard({
  task,
  celebrating,
  onToggleComplete,
  onSetDeadline,
  onDelete,
  onAddSubtask,
  onToggleSubtask,
  onSetSubtaskDeadline,
}) {
  const navigate = useNavigate()
  const [editingDeadline, setEditingDeadline] = useState(false)
  const [deadlineInput, setDeadlineInput] = useState(
    task.dateDeadline ? task.dateDeadline.slice(0, 10) : ''
  )
  const [deadlineError, setDeadlineError] = useState(null)
  const [savingDeadline, setSavingDeadline] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [addingSubtask, setAddingSubtask] = useState(false)
  // Subtask ids currently mid-celebration — held in the visible stack
  // (as "incomplete") until their timer clears, so checking one off
  // doesn't just instantly vanish it. See SUBTASK_CELEBRATION_MS.
  const [celebratingSubtaskIds, setCelebratingSubtaskIds] = useState(() => new Set())

  function handleToggleSubtaskComplete(subtask, checked) {
    if (checked) {
      setCelebratingSubtaskIds((current) => new Set(current).add(subtask.id))
      setTimeout(() => {
        setCelebratingSubtaskIds((current) => {
          const next = new Set(current)
          next.delete(subtask.id)
          return next
        })
      }, SUBTASK_CELEBRATION_MS)
    }
    return onToggleSubtask(task, subtask, checked)
  }

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

  // The 3 most due subtasks: deadline first (soonest first), backfilled
  // with other incomplete subtasks (even undated) so at least 2 show
  // whenever at least 2 incomplete subtasks exist — never manufacturing
  // a second entry that isn't there. If every subtask is already done,
  // falls back to showing one of them so there's still something to
  // click into. A subtask mid-celebration still counts as "incomplete"
  // here — it's checked off server-side already, but stays put in the
  // stack (rendered with the checkmark + strikethrough) until its timer
  // clears, rather than vanishing the instant the request resolves.
  const incompleteSubtasks = task.subtasks.filter(
    (s) => !s.completed || celebratingSubtaskIds.has(s.id)
  )
  const dueSubtasks = incompleteSubtasks
    .filter((s) => s.dateDeadline)
    .sort((a, b) => new Date(a.dateDeadline) - new Date(b.dateDeadline))
  const undatedSubtasks = incompleteSubtasks.filter((s) => !s.dateDeadline)
  const minToShow = Math.min(2, incompleteSubtasks.length)
  const previewSubtasks = [
    ...dueSubtasks,
    ...undatedSubtasks.slice(0, Math.max(0, minToShow - dueSubtasks.length)),
  ].slice(0, 3)
  const rows = previewSubtasks.length > 0 ? previewSubtasks : task.subtasks.slice(0, 1)

  const rowHeight = expanded ? EXPANDED_ROW_HEIGHT : COLLAPSED_ROW_HEIGHT
  const pitch = expanded ? EXPANDED_PITCH : COLLAPSED_PITCH
  const stackHeight = rows.length > 0 ? (rows.length - 1) * pitch + rowHeight : 0
  const hasMoreThanShown = task.subtasks.length > rows.length

  function handleStackKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setExpanded((v) => !v)
    }
  }

  return (
    // The whole card opens the task detail page — everything that
    // isn't that (the status toggle, the deadline control, delete, the
    // subtask stack, the add-subtask link) stops its own click from
    // bubbling up to this, rather than this component trying to guess
    // "was that a real link" from the event target.
    <div
      onClick={() => navigate(`/tasks/${task.id}`)}
      className="relative w-full cursor-pointer rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      {celebrating && <ConfettiBurst />}

      {/* ---- header row: status toggle, name, due date, delete ---- */}
      <div className="flex items-center gap-4">
        <PendingCompleteButton task={task} blocked={blockedFromCompleting} onClick={handleToggleClick} />

        <span
          className={cn(
            'flex-1 truncate text-lg font-semibold',
            task.completed && 'text-muted-foreground line-through'
          )}
        >
          {task.name}
        </span>

        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          {task.completed ? (
            // Once completed, this slot shows when it was finished
            // rather than the (now moot) deadline — not editable, just
            // a record. Older tasks completed before dateCompleted
            // existed won't have one; the label still makes sense
            // without a date.
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              Completed{task.dateCompleted ? ` ${formatDeadline(task.dateCompleted)}` : ''}
            </span>
          ) : editingDeadline ? (
            <form onSubmit={handleDeadlineSubmit} className="flex items-center gap-2">
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
              className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
            >
              {task.dateDeadline ? `Due ${formatDeadline(task.dateDeadline)}` : 'Set deadline'}
            </button>
          )}
        </div>

        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          {confirmingDelete ? (
            <div className="flex items-center gap-1">
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
            >
              <Trash2 />
            </Button>
          )}
        </div>
      </div>

      {deleteError && <p className="mt-2 text-xs text-destructive">{deleteError}</p>}
      {deadlineError && <p className="mt-2 text-xs text-destructive">{deadlineError}</p>}

      {/* ---- progress meter — hover reveals why it's not completable
          yet, instead of a permanently-visible line of instructions ---- */}
      <div className="group/progress relative mt-4">
        {blockedFromCompleting && (
          <div className="pointer-events-none absolute -top-8 left-0 z-10 rounded-md bg-foreground px-2 py-1 text-xs whitespace-nowrap text-background opacity-0 shadow-md transition-opacity duration-150 group-hover/progress:opacity-100">
            Complete all subtasks to mark this task done.
          </div>
        )}
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full transition-all duration-500 ease-out', PROGRESS_GRADIENT)}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{progress}% complete</p>
      </div>

      {/* ---- subtask stack: click the top card to spread the (up to 3)
          most-due subtasks out; click it again to pull them back into
          the stacked peek. Same cards throughout, just animating
          between overlapping and separated. "View more" is the only
          way to see beyond these 3 — that's the task detail page's job. ---- */}
      {task.subtasks.length > 0 && (
        <div className="mt-4" onClick={(e) => e.stopPropagation()}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => setExpanded((v) => !v)}
            onKeyDown={handleStackKeyDown}
            className="group/cascade relative cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <div className="pointer-events-none absolute -top-7 left-0 z-10 rounded-md bg-foreground px-2 py-1 text-xs whitespace-nowrap text-background opacity-0 shadow-md transition-opacity duration-150 group-hover/cascade:opacity-100">
              {expanded ? 'Click to collapse' : 'Click to see more'}
            </div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              {previewSubtasks.length > 0 ? 'Next up' : 'All done'}
            </p>

            <div
              className="relative transition-[height] duration-300 ease-in-out"
              style={{ height: `${stackHeight}px` }}
            >
              {rows.map((subtask, i) => (
                <SubtaskStackCard
                  key={subtask.id}
                  subtask={subtask}
                  dimmed={!expanded && i > 0}
                  justCompleted={celebratingSubtaskIds.has(subtask.id)}
                  style={{
                    top: `${i * pitch}px`,
                    height: `${rowHeight}px`,
                    zIndex: rows.length - i,
                    opacity: expanded ? 1 : 1 - i * 0.3,
                    transform: expanded ? 'scale(1)' : `scale(${1 - i * 0.03})`,
                  }}
                  onToggleComplete={(checked) => handleToggleSubtaskComplete(subtask, checked)}
                  onSetDeadline={(dateDeadline) => onSetSubtaskDeadline(task, subtask, dateDeadline)}
                />
              ))}
              {/* fades the bottom of the collapsed stack out instead of
                  ending on a hard edge, reinforcing that it's a peek */}
              {!expanded && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-card to-transparent" />
              )}
            </div>
          </div>

          {expanded && hasMoreThanShown && (
            <button
              type="button"
              onClick={() => navigate(`/tasks/${task.id}`)}
              className="mt-2 text-xs font-medium text-sky-600 hover:text-sky-700 hover:underline"
            >
              View more →
            </button>
          )}
        </div>
      )}

      {/* A task with no subtasks yet gets an invitation to add its
          first one instead of a stack with nothing in it. */}
      {task.subtasks.length === 0 && (
        <div onClick={(e) => e.stopPropagation()}>
          {addingSubtask ? (
            <div className="mt-4">
              <AddSubtaskForm onAdd={(name) => onAddSubtask(task, name)} />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingSubtask(true)}
              className="mt-4 text-xs font-medium text-sky-600 hover:text-sky-700 hover:underline"
            >
              Want to break this down into smaller chunks? Add subtasks
            </button>
          )}
        </div>
      )}
    </div>
  )
}
