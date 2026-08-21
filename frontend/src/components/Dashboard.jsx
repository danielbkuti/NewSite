import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SquarePlus, Target, CalendarDays, Sparkles, Clock } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { fetchTasks, updateTask, updateSubTask } from '@/lib/tasks'

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
function ActionCard({ to, icon: Icon, title, description, accent }) {
  return (
    <Link to={to} className="group block">
      <Card className="relative aspect-square p-5 shadow-sm transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg">
        <div
          className="pointer-events-none absolute -top-8 -right-8 size-28 rounded-full opacity-20 blur-2xl transition-opacity duration-200 group-hover:opacity-35"
          style={{ backgroundColor: accent }}
        />
        <div className="relative flex h-full flex-col justify-between">
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
      </Card>
    </Link>
  )
}

// One row in the "Upcoming" list — a task or a subtask, both shaped
// down to the same {kind, id, name, dateDeadline, completed, parentName}
// shape so they can share a sorted list and a single row renderer.
function UpcomingRow({ item, onToggle }) {
  const [busy, setBusy] = useState(false)
  const overdue = new Date(item.dateDeadline) < new Date()

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
    // of a class not actually winning the merge.
    <div className="flex items-center gap-3 rounded-xl bg-card px-4 py-3 text-sm ring-1 ring-foreground/10">
      <Checkbox checked={item.completed} onCheckedChange={handleToggle} disabled={busy} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{item.name}</span>
        {item.kind === 'subtask' && (
          <span className="truncate text-xs text-muted-foreground">
            Part of {item.parentName}
          </span>
        )}
      </div>
      <Badge variant={overdue ? 'destructive' : 'outline'} className="shrink-0 gap-1">
        <Clock className="size-3" />
        {overdue ? 'Overdue' : formatDeadline(item.dateDeadline)}
      </Badge>
    </div>
  )
}

export function Dashboard({ firstName, username }) {
  const [status, setStatus] = useState('loading')
  const [tasks, setTasks] = useState([])
  const displayName = firstName || username || 'there'

  function loadTasks() {
    return fetchTasks()
      .then((data) => {
        setTasks(data.results)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }

  useEffect(() => {
    loadTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    await loadTasks()
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
        <h2 className="mb-4 text-xl font-semibold tracking-tight">Upcoming</h2>

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
