import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { fetchTask, updateTask, createSubTask, updateSubTask } from '@/lib/tasks'
import { cn, formatDeadline, calculateProgress, isDeadlineUrgent } from '@/lib/utils'
import { useDeadlineStatus } from '@/hooks/useDeadlineStatus'
import { DeadlineEditor } from '@/components/DeadlineEditor'
import { AddSubtaskForm } from '@/components/AddSubtaskForm'

const PROGRESS_GRADIENT = 'bg-gradient-to-r from-[#e0c3fc] via-[#7c5fb0] to-[#8ec5fc]'
// How long a just-checked subtask stays in place (checkbox filled
// green, name struck through) before it's actually allowed to resort
// into the completed group — same idea as the cascade on the task
// card, so checking one off here doesn't just instantly relocate it.
const SUBTASK_CELEBRATION_MS = 1400
// How long the "due soon, consider extending" bubble stays up before
// fading — it's a one-time heads-up on opening the page, not a
// persistent banner.
const DEADLINE_HINT_MS = 5000
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
  const [status, setStatus] = useState('loading')
  const [task, setTask] = useState(null)
  const [busyIds, setBusyIds] = useState(() => new Set())
  // Subtask ids mid-celebration — kept sorted as "not yet done" until
  // their timer clears, so checking one off doesn't instantly jump it.
  const [celebratingIds, setCelebratingIds] = useState(() => new Set())
  const [showDeadlineHint, setShowDeadlineHint] = useState(false)
  const [deadlineHintMounted, setDeadlineHintMounted] = useState(false)
  const hintCheckedRef = useRef(false)
  const [editingDeadline, setEditingDeadline] = useState(false)
  const [addingSubtask, setAddingSubtask] = useState(false)
  // Safe to call unconditionally with an as-yet-null task (dateDeadline
  // undefined just means "no deadline", same as the loaded case) —
  // has to run before the loading/error early returns below since
  // hooks can't be conditional. `liveOverdue` matches the subtask
  // rows on this page: this is the one place the app shows a genuinely
  // ticking "how overdue" duration, in days once it runs past 24h.
  const deadlineStatus = useDeadlineStatus(task?.dateDeadline, task?.completed, { liveOverdue: true })

  useEffect(() => {
    setStatus('loading')
    fetchTask(id)
      .then((data) => {
        setTask(data)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [id])

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
    const fresh = await fetchTask(id)
    setTask(fresh)
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
      const fresh = await fetchTask(id)
      setTask(fresh)
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
    setTask((current) => ({ ...current, ...updated }))
    setEditingDeadline(false)
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

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <Link
        to="/tasks"
        className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to tasks
      </Link>

      <div className="flex items-center justify-between gap-6">
        <h1 className="truncate text-2xl font-bold tracking-tight">{task.name}</h1>
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
            <>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full', PROGRESS_GRADIENT)}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-right text-xs text-muted-foreground">{progress}% complete</p>
            </>
          )}
        </div>
      </div>

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
            <button
              type="button"
              onClick={() => setEditingDeadline(true)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium tabular-nums transition-colors',
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
            {deadlineStatus.isOverdue && (
              <span className="text-[11px] font-medium text-red-700 tabular-nums">
                Due: {deadlineStatus.overdueDisplay} ago
              </span>
            )}
          </div>
        )}
      </div>

      {task.subtasks.length === 0 ? (
        <div className="mt-8">
          {addingSubtask ? (
            <AddSubtaskForm onAdd={handleAddSubtask} />
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
function SubtaskDetailRow({ subtask, checked, busy, onToggle }) {
  const status = useDeadlineStatus(subtask.dateDeadline, checked, { liveOverdue: true })

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm transition-colors duration-300">
      <Checkbox
        checked={checked}
        onCheckedChange={onToggle}
        disabled={busy}
        className="shrink-0 data-checked:border-emerald-500 data-checked:bg-emerald-500"
      />
      <span
        className={cn(
          'flex-1 truncate transition-colors duration-300',
          checked && 'text-muted-foreground line-through'
        )}
      >
        {subtask.name}
      </span>
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
