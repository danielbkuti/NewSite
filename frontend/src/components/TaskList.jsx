import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { TaskCard, SubtaskStackCard } from '@/components/TaskCard'
import { OverdueGateModal, collectOverdueItems } from '@/components/OverdueGateModal'
import {
  fetchTasks,
  fetchTask,
  updateTask,
  deleteTask,
  createSubTask,
  updateSubTask,
  deleteSubTask,
} from '@/lib/tasks'
import { cn, UPCOMING_WINDOW_MS } from '@/lib/utils'

// "Due date" is the only sort with buckets and promoted subtasks —
// that machinery exists specifically to surface urgency, which isn't
// a meaningful concept under the other sorts. Those render a flat list
// of full task cards only.
const SORT_OPTIONS = [
  { value: 'due', label: 'Due date' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'newest', label: 'Newest created' },
  { value: 'oldest', label: 'Oldest created' },
]

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'nodate', label: 'No deadline' },
]

function applyFilter(tasks, filterMode) {
  if (filterMode === 'overdue') {
    const now = Date.now()
    return tasks.filter((t) => t.dateDeadline && new Date(t.dateDeadline).getTime() < now)
  }
  if (filterMode === 'nodate') {
    return tasks.filter((t) => !t.dateDeadline)
  }
  return tasks
}

function sortTasksFlat(tasks, sortMode) {
  const sorted = [...tasks]
  if (sortMode === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name))
  else if (sortMode === 'newest') sorted.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated))
  else if (sortMode === 'oldest') sorted.sort((a, b) => new Date(a.dateCreated) - new Date(b.dateCreated))
  return sorted
}

// How many completed tasks show inline before the list defers to the
// Progress page instead of just growing forever — same spirit as the
// subtask cascade preview on each card, which caps at 3 for the same
// reason.
const COMPLETED_PREVIEW_COUNT = 3

// How long a just-completed task stays put (playing its confetti burst)
// before it's actually allowed to drop into the Completed section.
// Comfortably covers the burst's own animation (850ms + up to ~230ms of
// staggered particle start delays).
const CELEBRATION_MS = 1300

export function TaskList() {
  // 'loading' | 'ready' | 'error'
  const [status, setStatus] = useState('loading')
  const [tasks, setTasks] = useState([])
  // Task ids currently mid-celebration — kept in the active section
  // (regardless of their actual completed state) until their timer
  // clears, so completing a task doesn't just instantly teleport it to
  // the bottom of the page.
  const [celebratingIds, setCelebratingIds] = useState(() => new Set())
  const [showOverdueGate, setShowOverdueGate] = useState(false)
  // Guards the overdue gate to a one-time check per page load — without
  // it, every subsequent task mutation (checking something off, adding
  // a subtask) would re-fetch `tasks` and re-open the modal the user
  // just dismissed.
  const overdueCheckedRef = useRef(false)
  const [sortMode, setSortMode] = useState('due')
  const [filterMode, setFilterMode] = useState('all')

  useEffect(() => {
    fetchTasks()
      .then((data) => {
        setTasks(data.results)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [])

  useEffect(() => {
    if (status !== 'ready' || overdueCheckedRef.current) return
    overdueCheckedRef.current = true
    if (collectOverdueItems(tasks).length > 0) setShowOverdueGate(true)
  }, [status, tasks])

  // Optimistic: flip the checkbox immediately rather than waiting on the
  // PATCH round-trip, revert only if the request actually fails. Once
  // it succeeds, merges the server's response back in rather than
  // trusting the optimistic patch alone — completing a task also sets
  // dateCompleted server-side, which the client has no way to know in
  // advance.
  async function handleToggle(task, checked) {
    // Marking complete (not reopening) plays a short celebration in
    // place before the task is allowed to actually drop into the
    // Completed section — see CELEBRATION_MS.
    if (checked) {
      setCelebratingIds((current) => new Set(current).add(task.id))
      setTimeout(() => {
        setCelebratingIds((current) => {
          const next = new Set(current)
          next.delete(task.id)
          return next
        })
      }, CELEBRATION_MS)
    }

    setTasks((current) =>
      current.map((t) => (t.id === task.id ? { ...t, completed: checked } : t))
    )
    try {
      const updated = await updateTask(task.id, { completed: checked })
      setTasks((current) => current.map((t) => (t.id === task.id ? { ...t, ...updated } : t)))
    } catch {
      setTasks((current) =>
        current.map((t) => (t.id === task.id ? { ...t, completed: task.completed } : t))
      )
    }
  }

  // Same optimistic pattern as handleToggle, but re-throws on failure
  // instead of swallowing the error — TaskCard awaits this itself so it
  // can show the specific validation message (e.g. "can't be in the
  // past") right next to the field that caused it, not just revert
  // silently.
  async function handleSetDeadline(task, dateDeadline) {
    const previous = task.dateDeadline
    setTasks((current) =>
      current.map((t) => (t.id === task.id ? { ...t, dateDeadline } : t))
    )
    try {
      await updateTask(task.id, { dateDeadline })
    } catch (err) {
      setTasks((current) =>
        current.map((t) => (t.id === task.id ? { ...t, dateDeadline: previous } : t))
      )
      throw err
    }
  }

  // Optimistic like the others, but re-throws on failure — TaskCard
  // awaits this itself so it can show a delete-specific error next to
  // the confirm button instead of the task just silently reappearing.
  async function handleDelete(task) {
    const previous = tasks
    setTasks((current) => current.filter((t) => t.id !== task.id))
    try {
      await deleteTask(task.id)
    } catch (err) {
      setTasks(previous)
      throw err
    }
  }

  // Re-fetches one task and replaces it in local state — used after any
  // subtask mutation. Completing/adding a subtask can flip the parent
  // task's own `completed` field server-side (Task.update_completion_status),
  // so pulling the authoritative task back down is simpler and safer
  // than re-deriving that logic here.
  async function refreshTask(taskId) {
    const fresh = await fetchTask(taskId)
    setTasks((current) => current.map((t) => (t.id === taskId ? fresh : t)))
  }

  async function handleAddSubtask(task, name) {
    await createSubTask({ task: task.id, name })
    await refreshTask(task.id)
  }

  async function handleToggleSubtask(task, subtask, completed) {
    await updateSubTask(subtask.id, { completed })
    await refreshTask(task.id)
  }

  // Same shape as handleSetDeadline, for a subtask instead of the task
  // itself — used by the "Change deadline" option on a subtask's
  // due-date bubble in the task list's cascade preview.
  async function handleSetSubtaskDeadline(task, subtask, dateDeadline) {
    await updateSubTask(subtask.id, { dateDeadline })
    await refreshTask(task.id)
  }

  async function handleDeleteSubtask(task, subtask) {
    await deleteSubTask(subtask.id)
    await refreshTask(task.id)
  }

  // Where a promoted subtask's "Part of ..." tag sends you — not a
  // navigation, just scrolls the full task's own card into view and
  // gives it a brief highlight so it's obvious which one it meant.
  // Direct DOM manipulation rather than React state, same call as the
  // task detail page's FLIP reorder animation: a purely transient
  // visual effect that doesn't need to survive a re-render.
  function handleJumpToTask(taskId) {
    const el = document.getElementById(`task-${taskId}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('ring-2', 'ring-sky-400')
    window.setTimeout(() => el.classList.remove('ring-2', 'ring-sky-400'), 1200)
  }

  if (status === 'loading') {
    return <p className="text-sm text-muted-foreground">Loading tasks…</p>
  }

  if (status === 'error') {
    return (
      <p className="text-sm text-destructive">Couldn&apos;t load your tasks. Try reloading.</p>
    )
  }

  // A celebrating task stays in the active list even though it's
  // already `completed` server-side — it only actually moves down once
  // its timer clears.
  const activeTasks = tasks.filter((t) => !t.completed || celebratingIds.has(t.id))
  const filteredActiveTasks = applyFilter(activeTasks, filterMode)
  // Most recently completed first, same ordering rule as the task
  // detail page's completed-subtask group — only the freshest few are
  // worth showing inline, the rest live on /progress.
  const completedTasks = tasks
    .filter((t) => t.completed && !celebratingIds.has(t.id))
    .sort((a, b) => new Date(b.dateCompleted) - new Date(a.dateCompleted))
  const visibleCompletedTasks = completedTasks.slice(0, COMPLETED_PREVIEW_COUNT)
  const hiddenCompletedCount = completedTasks.length - visibleCompletedTasks.length

  function renderCard(task) {
    return (
      <TaskCard
        key={task.id}
        task={task}
        celebrating={celebratingIds.has(task.id)}
        onToggleComplete={handleToggle}
        onSetDeadline={handleSetDeadline}
        onDelete={handleDelete}
        onAddSubtask={handleAddSubtask}
        onToggleSubtask={handleToggleSubtask}
        onSetSubtaskDeadline={handleSetSubtaskDeadline}
        onDeleteSubtask={handleDeleteSubtask}
        pulseReady={!showOverdueGate}
      />
    )
  }

  // The "Due date" sort: every active task always gets its own entry
  // at its own deadline, and every dated, incomplete subtask of every
  // task *also* gets its own entry at its own deadline — not just the
  // single soonest one per task. Each holds exactly as much priority
  // in the sort as any standalone task; a task with three subtasks due
  // before it can show all three ahead of it, each also still shows up
  // bundled in its own task's normal cascade preview lower down.
  // Undated subtasks never get promoted this way; they stay bundled in
  // the task's normal preview only.
  const sortEntries = filteredActiveTasks.flatMap((task) => {
    const entries = [{ type: 'task', task, date: task.dateDeadline }]
    const datedIncompleteSubtasks = task.subtasks.filter((s) => !s.completed && s.dateDeadline)
    for (const subtask of datedIncompleteSubtasks) {
      entries.push({ type: 'subtask', task, subtask, date: subtask.dateDeadline })
    }
    return entries
  })

  // Three buckets: due this week (includes overdue — an overdue date
  // is even sooner than "within a week"), no deadline, then later.
  // Soonest first within the dated buckets.
  const now = Date.now()
  const dueSoon = []
  const undated = []
  const later = []
  for (const entry of sortEntries) {
    if (!entry.date) undated.push(entry)
    else if (new Date(entry.date).getTime() - now <= UPCOMING_WINDOW_MS) dueSoon.push(entry)
    else later.push(entry)
  }
  dueSoon.sort((a, b) => new Date(a.date) - new Date(b.date))
  later.sort((a, b) => new Date(a.date) - new Date(b.date))

  function renderEntry(entry) {
    if (entry.type === 'task') return renderCard(entry.task)
    const { task, subtask } = entry
    return (
      <SubtaskStackCard
        key={`subtask-${subtask.id}`}
        subtask={subtask}
        partOf={{
          label: `Part of "${task.name}"`,
          onClick: () => handleJumpToTask(task.id),
        }}
        onToggleComplete={(checked) => handleToggleSubtask(task, subtask, checked)}
        onSetDeadline={(dateDeadline) => handleSetSubtaskDeadline(task, subtask, dateDeadline)}
        pulseReady={!showOverdueGate}
      />
    )
  }

  function renderBucket(label, entries) {
    if (entries.length === 0) return null
    return (
      <div key={label} className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-muted-foreground">{label}</h2>
        {entries.map(renderEntry)}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {showOverdueGate && (
        <OverdueGateModal
          overdueItems={collectOverdueItems(tasks)}
          onDismiss={() => setShowOverdueGate(false)}
        />
      )}

      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No tasks yet — add one with the + button in the corner.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilterMode(option.value)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    filterMode === option.value
                      ? 'bg-foreground text-background'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Sort by
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value)}
                className="rounded-md border bg-background px-2 py-1 text-xs text-foreground outline-none focus-visible:border-ring"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {sortMode === 'due' ? (
            filteredActiveTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks match this filter.</p>
            ) : (
              <>
                {renderBucket('Due this week', dueSoon)}
                {renderBucket('No deadline', undated)}
                {renderBucket('Later', later)}
              </>
            )
          ) : filteredActiveTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks match this filter.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {sortTasksFlat(filteredActiveTasks, sortMode).map(renderCard)}
            </div>
          )}

          {completedTasks.length > 0 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  Completed ({completedTasks.length})
                </h2>
                {hiddenCompletedCount > 0 && (
                  <Link
                    to="/progress"
                    className="text-xs font-medium text-sky-600 hover:underline"
                  >
                    View all completed →
                  </Link>
                )}
              </div>
              {visibleCompletedTasks.map(renderCard)}
            </div>
          )}
        </>
      )}
    </div>
  )
}
