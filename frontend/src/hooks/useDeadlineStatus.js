import { useEffect, useState } from 'react'
import { URGENT_WINDOW_MS } from '@/lib/utils'

function pad(n) {
  return String(n).padStart(2, '0')
}

function formatClock(ms) {
  const clamped = Math.max(0, ms)
  const totalSeconds = Math.floor(clamped / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

// Same shape as formatClock, but rolls over into a "N days, " prefix
// past 24 hours — an overdue stretch can run into the days, and
// "114:17:10" reads far worse than "4 days, 18:17:10".
function formatElapsed(ms) {
  const clamped = Math.max(0, ms)
  const totalSeconds = Math.floor(clamped / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const time = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  return days > 0 ? `${days} day${days === 1 ? '' : 's'}, ${time}` : time
}

// Shared deadline-status logic for task and subtask due-date badges.
// Two different presentations lean on this: list cards (TaskCard) just
// need a boolean "is this overdue" plus a live countdown while inside
// URGENT_WINDOW_MS — the overdue state itself renders as a static
// "Overdue" badge with the plain due date underneath, no ticking. The
// task detail page wants more: a genuinely live, ticking "how overdue"
// duration, which is what `liveOverdue` opts into — set only there, so
// list cards don't pay for a 250ms interval they never displays.
export function useDeadlineStatus(dateDeadline, completed, { liveOverdue = false } = {}) {
  const deadlineMs = dateDeadline ? new Date(dateDeadline).getTime() : null
  const [now, setNow] = useState(() => Date.now())
  const remaining = deadlineMs !== null ? deadlineMs - now : null
  const isUrgent = !completed && remaining !== null && remaining > 0 && remaining <= URGENT_WINDOW_MS
  const isOverdue = !completed && remaining !== null && remaining <= 0
  const needsFastTick = isUrgent || (isOverdue && liveOverdue)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), needsFastTick ? 250 : 30000)
    return () => clearInterval(id)
  }, [needsFastTick])

  return {
    isUrgent,
    isOverdue,
    countdownDisplay: isUrgent ? formatClock(remaining) : null,
    overdueDisplay: isOverdue && liveOverdue ? formatElapsed(-remaining) : null,
  }
}
