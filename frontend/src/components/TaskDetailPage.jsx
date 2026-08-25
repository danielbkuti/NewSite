import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { updateTask, deleteTask, createSubTask, updateSubTask, deleteSubTask } from '@/lib/tasks'
import { cn, formatDeadline, calculateProgress, isDeadlineUrgent } from '@/lib/utils'
import { useDeadlineStatus } from '@/hooks/useDeadlineStatus'
import { useTaskStore } from '@/context/TaskStoreContext'
import { DeadlineEditor } from '@/components/DeadlineEditor'
import { AddSubtaskForm } from '@/components/AddSubtaskForm'
import { InlineEditableName } from '@/components/InlineEditableName'
import { ConfettiBurst } from '@/components/ConfettiBurst'
import { PendingCompleteButton } from '@/components/TaskCard'
import { PulseRing } from '@/components/PulseRing'

const PROGRESS_GRADIENT = 'bg-gradient-to-r from-[#e0c3fc] via-[#7c5fb0] to-[#8ec5fc]'
// How long a just-checked subtask stays in place (checkbox filled
// green, name struck through) before it's actually allowed to resort
// into the completed group — same idea as the cascade on the task
// card, so checking one off here doesn't just instantly relocate it.
const SUBTASK_CELEBRATION_MS = 1400
// Same idea, for the task's own completion — only relevant when there
// are no subtasks (see the Pending/Complete button below), since with
// subtasks the task's completion is still gated behind the list, not
// this page.
const TASK_CELEBRATION_MS = 1300
// How long the "due soon, consider extending" bubble stays up before
// fading — it's a one-time heads-up on opening the page, not a
// persistent banner.
const DEADLINE_HINT_MS = 5000
// How long `justSavedDeadline` stays true after a save — just needs to
// clear the single pulse PulseRing plays off that true edge (1s) with
// a little room to spare, so a later unrelated re-render doesn't find
// it still true and think a save just happened again.
const PULSE_CONFIRM_MS = 1200
// Same cap as the main task list's Completed section — only the
// freshest few completed subtasks show here, the rest live on
// /progress alongside every other completed task/subtask.
const COMPLETED_SUBTASK_PREVIEW_COUNT = 3

// The "View more" destination from a task card's subtask stack — the
// first real single-task view. Title, progress (or a "Complete" bubble
// once the task itself is done), and every subtask as its own card,
// with a working checkbox. Completed subtasks move into their own
// group ordered by when each was actually finished (most recent
// first, right after the still-open ones) rather than always dropping
// to the very bottom of the whole list.
export function TaskDetailPage() {
  const { id } = useParams()
  const numericId = Number(id)
  const navigate = useNavigate()
  // Reads the task straight out of the shared store rather than
  // keeping its own independent copy — this is what makes the FAB's
  // detail-page actions (add subtask, set deadline, add description)
  // show up here without a full page reload: the FAB mutates through
  // the same store, so this page just re-renders. `status` mirrors the
  // store's own loading/error state; a task genuinely missing from an
  // already-`ready` store (deleted elsewhere, wrong id, not yours) is
  // handled separately below, not as a loading state.
  const { tasks, status, mergeTask, removeTask, refreshTask } = useTaskStore()
  const task = tasks.find((t) => t.id === numericId) ?? null
  const [busyIds, setBusyIds] = useState(() => new Set())
  // Subtask ids mid-celebration — kept sorted as "not yet done" until
  // their timer clears, so checking one off doesn't instantly jump it.
  const [celebratingIds, setCelebratingIds] = useState(() => new Set())
  // Same idea, for the task's own Pending -> Complete button (only
  // rendered when there are no subtasks — see below).
  const [celebratingTask, setCelebratingTask] = useState(false)
  const [showDeadlineHint, setShowDeadlineHint] = useState(false)
  const [deadlineHintMounted, setDeadlineHintMounted] = useState(false)
  const hintCheckedRef = useRef(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const [editingDeadline, setEditingDeadline] = useState(false)
  const [addingSubtask, setAddingSubtask] = useState(false)
  // Flipped true right after a successful deadline save, then back to
  // false a moment later — PulseRing uses the true edge to fire one
  // confirming pulse, independent of whether the new deadline is
  // actually overdue/urgent.
  const [justSavedDeadline, setJustSavedDeadline] = useState(false)
  // Safe to call unconditionally with an as-yet-null task (dateDeadline
  // undefined just means "no deadline", same as the loaded case) —
  // has to run before the loading/error early returns below since
  // hooks can't be conditional. `liveOverdue` matches the subtask
  // rows on this page: this is the one place the app shows a genuinely
  // ticking "how overdue" duration, in days once it runs past 24h.
  const deadlineStatus = useDeadlineStatus(task?.dateDeadline, task?.completed, { liveOverdue: true })

  // One-time check, the moment the task first loads: if the task or any
  // of its still-open subtasks is close to its deadline, briefly nudge
  // toward extending it. Guarded by a ref (not just `status`) so later
  // refetches — e.g. after checking a subtask off — don't re-trigger it.
  useEffect(() => {
    if (status !== 'ready' || !task || hintCheckedRef.current) return
    hintCheckedRef.current = true

    const anyUrgent =
      isDeadlineUrgent(task.dateDeadline, task.completed) ||
      task.subtasks.some((s) => isDeadlineUrgent(s.dateDeadline, s.completed))

    if (anyUrgent) {
      setDeadlineHintMounted(true)
      setShowDeadlineHint(true)
    }
  }, [status, task])

  // Deliberately a separate effect from the one-time check above rather
  // than starting the timer in there directly: that effect is guarded
  // by a ref so it only ever *decides* to show the hint once, but
  // StrictMode double-invokes effects in development (mount -> cleanup
  // -> mount) to catch exactly this kind of bug — a timer armed and
  // torn down inside a ref-guarded effect never gets re-armed on the
  // second invocation, since the guard blocks it. Keyed on
  // showDeadlineHint instead, this one has no such guard, so it
  // correctly re-arms after StrictMode's cleanup.
  useEffect(() => {
    if (!showDeadlineHint) return
    const timer = setTimeout(() => setShowDeadlineHint(false), DEADLINE_HINT_MS)
    return () => clearTimeout(timer)
  }, [showDeadlineHint])

  // Same "create then re-fetch" pattern as the toggle handler below —
  // this page had no way to add a subtask at all before, only the
  // /tasks list's cascade could.
  async function handleAddSubtask(name) {
    await createSubTask({ task: id, name })
    await refreshTask(id)
  }

  // Rename the task or a subtask — neither was possible anywhere in
  // the app until now, only creating and (for the task) deleting.
  async function handleRenameTask(name) {
    const updated = await updateTask(id, { name })
    mergeTask({ ...task, ...updated })
  }

  async function handleRenameSubtask(subtask, name) {
    await updateSubTask(subtask.id, { name })
    await refreshTask(id)
  }

  async function handleDeleteSubtask(subtask) {
    await deleteSubTask(subtask.id)
    await refreshTask(id)
  }

  // This is the one place completing a task with open subtasks is
  // actually allowed — the list's own TaskCard stays gated (blocked
  // until every subtask is already done, never auto-completing them);
  // choosing to complete from here instead cascades, closing out
  // whatever's still open first. Reopening doesn't reverse that — the
  // subtasks stay completed, same as the existing "reopening never
  // un-completes subtasks" rule elsewhere.
  async function handleToggleTaskComplete() {
    const next = !task.completed
    if (next) {
      setCelebratingTask(true)
      setTimeout(() => setCelebratingTask(false), TASK_CELEBRATION_MS)
      const incomplete = task.subtasks.filter((s) => !s.completed)
      if (incomplete.length > 0) {
        await Promise.all(incomplete.map((s) => updateSubTask(s.id, { completed: true })))
      }
    }
    await updateTask(id, { completed: next })
    await refreshTask(id)
  }

  async function handleDeleteConfirm() {
    setDeleteError(null)
    setDeleting(true)
    try {
      await deleteTask(id)
      removeTask(numericId)
      navigate('/tasks')
    } catch (err) {
      setDeleteError(err.data?.detail ?? 'Could not delete this task.')
      setDeleting(false)
      setConfirmingDelete(false)
    }
  }

  async function handleToggleSubtask(subtask, checked) {
    setBusyIds((current) => new Set(current).add(subtask.id))
    if (checked) {
      setCelebratingIds((current) => new Set(current).add(subtask.id))
      setTimeout(() => {
        setCelebratingIds((current) => {
          const next = new Set(current)
          next.delete(subtask.id)
          return next
        })
      }, SUBTASK_CELEBRATION_MS)
    }

    try {
      await updateSubTask(subtask.id, { completed: checked })
      // Re-fetches the whole task rather than patching subtasks locally
      // — completing/reopening a subtask can flip the parent task's own
      // `completed` field server-side (Task.update_completion_status),
      // which this page also displays (see the progress-vs-complete
      // bubble below), so the authoritative task is worth pulling back
      // down instead of guessing at the side effect here.
      await refreshTask(id)
    } finally {
      setBusyIds((current) => {
        const next = new Set(current)
        next.delete(subtask.id)
        return next
      })
    }
  }

  // Same shape as TaskCard's own deadline editor — this page just
  // couldn't edit the deadline at all before, only display it read-only
  // via the list. Merges the server's response into local state rather
  // than assuming the optimistic input round-trips unchanged.
  async function handleDeadlineSave(dateDeadline) {
    const updated = await updateTask(id, { dateDeadline })
    mergeTask({ ...task, ...updated })
    setEditingDeadline(false)
    setJustSavedDeadline(true)
    setTimeout(() => setJustSavedDeadline(false), PULSE_CONFIRM_MS)
  }

  if (status === 'loading') {
    return (
      <div className="mx-auto max-w-3xl px-8 py-8">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="mx-auto max-w-3xl px-8 py-8">
        <p className="text-sm text-destructive">Couldn&apos;t load this task.</p>
        <Link to="/tasks" className="mt-2 inline-block text-sm text-sky-600 hover:underline">
          Back to tasks
        </Link>
      </div>
    )
  }

  // The store has loaded but this id isn't in it — deleted from
  // another tab/page, or just a bad id. Same shape as the error state
  // above rather than getting stuck on "Loading…" forever.
  if (!task) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-8">
        <p className="text-sm text-destructive">Couldn&apos;t find this task.</p>
        <Link to="/tasks" className="mt-2 inline-block text-sm text-sky-600 hover:underline">
          Back to tasks
        </Link>
      </div>
    )
  }

  const progress = calculateProgress(task)

  // Incomplete (or still-celebrating) subtasks first, in their existing
  // relative order. Completed ones follow as their own group, ordered
  // by dateCompleted descending — the most recently finished one lands
  // right at the top of that group (i.e. right after the open ones),
  // not at the very bottom of the page. Only the freshest few of those
  // render inline; the rest are on /progress, same cap as the main
  // task list's Completed section.
  const openSubtasks = task.subtasks.filter(
    (s) => !s.completed || celebratingIds.has(s.id)
  )
  const completedSubtasks = task.subtasks
    .filter((s) => s.completed && !celebratingIds.has(s.id))
    .sort((a, b) => new Date(b.dateCompleted) - new Date(a.dateCompleted))
  const visibleCompletedSubtasks = completedSubtasks.slice(0, COMPLETED_SUBTASK_PREVIEW_COUNT)
  const hiddenCompletedSubtaskCount = completedSubtasks.length - visibleCompletedSubtasks.length
  const sortedSubtasks = [...openSubtasks, ...visibleCompletedSubtasks]

  const hasSubtasks = task.subtasks.length > 0

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <Link
          to="/tasks"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to tasks
        </Link>

        {confirmingDelete ? (
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">Are you sure you want to delete this task?</p>
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
            className="hover:text-destructive"
          >
            <Trash2 />
          </Button>
        )}
      </div>
      {deleteError && <p className="mb-2 text-xs text-destructive">{deleteError}</p>}

      <div className="flex items-center justify-between gap-6">
        <h1 className="min-w-0 flex-1">
          <InlineEditableName
            value={task.name}
            onSave={handleRenameTask}
            textClassName="text-2xl font-bold tracking-tight"
            inputClassName="w-full text-2xl font-bold tracking-tight"
          />
        </h1>
        <div className="w-44 shrink-0">
          {task.completed ? (
            <div className="flex flex-col items-end gap-1">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                Complete
              </span>
              <p className="text-right text-xs text-muted-foreground">
                {task.dateCompleted ? `Completed ${formatDeadline(task.dateCompleted)}` : 'Completed'}
              </p>
            </div>
          ) : (
            // Always a real Pending/Complete button here, whether or
            // not there are subtasks — unlike the list's TaskCard,
            // this page lets completing cascade-close any that are
            // still open (see handleToggleTaskComplete), so it's never
            // actually blocked. With no subtasks, this is also the
            // only completion progress shown at all (no meaningless
            // 0%/100% bar with nothing behind it); with subtasks, the
            // bar below it still tracks their individual progress.
            <div className="relative inline-flex justify-end">
              {celebratingTask && <ConfettiBurst />}
              <PendingCompleteButton task={task} blocked={false} onClick={handleToggleTaskComplete} />
            </div>
          )}
        </div>
      </div>

      {!task.completed && hasSubtasks && (
        // Repositioned under the title and full width, same treatment
        // as the progress meter on the task card in the list — it used
        // to live cramped in a w-44 column next to the title.
        <div className="mt-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full rounded-full transition-all duration-500 ease-out', PROGRESS_GRADIENT)}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{progress}% complete</p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">Created {formatDeadline(task.dateCreated)}</p>

        {task.completed ? (
          task.dateDeadline && (
            <p className="text-xs text-muted-foreground">
              Deadline was {formatDeadline(task.dateDeadline)}
            </p>
          )
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
          <div className="flex flex-col items-end gap-0.5">
            <span className="relative inline-flex">
              <PulseRing ready={deadlineStatus.isOverdue} forceOnce={justSavedDeadline} />
              <button
                type="button"
                onClick={() => setEditingDeadline(true)}
                className={cn(
                  'relative rounded-full px-3 py-1 text-xs font-medium tabular-nums transition-colors',
                  deadlineStatus.isOverdue
                    ? 'bg-red-700 text-white hover:bg-red-800'
                    : deadlineStatus.isUrgent
                      ? 'bg-red-50 text-red-700 hover:bg-red-100'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                )}
              >
                {deadlineStatus.isOverdue
                  ? 'Overdue'
                  : deadlineStatus.isUrgent
                    ? `Due in: ${deadlineStatus.countdownDisplay}`
                    : task.dateDeadline
                      ? `Due ${formatDeadline(task.dateDeadline)}`
                      : 'Set deadline'}
              </button>
            </span>
            {deadlineStatus.isOverdue && (
              <span className="text-[11px] font-medium text-red-700 tabular-nums">
                Due: {deadlineStatus.overdueDisplay} ago
              </span>
            )}
          </div>
        )}
      </div>

      {!hasSubtasks ? (
        <div className="mt-8">
          {addingSubtask ? (
            <AddSubtaskForm onAdd={handleAddSubtask} onCancel={() => setAddingSubtask(false)} />
          ) : (
            <p className="text-sm text-muted-foreground">
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
      ) : (
        <SubtaskFlipList subtasks={sortedSubtasks}>
          {(subtask) => {
            const checked = subtask.completed || celebratingIds.has(subtask.id)
            return (
              <SubtaskDetailRow
                subtask={subtask}
                checked={checked}
                busy={busyIds.has(subtask.id)}
                onToggle={(value) => handleToggleSubtask(subtask, value)}
                onRename={(name) => handleRenameSubtask(subtask, name)}
                onDelete={() => handleDeleteSubtask(subtask)}
              />
            )
          }}
        </SubtaskFlipList>
      )}

      {hiddenCompletedSubtaskCount > 0 && (
        <Link
          to="/progress"
          className="mt-3 inline-block text-xs font-medium text-sky-600 hover:underline"
        >
          View {hiddenCompletedSubtaskCount} more completed →
        </Link>
      )}

      {deadlineHintMounted && (
        <div
          className={cn(
            'pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background shadow-lg transition-opacity duration-500',
            showDeadlineHint ? 'opacity-100' : 'opacity-0'
          )}
        >
          Something here is due soon — consider extending the deadline.
        </div>
      )}
    </div>
  )
}

// One subtask row. Its own component (rather than inline in the
// SubtaskFlipList callback) because it needs a live-ticking
// useDeadlineStatus for the overdue case — that's a hook call, and the
// list it's rendered from can grow or shrink, so it has to live inside
// something that mounts/unmounts per-item rather than a bare loop
// inside TaskDetailPage's own render. This is the one place in the app
// that opts into `liveOverdue`: unlike the list cards (a static
// "Overdue" badge + the plain due date is enough there), the detail
// page is where someone's actually looking at one task, so the "how
// overdue" duration ticks for real, in days once it runs past 24h.
function SubtaskDetailRow({ subtask, checked, busy, onToggle, onRename, onDelete }) {
  const status = useDeadlineStatus(subtask.dateDeadline, checked, { liveOverdue: true })
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const deleteRef = useRef(null)

  // Same "click outside closes it" behavior as the list view's own
  // subtask delete confirm (SubtaskStackCard) — this was the one place
  // in the app that still had no delete-subtask UI at all.
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

  async function handleDeleteConfirm() {
    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
      setConfirmingDelete(false)
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm transition-colors duration-300">
      <Checkbox
        checked={checked}
        onCheckedChange={onToggle}
        disabled={busy}
        className="shrink-0 data-checked:border-emerald-500 data-checked:bg-emerald-500"
      />
      <InlineEditableName
        value={subtask.name}
        onSave={onRename}
        textClassName={cn(
          'flex-1 transition-colors duration-300',
          checked && 'text-muted-foreground line-through'
        )}
        inputClassName="flex-1 text-sm"
      />
      {subtask.dateDeadline &&
        (status.isOverdue ? (
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            <span className="rounded-full bg-red-700 px-2 py-0.5 text-xs font-medium text-white">
              Overdue
            </span>
            <span className="text-[11px] font-medium text-red-700 tabular-nums">
              Due: {status.overdueDisplay} ago
            </span>
          </div>
        ) : (
          <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
            Due {formatDeadline(subtask.dateDeadline)}
          </span>
        ))}

      <div className="relative shrink-0" ref={deleteRef}>
        {confirmingDelete ? (
          <div className="absolute top-full right-0 z-20 mt-1 w-44 rounded-lg border bg-card p-2.5 text-left shadow-lg">
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
            onClick={() => setConfirmingDelete(true)}
            aria-label="Delete subtask"
            className="text-muted-foreground transition-colors hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

// Renders the subtask list and slides each row from its previous
// position to its new one whenever the order changes (the FLIP
// technique: measure before, measure after, animate the difference).
// Plain flow-layout reordering otherwise just jumps instantly — there's
// no CSS property to transition when an element's position in the DOM
// changes. Deliberately basic: no animation library, just one
// requestAnimationFrame and a transform reset.
function SubtaskFlipList({ subtasks, children }) {
  const nodeRefs = useRef(new Map())
  const prevRects = useRef(new Map())

  useLayoutEffect(() => {
    const newRects = new Map()
    nodeRefs.current.forEach((el, id) => {
      if (el) newRects.set(id, el.getBoundingClientRect().top)
    })

    nodeRefs.current.forEach((el, id) => {
      if (!el) return
      const prevTop = prevRects.current.get(id)
      const newTop = newRects.get(id)
      if (prevTop === undefined || newTop === undefined) return
      const delta = prevTop - newTop
      if (delta === 0) return

      el.style.transition = 'none'
      el.style.transform = `translateY(${delta}px)`
      // Forces the browser to apply the transform above before the
      // transition below is added, otherwise it'd animate from 0 too.
      el.getBoundingClientRect()
      requestAnimationFrame(() => {
        el.style.transition = 'transform 300ms ease-out'
        el.style.transform = ''
      })
    })

    prevRects.current = newRects
  }, [subtasks])

  if (subtasks.length === 0) {
    return <p className="mt-8 text-sm text-muted-foreground">No subtasks yet.</p>
  }

  return (
    <div className="mt-8 flex flex-col gap-3">
      {subtasks.map((subtask) => (
        <div key={subtask.id} ref={(el) => nodeRefs.current.set(subtask.id, el)}>
          {children(subtask)}
        </div>
      ))}
    </div>
  )
}
