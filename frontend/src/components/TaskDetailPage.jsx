import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { fetchTask } from '@/lib/tasks'
import { cn, formatDeadline, calculateProgress } from '@/lib/utils'

const PROGRESS_GRADIENT = 'bg-gradient-to-r from-[#e0c3fc] via-[#7c5fb0] to-[#8ec5fc]'

// The "View more" destination from a task card's subtask stack — the
// first real single-task view. For now this just displays: title,
// progress, and every subtask as a plain card. No editing here yet
// (no checkbox toggling, no add/delete) — that still lives on the
// /tasks list via TaskCard; this page is purely "see everything" until
// it grows its own interactions.
export function TaskDetailPage() {
  const { id } = useParams()
  const [status, setStatus] = useState('loading')
  const [task, setTask] = useState(null)

  useEffect(() => {
    setStatus('loading')
    fetchTask(id)
      .then((data) => {
        setTask(data)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [id])

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
        <h1
          className={cn(
            'truncate text-2xl font-bold tracking-tight',
            task.completed && 'text-muted-foreground line-through'
          )}
        >
          {task.name}
        </h1>
        <div className="w-40 shrink-0">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full rounded-full', PROGRESS_GRADIENT)}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-right text-xs text-muted-foreground">{progress}% complete</p>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        {task.subtasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No subtasks yet.</p>
        ) : (
          task.subtasks.map((subtask) => (
            <div
              key={subtask.id}
              className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm"
            >
              {subtask.completed ? (
                <CheckCircle2 className="size-4 shrink-0 fill-emerald-100 text-emerald-600" />
              ) : (
                <Checkbox checked={false} disabled />
              )}
              <span className={cn('flex-1 truncate', subtask.completed && 'text-muted-foreground line-through')}>
                {subtask.name}
              </span>
              {subtask.dateDeadline && (
                <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                  Due {formatDeadline(subtask.dateDeadline)}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
