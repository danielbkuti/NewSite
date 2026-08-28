import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SquarePlus, Target, CalendarDays, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { TaskFeaturePreview } from '@/components/TaskFeaturePreview'
import { PulseRing } from '@/components/PulseRing'
import { cn } from '@/lib/utils'
import { useDeadlineStatus } from '@/hooks/useDeadlineStatus'
import { updateTask, updateSubTask } from '@/lib/tasks'
import { useTaskStore } from '@/context/TaskStoreContext'

function formatDeadline(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

// A just-checked item stays in the list, checked and struck through,
// for this long before it's actually allowed to drop out — same idea
// (and duration) as the task list's own CELEBRATION_MS, so checking
// something off here doesn't just make it instantly vanish.
const CELEBRATION_MS = 1300

// One of the three equal-width square shortcuts under the welcome
// message. `accent` drives both the icon badge color and the soft
// blurred glow tucked behind it — each card gets its own color so the
// row doesn't read as three identical boxes.
function ActionCard({ to, icon: Icon, title, description, accent, preview }) {
  // Local hover state, separate from the `group`/`group-hover` CSS
  // already driving this card's own lift/glow/icon-scale — those stay
  // pure CSS, but the preview needs real JS state to drive its scene
  // timer, so it gets its own onMouseEnter/Leave.
  const [hovered, setHovered] = useState(false)

  return (
    <Link
      to={to}
      className="group block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Card className="relative aspect-square overflow-hidden p-5 shadow-sm transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg">
        <div
          className="pointer-events-none absolute -top-8 -right-8 size-28 rounded-full opacity-20 blur-2xl transition-opacity duration-200 group-hover:opacity-35"
          style={{ backgroundColor: accent }}
        />
        <div
          className={cn(
            'relative flex h-full flex-col justify-between transition-opacity duration-200',
            preview && hovered && 'opacity-0'
          )}
        >
          <div
            className="flex size-11 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-110"
            style={{ backgroundColor: `${accent}1a`, color: accent }}
          >
            <Icon className="size-5" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="font-semibold">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>

        {preview && (
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center transition-opacity duration-200',
              hovered ? 'opacity-100' : 'pointer-events-none opacity-0'
            )}
          >
            <TaskFeaturePreview active={hovered} />
          </div>
        )}
      </Card>
    </Link>
  )
}

// One row in the "Upcoming" list — a task or a subtask, both shaped
// down to the same {kind, id, taskId, name, dateDeadline, completed,
// parentName} shape so they can share a sorted list and a single row
// renderer. `taskId` is always the *task's* id (itself, for a task row;
// its parent's, for a subtask row) since only tasks have their own
// detail page — same convention as OverdueGateModal's item list.
function UpcomingRow({ item, celebrating, onToggle }) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  // `item.completed` already folds in the celebration flag (see the
  // `upcoming` derivation below) — checked and struck through the
  // instant you tick it, not just once the server confirms.
  const { isOverdue, isUrgent, countdownDisplay } = useDeadlineStatus(item.dateDeadline, item.completed)

  async function handleToggle(checked) {
    setBusy(true)
    try {
      await onToggle(item, checked)
    } finally {
      setBusy(false)
    }
  }

  return (
    // A plain styled div rather than <Card> here — Card's own classes
    // (flex-col, gap/padding driven by a --card-spacing token) are
    // meant for its vertical header/content layout, and fighting that
    // with overrides for a one-line horizontal row isn't worth the risk
    // of a class not actually winning the merge. Clicking the row opens
    // the underlying task's detail page — same "whole row navigates,
    // interactive controls opt out with stopPropagation" convention as
    // TaskCard; the checkbox is the only control here.
    <div
      onClick={() => navigate(`/tasks/${item.taskId}`)}
      className="relative flex cursor-pointer items-center gap-3 rounded-xl bg-card px-4 py-3 text-sm ring-1 ring-foreground/10 transition-colors hover:bg-accent/50"
    >
      {/* Same masked-border gradient ring TaskCard's own cards use
          (.task-ring, index.css) — no per-state accent override here,
          just its own default brand gradient, since an Upcoming row has
          no state chrome of its own to track. */}
      <span aria-hidden="true" className="task-ring" />
      <Checkbox
        checked={item.completed}
        onCheckedChange={handleToggle}
        onClick={(e) => e.stopPropagation()}
        disabled={busy || celebrating}
        className="shrink-0 data-checked:border-emerald-500 data-checked:bg-emerald-500"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            'truncate text-sm font-medium transition-colors duration-300',
            item.completed && 'text-muted-foreground line-through'
          )}
        >
          {item.name}
        </span>
        {item.kind === 'subtask' && (
          <span className="truncate text-xs text-muted-foreground">
            Part of {item.parentName}
          </span>
        )}
      </div>
      {/* Same three-state badge (overdue / due-within-a-day countdown /
          plain due date) as TaskCard's own due-date badge on the task
          list, not the separate neutral Badge component this used to
          be — under 24h out, this now ticks the same red "Due in:
          HH:MM:SS" the list shows instead of just a static date. */}
      <div className="relative shrink-0">
        {(isOverdue || isUrgent) && <PulseRing />}
        <span
          className={cn(
            'relative rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums transition-colors',
            isOverdue
              ? 'bg-red-700 text-white'
              : isUrgent
                ? 'bg-red-50 text-red-700'
                : 'bg-amber-50 text-amber-700'
          )}
        >
          {isOverdue ? 'Overdue' : isUrgent ? `Due in: ${countdownDisplay}` : formatDeadline(item.dateDeadline)}
        </span>
      </div>
    </div>
  )
}

export function Dashboard({ firstName, username }) {
  const { tasks, status, refreshTasks } = useTaskStore()
  const displayName = firstName || username || 'there'
  // Kind-prefixed ids (`task-3`, `subtask-9`) currently mid-celebration
  // — kept in the list (checked, struck through) even though they're
  // already `completed` server-side, until their timer clears. Same
  // idea as TaskList's own `celebratingIds`, just keyed by kind+id
  // since this list mixes tasks and subtasks together.
  const [celebratingIds, setCelebratingIds] = useState(() => new Set())

  function isCelebrating(kind, id) {
    return celebratingIds.has(`${kind}-${id}`)
  }

  // Flattens tasks + their subtasks into one list of not-yet-done items
  // that actually have a deadline, sorted soonest-first. A task whose
  // parent is already completed is skipped entirely — subtasks of a
  // finished task aren't "upcoming" anything — unless the task itself
  // is what's mid-celebration, in which case its subtasks stay visible
  // for the same window it does.
  const upcoming = tasks
    .filter((task) => !task.completed || isCelebrating('task', task.id))
    .flatMap((task) => {
      const items = []
      const taskCelebrating = isCelebrating('task', task.id)
      if (task.dateDeadline) {
        items.push({
          kind: 'task',
          id: task.id,
          taskId: task.id,
          name: task.name,
          dateDeadline: task.dateDeadline,
          completed: task.completed || taskCelebrating,
        })
      }
      for (const subtask of task.subtasks) {
        const subtaskCelebrating = isCelebrating('subtask', subtask.id)
        if (subtask.dateDeadline && (!subtask.completed || subtaskCelebrating)) {
          items.push({
            kind: 'subtask',
            id: subtask.id,
            taskId: task.id,
            name: subtask.name,
            dateDeadline: subtask.dateDeadline,
            completed: subtask.completed || subtaskCelebrating,
            parentName: task.name,
          })
        }
      }
      return items
    })
    .sort((a, b) => new Date(a.dateDeadline) - new Date(b.dateDeadline))
    .slice(0, 6)

  // Either kind of toggle can change a parent task's own `completed`
  // field server-side (completing a task directly, or completing the
  // last subtask of one) — re-fetching the whole list afterward is
  // simpler and more correct than patching two different shapes of
  // local state by hand. Marking complete (not reopening) also holds
  // the row in place, checked and struck through, for CELEBRATION_MS
  // before it's allowed to actually drop out of the list.
  async function handleToggle(item, checked) {
    const key = `${item.kind}-${item.id}`
    if (checked) {
      setCelebratingIds((current) => new Set(current).add(key))
      setTimeout(() => {
        setCelebratingIds((current) => {
          const next = new Set(current)
          next.delete(key)
          return next
        })
      }, CELEBRATION_MS)
    }
    if (item.kind === 'task') {
      await updateTask(item.id, { completed: checked })
    } else {
      await updateSubTask(item.id, { completed: checked })
    }
    await refreshTasks()
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Welcome back, {displayName}</h1>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <ActionCard
          to="/tasks"
          icon={SquarePlus}
          title="Start a new task"
          description="Add something to your list and track it through to done."
          accent="#56a456"
          preview
        />
        <ActionCard
          to="/goals"
          icon={Target}
          title="Start a new goal"
          description="Set a bigger target to work toward over time."
          accent="#7c5fb0"
        />
        <ActionCard
          to="/calendar"
          icon={CalendarDays}
          title="View calendar"
          description="See everything you've got coming up, laid out by date."
          accent="#4f9fdb"
        />
      </div>

      <div className="mt-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Upcoming</h2>
          <Link to="/tasks" className="text-xs font-medium text-sky-600 hover:underline">
            View all tasks →
          </Link>
        </div>

        {status === 'loading' && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}

        {status === 'error' && (
          <p className="text-sm text-destructive">Couldn&apos;t load your tasks. Try reloading.</p>
        )}

        {status === 'ready' && upcoming.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-[#56a456]/10 text-[#56a456]">
              <Sparkles className="size-5" />
            </div>
            <p className="text-sm font-medium">
              Let&apos;s start getting things done — add a new task or goal.
            </p>
          </div>
        )}

        {status === 'ready' && upcoming.length > 0 && (
          <div className="flex flex-col gap-3">
            {upcoming.map((item) => (
              <UpcomingRow
                key={`${item.kind}-${item.id}`}
                item={item}
                celebrating={isCelebrating(item.kind, item.id)}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
