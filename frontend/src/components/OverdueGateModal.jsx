import { Link } from 'react-router-dom'
import { CircleAlert, X } from 'lucide-react'
import { HoverFillButton } from '@/components/HoverFillButton'
import { formatDeadline } from '@/lib/utils'

// Flattens every overdue task and subtask out of the full task list —
// not completed, has a deadline, that deadline's in the past — into
// one list, most overdue (earliest date) first. Each item carries the
// id of the task its link should open: itself for a task, its parent
// for a subtask (subtasks don't have their own page). Shared between
// the one-time check that decides whether to show the gate at all and
// the modal's own render, since it's cheap and both want the same list.
export function collectOverdueItems(tasks) {
  const now = Date.now()
  const items = []
  for (const task of tasks) {
    if (!task.completed && task.dateDeadline && new Date(task.dateDeadline).getTime() < now) {
      items.push({ key: `task-${task.id}`, name: task.name, date: task.dateDeadline, taskId: task.id })
    }
    for (const subtask of task.subtasks) {
      if (!subtask.completed && subtask.dateDeadline && new Date(subtask.dateDeadline).getTime() < now) {
        items.push({
          key: `subtask-${subtask.id}`,
          name: subtask.name,
          date: subtask.dateDeadline,
          taskId: task.id,
        })
      }
    }
  }
  return items.sort((a, b) => new Date(a.date) - new Date(b.date))
}

// A blocking modal — an interstitial you have to acknowledge before
// touching anything else on the page. `backdrop-blur` on the overlay
// itself is what blurs everything behind it (nav bar included) without
// needing to reach into any of those components; the fixed, full-
// viewport overlay is what blocks interaction, since every click lands
// on it rather than passing through to the page underneath.
export function OverdueGateModal({ overdueItems, onDismiss, onReview }) {
  const visible = overdueItems.slice(0, 3)
  const hiddenCount = overdueItems.length - visible.length

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <div
        role="alertdialog"
        aria-labelledby="overdue-gate-title"
        onClick={(e) => e.stopPropagation()}
        className="relative flex w-[50vw] max-w-md flex-col items-center justify-center rounded-2xl border bg-card p-8 text-center shadow-xl"
      >
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Close"
          className="absolute top-5 right-5 text-muted-foreground hover:text-foreground"
        >
          <X className="size-5" />
        </button>

        <h2 id="overdue-gate-title" className="text-3xl font-bold tracking-tight">
          OOPS!
        </h2>
        <CircleAlert className="mt-3 size-12 text-red-600" aria-hidden="true" />

        <p className="mt-4 text-base font-medium">You have overdue tasks:</p>

        <ul className="mt-3 flex w-full max-w-xs flex-col gap-2">
          {visible.map((item) => (
            <li key={item.key} className="flex items-baseline justify-center gap-1.5">
              <Link
                to={`/tasks/${item.taskId}`}
                onClick={onDismiss}
                className="min-w-0 shrink truncate text-sm font-medium text-red-700 hover:underline"
              >
                {item.name}
              </Link>
              <span className="shrink-0 text-xs whitespace-nowrap text-muted-foreground">
                Due {formatDeadline(item.date)}
              </span>
            </li>
          ))}
        </ul>
        {hiddenCount > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">+{hiddenCount} more</p>
        )}

        <div className="mt-6 flex justify-center">
          <HoverFillButton onClick={onReview ?? onDismiss}>Review</HoverFillButton>
        </div>
      </div>
    </div>
  )
}
