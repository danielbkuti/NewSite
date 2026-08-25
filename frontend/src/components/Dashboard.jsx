import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SquarePlus, Target, CalendarDays, Sparkles, Clock } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
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
function UpcomingRow({ item, onToggle }) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const { isOverdue, isUrgent } = useDeadlineStatus(item.dateDeadline, item.completed)

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
      className="flex cursor-pointer items-center gap-3 rounded-xl bg-card px-4 py-3 text-sm ring-1 ring-foreground/10 transition-colors hover:bg-accent/50"
    >
      <Checkbox
        checked={item.completed}
        onCheckedChange={handleToggle}
        onClick={(e) => e.stopPropagation()}
        disabled={busy}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{item.name}</span>
        {item.kind === 'subtask' && (
          <span className="truncate text-xs text-muted-foreground">
            Part of {item.parentName}
          </span>
        )}
      </div>
      <div className="relative shrink-0">
        {(isOverdue || isUrgent) && <PulseRing />}
        <Badge variant={isOverdue ? 'destructive' : 'outline'} className="relative gap-1">
          <Clock className="size-3" />
          {isOverdue ? 'Overdue' : formatDeadline(item.dateDeadline)}
        </Badge>
      </div>
    </div>
  )
}

export function Dashboard({ firstName, username }) {
  const { tasks, status, refreshTasks } = useTaskStore()
  const displayName = firstName || username || 'there'

  // Flattens tasks + their subtasks into one list of not-yet-done items
  // that actually have a deadline, sorted soonest-first. A task whose
  // parent is already completed is skipped entirely — subtasks of a
  // finished task aren't "upcoming" anything.
  const upcoming = tasks
    .filter((task) => !task.completed)
    .flatMap((task) => {
      const items = []
      if (task.dateDeadline) {
        items.push({
          kind: 'task',
          id: task.id,
          taskId: task.id,
          name: task.name,
          dateDeadline: task.dateDeadline,
          completed: task.completed,
        })
      }
      for (const subtask of task.subtasks) {
        if (subtask.dateDeadline && !subtask.completed) {
          items.push({
            kind: 'subtask',
            id: subtask.id,
            taskId: task.id,
            name: subtask.name,
            dateDeadline: subtask.dateDeadline,
            completed: subtask.completed,
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
  // local state by hand.
  async function handleToggle(item, checked) {
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
              <UpcomingRow key={`${item.kind}-${item.id}`} item={item} onToggle={handleToggle} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
