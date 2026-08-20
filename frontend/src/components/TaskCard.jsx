import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const STATUS_LABEL = {
  pending: 'pending',
  in_progress: 'in progress',
  completed: 'completed',
}

function formatDeadline(iso) {
  // Explicit UTC so the displayed date always matches what was actually
  // stored/submitted, regardless of the viewer's local timezone — a
  // plain toLocaleDateString() can roll the date back a day for anyone
  // west of UTC.
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

// Presentational, with one small piece of local UI state: whether the
// deadline editor is open. `onToggleComplete`/`onSetDeadline` are called
// with the task and the new value; the parent (TaskList) owns updating
// the server and reconciling local state — this component never talks
// to the API directly.
export function TaskCard({ task, onToggleComplete, onSetDeadline }) {
  const [editingDeadline, setEditingDeadline] = useState(false)
  const [deadlineInput, setDeadlineInput] = useState(
    task.dateDeadline ? task.dateDeadline.slice(0, 10) : ''
  )
  const [deadlineError, setDeadlineError] = useState(null)
  const [savingDeadline, setSavingDeadline] = useState(false)

  async function handleDeadlineSubmit(event) {
    event.preventDefault()
    setDeadlineError(null)
    setSavingDeadline(true)

    try {
      await onSetDeadline(
        task,
        deadlineInput ? new Date(deadlineInput).toISOString() : null
      )
      setEditingDeadline(false)
    } catch (err) {
      setDeadlineError(err.data?.dateDeadline?.[0] ?? 'Could not update the deadline.')
    } finally {
      setSavingDeadline(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Checkbox
            checked={task.completed}
            onCheckedChange={(checked) => onToggleComplete(task, checked)}
          />
          <span className={cn(task.completed && 'text-muted-foreground line-through')}>
            {task.name}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Badge variant={task.completed ? 'default' : 'secondary'}>
          {STATUS_LABEL[task.status] ?? task.status}
        </Badge>

        {editingDeadline ? (
          <form onSubmit={handleDeadlineSubmit} className="flex items-center gap-2">
            <Input
              type="date"
              value={deadlineInput}
              onChange={(e) => setDeadlineInput(e.target.value)}
              className="h-8 w-fit"
              autoFocus
            />
            <Button type="submit" size="sm" disabled={savingDeadline}>
              {savingDeadline ? 'Saving…' : 'Save'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingDeadline(false)
                setDeadlineError(null)
                setDeadlineInput(task.dateDeadline ? task.dateDeadline.slice(0, 10) : '')
              }}
            >
              Cancel
            </Button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setEditingDeadline(true)}
            className="w-fit text-xs text-muted-foreground hover:underline"
          >
            {task.dateDeadline ? `Due ${formatDeadline(task.dateDeadline)}` : 'Set deadline'}
          </button>
        )}

        {deadlineError && <p className="text-xs text-destructive">{deadlineError}</p>}
      </CardContent>
    </Card>
  )
}
