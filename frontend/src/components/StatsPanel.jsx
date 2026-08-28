import { computeStats, formatDuration, formatPercent } from '@/lib/stats'

// Plain-text stat viewer for the Progress page — every number from
// computeStats laid out as labeled rows grouped into sections, no
// chart library involved. A `null` from computeStats means "not enough
// data yet" (e.g. no completed task has ever had a deadline to judge
// on-time-ness against) — rendered as an em dash rather than a
// misleading 0%/0.
function Stat({ label, value, hint }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-semibold">
        {value}
        {hint && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{hint}</span>}
      </span>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="rounded-lg border bg-card px-4 py-3">
      <h3 className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
      <div className="divide-y">{children}</div>
    </section>
  )
}

const DASH = '—'

export function StatsPanel({ tasks }) {
  const stats = computeStats(tasks)
  const { overview, timing, rolling, weekly, habits } = stats

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Section title="Overview">
        <Stat label="Total tasks" value={overview.totalTasks} />
        <Stat label="Completed" value={overview.completedCount} />
        <Stat label="Open" value={overview.openCount} />
        <Stat label="Completion rate" value={formatPercent(overview.completionRate)} />
        <Stat
          label="Overdue"
          value={overview.overdueCount}
          hint={overview.overdueCount > 0 ? 'needs attention' : undefined}
        />
        <Stat
          label="Subtask completion"
          value={overview.subtaskCompletionRate != null ? formatPercent(overview.subtaskCompletionRate) : DASH}
          hint={overview.subtaskTotal > 0 ? `${overview.subtaskCompleted}/${overview.subtaskTotal}` : undefined}
        />
      </Section>

      <Section title="Timing">
        <Stat
          label="Avg. time to complete"
          value={timing.avgCompletionMs != null ? formatDuration(timing.avgCompletionMs) : DASH}
          hint="created → completed"
        />
        <Stat
          label="On-time rate"
          value={timing.onTimeRate != null ? formatPercent(timing.onTimeRate) : DASH}
          hint={timing.datedCompletionCount > 0 ? `of ${timing.datedCompletionCount} with a deadline` : undefined}
        />
        <Stat
          label="Avg. vs. deadline"
          value={timing.avgLeadMs != null ? formatDuration(timing.avgLeadMs) : DASH}
          hint={timing.avgLeadMs == null ? undefined : timing.avgLeadMs >= 0 ? 'ahead of deadline' : 'past deadline'}
        />
      </Section>

      <Section title="Recent activity">
        <Stat label="Completed, last 7 days" value={rolling.last7} />
        <Stat label="Completed, last 30 days" value={rolling.last30} />
        {weekly.map((w) => (
          <Stat key={w.label} label={`Week of ${w.label}`} value={`${w.completed} done`} hint={`${w.created} created`} />
        ))}
      </Section>

      <Section title="Habits">
        <Stat label="Current streak" value={`${habits.currentStreak}d`} />
        <Stat label="Longest streak" value={`${habits.longestStreak}d`} />
        <Stat label="Most productive day" value={habits.bestDay ? habits.bestDay.day : DASH} />
        <Stat label="Most productive time" value={habits.bestTimeOfDay ? habits.bestTimeOfDay.label : DASH} />
      </Section>
    </div>
  )
}
