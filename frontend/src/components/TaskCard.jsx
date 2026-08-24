import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, CornerDownRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { AddSubtaskForm } from '@/components/AddSubtaskForm'
import { ConfettiBurst } from '@/components/ConfettiBurst'
import { cn, formatDeadline, calculateProgress } from '@/lib/utils'
import { useDeadlineStatus } from '@/hooks/useDeadlineStatus'
import { DeadlineEditor } from '@/components/DeadlineEditor'
import { PulseRing } from '@/components/PulseRing'

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
//
// `partOf` is what turns this from a stack row into a standalone card:
// passed only when the task list promotes a subtask to its own spot in
// the sort (see TaskList's due-date bucketing), it swaps the absolute
// stack positioning for normal flow and adds a plain "Part of ..."
// tag above the card — grey by default, blue only on hover, same
// hover-reveal restraint as the rest of the app's hint text — that
// jumps back to the full task's card instead of navigating away.
export function SubtaskStackCard({
  subtask,
  dimmed,
  justCompleted,
  style,
  onToggleComplete,
  onSetDeadline,
  onDelete,
  partOf,
  pulseReady = true,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editingDeadline, setEditingDeadline] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [busy, setBusy] = useState(false)
  const deleteRef = useRef(null)
  const menuRef = useRef(null)
  const checked = subtask.completed || justCompleted
  const countdown = useDeadlineStatus(subtask.dateDeadline, checked)

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

  useEffect(() => {
    if (!confirmingDelete) return
    function handleOutsideClick(e) {
      if (deleteRef.current && !deleteRef.current.contains(e.target)) {
        setConfirmingDelete(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [confirmingDelete])

  async function handleDeleteConfirm(e) {
    e.stopPropagation()
    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
      setConfirmingDelete(false)
    }
  }

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

  async function handleDeadlineSave(dateDeadline) {
    await onSetDeadline(dateDeadline)
    setEditingDeadline(false)
  }

  const rowContent = (
    <>
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
        <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
          <DeadlineEditor
            value={subtask.dateDeadline}
            onSave={handleDeadlineSave}
            onCancel={() => setEditingDeadline(false)}
          />
        </div>
      ) : subtask.dateDeadline ? (
        <div className="relative shrink-0" ref={menuRef}>
          {(countdown.isOverdue || countdown.isUrgent) && <PulseRing ready={pulseReady} />}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen((v) => !v)
            }}
            className={cn(
              'relative rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums transition-colors',
              countdown.isOverdue
                ? 'bg-red-700 text-white hover:bg-red-800'
                : countdown.isUrgent
                  ? 'bg-red-50 text-red-700 hover:bg-red-100'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            )}
          >
            {countdown.isOverdue
              ? 'Overdue'
              : countdown.isUrgent
                ? `Due in: ${countdown.countdownDisplay}`
                : `Due ${formatDeadline(subtask.dateDeadline)}`}
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

      <div className="relative shrink-0" ref={deleteRef}>
        {confirmingDelete ? (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute top-full right-0 z-20 mt-1 w-44 rounded-lg border bg-card p-2.5 text-left shadow-lg"
          >
            <p className="text-[11px] text-muted-foreground">Are you sure you want to delete this subtask?</p>
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="text-[11px] text-muted-foreground hover:underline"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="text-[11px] font-medium text-destructive hover:underline"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setConfirmingDelete(true)
            }}
            aria-label="Delete subtask"
            className="text-muted-foreground transition-colors hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>
    </>
  )

  if (!partOf) {
    return (
      <div
        className={cn(
          'absolute inset-x-0 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all duration-300 ease-in-out',
          dimmed ? 'bg-muted/60 text-muted-foreground' : 'bg-card shadow-sm'
        )}
        style={style}
      >
        {rowContent}
      </div>
    )
  }

  // The promoted-into-the-list version: one small card (same compact
  // sizing as a stack row, not a full task card), the subtask itself
  // on top and the "Part of ..." jump-back tag inside the same
  // border, below it — not a separate floating line above the card.
  // Bare text + arrow, grey by default and blue only on hover, same
  // hover-reveal restraint as the rest of the app's hint text.
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-lg border px-3 py-2 text-xs transition-all duration-300 ease-in-out',
        dimmed ? 'bg-muted/60 text-muted-foreground' : 'bg-card shadow-sm'
      )}
    >
      <div className="flex items-center gap-2">{rowContent}</div>
      <button
        type="button"
        onClick={partOf.onClick}
        className="flex w-fit items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-sky-600"
      >
        <CornerDownRight className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{partOf.label}</span>
      </button>
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
export function PendingCompleteButton({ task, blocked, onClick }) {
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
  onDeleteSubtask,
  pulseReady = true,
}) {
  const navigate = useNavigate()
  const [editingDeadline, setEditingDeadline] = useState(false)
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

  async function handleDeadlineSave(dateDeadline) {
    await onSetDeadline(task, dateDeadline)
    setEditingDeadline(false)
  }

  const progress = calculateProgress(task)
  const countdown = useDeadlineStatus(task.dateDeadline, task.completed)

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
      id={`task-${task.id}`}
      onClick={() => navigate(`/tasks/${task.id}`)}
      className="relative w-full cursor-pointer rounded-2xl border bg-card p-5 shadow-sm transition-shadow duration-500 hover:shadow-md"
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
            <div className="relative">
              <DeadlineEditor
                value={task.dateDeadline}
                onSave={handleDeadlineSave}
                onCancel={() => setEditingDeadline(false)}
                minDayOffset={0}
              />
            </div>
          ) : (
            <span className="relative inline-flex">
              {(countdown.isOverdue || countdown.isUrgent) && <PulseRing ready={pulseReady} />}
              <button
                type="button"
                onClick={() => setEditingDeadline(true)}
                className={cn(
                  'relative rounded-full px-3 py-1 text-xs font-medium tabular-nums transition-colors',
                  countdown.isOverdue
                    ? 'bg-red-700 text-white hover:bg-red-800'
                    : countdown.isUrgent
                      ? 'bg-red-50 text-red-700 hover:bg-red-100'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                )}
              >
                {countdown.isOverdue
                  ? 'Overdue'
                  : countdown.isUrgent
                    ? `Due in: ${countdown.countdownDisplay}`
                    : task.dateDeadline
                      ? `Due ${formatDeadline(task.dateDeadline)}`
                      : 'Set deadline'}
              </button>
            </span>
          )}
        </div>

        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          {confirmingDelete ? (
            <div className="flex flex-col items-end gap-1">
              <p className="text-xs text-muted-foreground">Are you sure you want to delete this task?</p>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>
                  {deleting ? 'Deleting…' : 'Confirm'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(false)} disabled={deleting}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={() => setConfirmingDelete(true)}
              aria-label="Delete task"
              className="hover:text-destructive"
            >
              <Trash2 />
            </Button>
          )}
        </div>
      </div>

      {deleteError && <p className="mt-2 text-xs text-destructive">{deleteError}</p>}

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
                  onDelete={() => onDeleteSubtask(task, subtask)}
                  pulseReady={pulseReady}
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
            <p className="mt-4 text-xs text-muted-foreground">
              Want to break this down into smaller chunks?{' '}
              <button
                type="button"
                onClick={() => setAddingSubtask(true)}
                className="font-medium text-sky-600 hover:text-sky-700 hover:underline"
              >
                Add subtasks
              </button>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
