import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus, X, SquarePlus, Target, CalendarDays, ListPlus, CalendarClock, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AddSubtaskForm } from '@/components/AddSubtaskForm'
import { DeadlineEditor } from '@/components/DeadlineEditor'
import { fetchTask, createSubTask, updateTask } from '@/lib/tasks'
import { cn } from '@/lib/utils'

const GRADIENT = 'bg-gradient-to-br from-[#e0c3fc] via-[#7c5fb0] to-[#8ec5fc]'

const TASK_DETAIL_PATH = /^\/tasks\/(\d+)$/

// One option in the stack — a small card in its own right (icon badge
// + label), not a grid cell, since these now hang above the FAB as a
// vertical stack rather than sitting inside one bigger dialog card.
// `riseDelay` staggers each card's entrance so the stack reads as
// rising up from the button one after another, closest card first.
function OptionCard({ icon: Icon, label, onClick, riseDelay }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ animation: `fab-card-rise 220ms ease-out ${riseDelay}ms both` }}
      className="flex w-60 items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left shadow-lg transition-colors hover:bg-muted/50"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#7c5fb0]/10 text-[#7c5fb0]">
        <Icon className="size-4.5" />
      </span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}

// The bigger card an option expands into once picked — same rise-in
// entrance as the option cards, same anchor point, just roomier since
// it's holding an actual form instead of a single line.
function ActionCard({ children, as: Tag = 'div', ...props }) {
  return (
    <Tag
      style={{ animation: 'fab-card-rise 200ms ease-out both' }}
      className="w-72 rounded-xl border bg-card p-4 shadow-lg"
      {...props}
    >
      {children}
    </Tag>
  )
}

// Global quick-add entry point, fixed bottom-right on every
// authenticated page. What it offers changes with where you are: a
// task detail page gets options scoped to *that* task (subtask,
// deadline, description); everywhere else gets the same three
// top-level "start something new" options. There's still no
// dedicated add flow for Goals/Calendar (those pages don't exist yet
// — see ComingSoonPage), so those two just navigate there for now.
//
// The whole menu — option stack or an expanded action card — floats
// directly above the FAB rather than in a centered dialog, so it
// visibly originates from the button that opened it. The full-screen
// blurred backdrop still blocks the rest of the page, same as
// OverdueGateModal; only the content's position changed.
export function AddTaskFab() {
  const [open, setOpen] = useState(false)
  // null (option stack) | 'subtask' | 'deadline' | 'description'
  const [activeAction, setActiveAction] = useState(null)
  const [currentTask, setCurrentTask] = useState(null)
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

  const detailMatch = location.pathname.match(TASK_DETAIL_PATH)
  const taskId = detailMatch ? detailMatch[1] : null

  // Pulls the current task's data (for the deadline/description
  // prefill) once, whenever the menu opens on a detail page — not on
  // every render, since it's only needed while the menu's actually up.
  useEffect(() => {
    if (!open || !taskId) return
    fetchTask(taskId)
      .then((data) => {
        setCurrentTask(data)
        setDescriptionDraft(data.description ?? '')
      })
      .catch(() => setCurrentTask(null))
  }, [open, taskId])

  function closeMenu() {
    setOpen(false)
    setActiveAction(null)
    setError(null)
  }

  // Every detail-page action mutates the task this FAB has no shared
  // state with — TaskDetailPage owns its own fetch entirely
  // independently (see its own comments on this same tradeoff). A
  // full reload is the same known-rough-edge fix already used
  // elsewhere in this component until tasks have a shared store.
  function closeAndRefresh() {
    setOpen(false)
    setActiveAction(null)
    window.location.reload()
  }

  function goTo(path) {
    closeMenu()
    navigate(path)
  }

  async function handleAddSubtask(name) {
    await createSubTask({ task: taskId, name })
    closeAndRefresh()
  }

  async function handleSaveDeadline(dateDeadline) {
    await updateTask(taskId, { dateDeadline })
    closeAndRefresh()
  }

  async function handleSaveDescription(event) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await updateTask(taskId, { description: descriptionDraft })
      closeAndRefresh()
    } catch (err) {
      setError(err.data?.description?.[0] ?? 'Could not save that description.')
      setSubmitting(false)
    }
  }

  const defaultOptions = [
    { key: 'task', label: 'Add a new task', icon: SquarePlus, onClick: () => goTo('/tasks/new') },
    { key: 'goal', label: 'Add a new goal', icon: Target, onClick: () => goTo('/goals') },
    { key: 'calendar', label: 'Add a calendar item', icon: CalendarDays, onClick: () => goTo('/calendar') },
  ]

  const detailOptions = [
    { key: 'subtask', label: 'Add a new subtask', icon: ListPlus, onClick: () => setActiveAction('subtask') },
    { key: 'task', label: 'Add a new task', icon: SquarePlus, onClick: () => goTo('/tasks/new') },
    { key: 'deadline', label: 'Set/Edit deadline', icon: CalendarClock, onClick: () => setActiveAction('deadline') },
    { key: 'description', label: 'Add a task description', icon: FileText, onClick: () => setActiveAction('description') },
  ]

  const options = taskId ? detailOptions : defaultOptions

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm" onClick={closeMenu}>
          {/* flex-col-reverse: the first option in the array lands at
              the bottom of the stack, right above the FAB, with later
              ones stacking upward above it — matching the rise
              animation's own stagger order. */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-6 bottom-24 flex flex-col-reverse items-end gap-2.5"
          >
            {activeAction === null &&
              options.map((option, index) => (
                <OptionCard
                  key={option.key}
                  icon={option.icon}
                  label={option.label}
                  onClick={option.onClick}
                  riseDelay={index * 40}
                />
              ))}

            {activeAction === 'subtask' && (
              <ActionCard>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold">Add a subtask</h2>
                    {currentTask && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        Added to &quot;{currentTask.name}&quot;
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={closeMenu}
                    aria-label="Close"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="mt-3">
                  <AddSubtaskForm onAdd={handleAddSubtask} />
                </div>
              </ActionCard>
            )}

            {activeAction === 'deadline' && (
              <ActionCard>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold">Set deadline</h2>
                    {currentTask && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        For &quot;{currentTask.name}&quot;
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={closeMenu}
                    aria-label="Close"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="relative mt-3">
                  <DeadlineEditor
                    value={currentTask?.dateDeadline}
                    onSave={handleSaveDeadline}
                    onCancel={() => setActiveAction(null)}
                    minDayOffset={0}
                    className="static mt-0 w-full shadow-none"
                  />
                </div>
              </ActionCard>
            )}

            {activeAction === 'description' && (
              <ActionCard as="form" onSubmit={handleSaveDescription}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold">Add a description</h2>
                    {currentTask && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        For &quot;{currentTask.name}&quot;
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={closeMenu}
                    aria-label="Close"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <textarea
                  value={descriptionDraft}
                  onChange={(e) => setDescriptionDraft(e.target.value)}
                  rows={4}
                  autoFocus
                  placeholder="What's this task about?"
                  className="mt-3 w-full rounded-md border border-input bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
                {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
                <div className="mt-3 flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setActiveAction(null)} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={submitting}>
                    {submitting ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              </ActionCard>
            )}
          </div>
        </div>
      )}

      <div className="fixed right-6 bottom-6 z-[101]">
        {/* Radial glow, active only while the menu's open — visually
            ties the button to the cards floating above it. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-3 rounded-full"
          style={
            open
              ? {
                  background:
                    'radial-gradient(circle, rgba(224,195,252,0.6), rgba(124,95,176,0.35) 45%, transparent 75%)',
                  filter: 'blur(6px)',
                  animation: 'fab-glow-pulse 1.8s ease-in-out infinite',
                }
              : undefined
          }
        />
        <button
          type="button"
          onClick={() => (open ? closeMenu() : setOpen(true))}
          aria-label="Add"
          title="Add"
          className={cn(
            GRADIENT,
            'relative flex size-14 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105'
          )}
        >
          <Plus className="size-6" />
        </button>
      </div>
    </>
  )
}
