import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Flattens every overdue task and subtask out of the full task list —
// not completed, has a deadline, that deadline's in the past — into
// one list, most overdue (earliest date) first. Shared between the
// one-time check that decides whether to show the gate at all and the
// modal's own render, since it's cheap and both want the same list.
export function collectOverdueItems(tasks) {
  const now = Date.now()
  const items = []
  for (const task of tasks) {
    if (!task.completed && task.dateDeadline && new Date(task.dateDeadline).getTime() < now) {
      items.push({ key: `task-${task.id}`, name: task.name, date: task.dateDeadline })
    }
    for (const subtask of task.subtasks) {
      if (!subtask.completed && subtask.dateDeadline && new Date(subtask.dateDeadline).getTime() < now) {
        items.push({ key: `subtask-${subtask.id}`, name: subtask.name, date: subtask.dateDeadline })
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
export function OverdueGateModal({ overdueItems, onDismiss }) {
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
        className="relative w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl"
      >
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Close"
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>

        <h2 id="overdue-gate-title" className="pr-6 text-lg font-semibold">
          You have overdue tasks
        </h2>

        <ul className="mt-3 flex flex-col gap-1.5">
          {visible.map((item) => (
            <li key={item.key} className="truncate text-sm font-medium text-red-700">
              {item.name}
            </li>
          ))}
        </ul>
        {hiddenCount > 0 && (
          <p className="mt-1.5 text-xs text-muted-foreground">+{hiddenCount} more</p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onDismiss}>
            Review
          </Button>
          <Button type="button" size="sm" onClick={onDismiss}>
            Okay
          </Button>
        </div>
      </div>
    </div>
  )
}
