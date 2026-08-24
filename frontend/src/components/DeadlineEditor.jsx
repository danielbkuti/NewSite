import { useState } from 'react'
import { WheelPicker } from '@/components/ui/wheel-picker'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

const DAY_MS = 24 * 60 * 60 * 1000
// Wheel range: 90 days back (room to backdate/correct) to a year
// ahead. Whole-day rows — the date wheel picks a day, not an instant;
// the optional time wheel below layers precision on top of that.
const MIN_DAY_OFFSET = -90
const MAX_DAY_OFFSET = 365
const TIME_STEP_MINUTES = 15

function startOfLocalDay(date) {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function dayOffsetToDate(offset) {
  return new Date(startOfLocalDay(new Date()).getTime() + offset * DAY_MS)
}

function dateToDayOffset(date) {
  const diff = startOfLocalDay(date).getTime() - startOfLocalDay(new Date()).getTime()
  return Math.round(diff / DAY_MS)
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

// "Today" / "Tomorrow" read better than a bare date in a picker column
// — everything further out falls back to a short weekday + date, with
// the year only when it isn't the current one.
function formatWheelDateLabel(offset) {
  if (offset === 0) return 'Today'
  if (offset === 1) return 'Tomorrow'
  if (offset === -1) return 'Yesterday'
  const date = dayOffsetToDate(offset)
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  })
}

function formatWheelTimeLabel(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

function buildDateItems(minDayOffset) {
  const items = []
  for (let offset = minDayOffset; offset <= MAX_DAY_OFFSET; offset++) {
    items.push({ value: offset, label: formatWheelDateLabel(offset) })
  }
  return items
}

const TIME_ITEMS = (() => {
  const items = []
  for (let minutes = 0; minutes <= 1425; minutes += TIME_STEP_MINUTES) {
    items.push({ value: minutes, label: formatWheelTimeLabel(minutes) })
  }
  return items
})()

// Apple-style vertical wheel picker for editing a task or subtask
// deadline — shared by every place that happens: TaskCard's own
// deadline, a subtask's due-date bubble (cascade + promoted card), and
// the task detail page. Time-of-day is opt-in via the checkbox —
// unchecked, the deadline lands on the selected date at local
// midnight (same convention date-only deadlines already used before
// time-of-day support existed); checked, a second wheel picks the
// time. Always renders as a self-contained floating popover, since
// every call site opens it the same way: a trigger badge toggles it
// into view without disturbing the rest of the layout underneath.
//
// `minDayOffset` defaults to letting you backdate up to 90 days, which
// is what the backend actually allows for a *subtask* deadline — but a
// *task* deadline is rejected outright if it's in the past (even
// resubmitting an already-past one unchanged), so both task-level call
// sites pass `minDayOffset={0}` to keep the wheel from ever landing on
// a value Save can't possibly accept. That also means an already-
// overdue task's editor opens on today, not its stale past deadline —
// correct, since the only thing Save can do here is set a new one.
export function DeadlineEditor({ value, onSave, onCancel, className, minDayOffset = MIN_DAY_OFFSET }) {
  const initial = value ? new Date(value) : new Date()
  const initialHasTime = Boolean(value) && (initial.getHours() !== 0 || initial.getMinutes() !== 0)

  const [dayOffset, setDayOffset] = useState(() =>
    clamp(dateToDayOffset(initial), minDayOffset, MAX_DAY_OFFSET)
  )
  const [hasTime, setHasTime] = useState(initialHasTime)
  // Rounded to the wheel's own step at init — otherwise an existing
  // deadline whose minutes aren't a multiple of 15 (most of them,
  // realistically) renders a few minutes off from where the wheel
  // itself lands, until the user actually scrolls it once.
  const [minutes, setMinutes] = useState(() => {
    const raw = initial.getHours() * 60 + initial.getMinutes()
    return Math.round(raw / TIME_STEP_MINUTES) * TIME_STEP_MINUTES
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [confirmingClear, setConfirmingClear] = useState(false)

  const dateItems = buildDateItems(minDayOffset)
  const selectedDate = dayOffsetToDate(dayOffset)

  async function handleSave() {
    setError(null)
    setSaving(true)
    try {
      const result = new Date(selectedDate)
      if (hasTime) {
        result.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
      }
      await onSave(result.toISOString())
    } catch (err) {
      setError(err.data?.dateDeadline?.[0] ?? 'Could not update the deadline.')
      setSaving(false)
    }
  }

  // Distinct from Cancel — this actually clears an existing deadline.
  // Only offered when there is one; a wheel has no natural "empty"
  // position the way the old text input did.
  async function handleClear() {
    setError(null)
    setSaving(true)
    try {
      await onSave(null)
    } catch (err) {
      setError(err.data?.dateDeadline?.[0] ?? 'Could not update the deadline.')
      setSaving(false)
      setConfirmingClear(false)
    }
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'absolute top-full right-0 z-30 mt-2 w-56 rounded-lg border bg-card p-3 text-left shadow-lg',
        className
      )}
    >
      <p className="text-center text-xs font-medium text-muted-foreground">Date</p>
      <WheelPicker items={dateItems} value={dayOffset} onChange={setDayOffset} />

      <label className="mt-2 flex items-center justify-center gap-2 text-xs">
        <Checkbox checked={hasTime} onCheckedChange={setHasTime} disabled={saving} />
        Add a time
      </label>

      {hasTime && (
        <>
          <p className="mt-2 text-center text-xs font-medium text-muted-foreground">Time</p>
          <WheelPicker items={TIME_ITEMS} value={minutes} onChange={setMinutes} />
        </>
      )}

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      {confirmingClear ? (
        <div className="mt-3">
          <p className="text-xs text-muted-foreground">Are you sure you want to clear the deadline?</p>
          <div className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmingClear(false)}
              disabled={saving}
              className="text-xs text-muted-foreground hover:underline"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={saving}
              className="text-xs font-medium text-destructive hover:underline"
            >
              {saving ? 'Clearing…' : 'Clear'}
            </button>
          </div>
        </div>
      ) : (
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="text-xs font-medium text-emerald-700 hover:underline"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="text-xs text-muted-foreground hover:underline"
          >
            Cancel
          </button>
        </div>
        {value && (
          <button
            type="button"
            onClick={() => setConfirmingClear(true)}
            disabled={saving}
            className="text-xs text-destructive hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      )}
    </div>
  )
}
