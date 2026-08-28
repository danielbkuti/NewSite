import { Link } from 'react-router-dom'
import { useTaskStore } from '@/context/TaskStoreContext'
import { formatDeadline } from '@/lib/utils'
import { StatsPanel } from '@/components/StatsPanel'
import { TaskSearch } from '@/components/TaskSearch'

// The "View all completed" / "View more" destination from the task
// list's Completed section and the task detail page's completed-
// subtask group — both cap their inline preview at 3 and point here
// for the rest. Also now the home for the stats viewer (StatsPanel)
// and a search box, same TaskSearch used on /tasks — reads off the
// shared store like every other authenticated page instead of its own
// independent fetch, so it never shows stale numbers relative to a
// mutation made from the task list or the FAB.
export function ProgressPage() {
  const { tasks, status } = useTaskStore()

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
        <p className="text-sm text-destructive">Couldn&apos;t load your progress.</p>
      </div>
    )
  }

  const completedTasks = tasks
    .filter((t) => t.completed)
    .sort((a, b) => new Date(b.dateCompleted) - new Date(a.dateCompleted))

  // Flattened out of every task, not just the ones already completed —
  // a subtask can be done while its parent task is still open (that's
  // the normal case, since finishing every subtask doesn't
  // auto-complete the task). Each one carries its parent's id/name
  // along so it's still identifiable outside the task it came from.
  const completedSubtasks = tasks
    .flatMap((t) => t.subtasks.filter((s) => s.completed).map((s) => ({ ...s, parentTask: t })))
    .sort((a, b) => new Date(b.dateCompleted) - new Date(a.dateCompleted))

  const nothingCompleted = completedTasks.length === 0 && completedSubtasks.length === 0

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Progress</h1>
      <p className="mb-4 text-sm text-muted-foreground">Stats, habits, and everything you&apos;ve completed.</p>
      <div className="mb-6">
        <TaskSearch />
      </div>

      {tasks.length > 0 && (
        <div className="mb-8">
          <StatsPanel tasks={tasks} />
        </div>
      )}

      {nothingCompleted ? (
        <p className="text-sm text-muted-foreground">
          Nothing completed yet — finished tasks and subtasks will show up here.
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
              Completed tasks ({completedTasks.length})
            </h2>
            {completedTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No completed tasks yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {completedTasks.map((task) => (
                  <Link
                    key={task.id}
                    to={`/tasks/${task.id}`}
                    className="flex items-center justify-between gap-4 rounded-lg border bg-card px-4 py-3 text-sm transition-colors hover:bg-muted/50"
                  >
                    <span className="truncate font-medium">{task.name}</span>
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      {task.dateCompleted ? formatDeadline(task.dateCompleted) : 'Completed'}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
              Completed subtasks ({completedSubtasks.length})
            </h2>
            {completedSubtasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No completed subtasks yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {completedSubtasks.map((subtask) => (
                  <Link
                    key={subtask.id}
                    to={`/tasks/${subtask.parentTask.id}`}
                    className="flex items-center justify-between gap-4 rounded-lg border bg-card px-4 py-3 text-sm transition-colors hover:bg-muted/50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{subtask.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        Part of {subtask.parentTask.name}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      {subtask.dateCompleted ? formatDeadline(subtask.dateCompleted) : 'Completed'}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
