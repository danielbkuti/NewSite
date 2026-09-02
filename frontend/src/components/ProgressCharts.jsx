import { useState } from 'react'
import { Flame } from 'lucide-react'
import { computeStats } from '@/lib/stats'
import { cn } from '@/lib/utils'

// Chart mark colors — NOT the same hex literals as the rest of the app's
// pastel accents (#8ec5fc, #f5c451, #ec4899). Those read as gray/washed-out
// once shrunk to a thin bar or heatmap cell (validated with this project's
// dataviz skill: `node validate_palette.js` flagged them below the
// lightness/chroma floor for chart marks). These are deeper siblings of the
// same hues, validated together as a 5-slot categorical set (all checks
// pass at this order — swapping the order reintroduces a colorblind-unsafe
// adjacent pair between amber and green):
//   node validate_palette.js "#10b981,#7c5fb0,#4f8ef7,#e0417d,#c98500" --mode light --surface "#ffffff"
// `completed` reuses the app's real "done" emerald (#10b981, same as every
// completed checkbox/badge) rather than a synthesized green, so a chart
// segment means the same thing as everywhere else in the product; the
// validator flags it just under the 3:1 contrast floor as a WARN, which is
// why every use of it here carries a direct text label, never color alone.
const CHART = {
  completed: '#10b981', // reuses the app-wide "done" green
  purple: '#7c5fb0', // brand primary — "open / in progress"
  blue: '#4f8ef7', // darker sibling of the app's pale #8ec5fc — "created"
  pink: '#e0417d', // darker sibling of the app's pale #ec4899 — streak accent
  amber: '#c98500', // darker sibling of the app's pale #f5c451 — "due soon"
  overdue: '#b91c1c', // same red-700 TaskCard's own "Overdue" badge uses
}

function withAlpha(hex, alpha) {
  return `${hex}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')}`
}

// ---- shared bits ----------------------------------------------------------

// Rect swatch (not a dot) — mirrors the bar/segment mark it keys, per the
// dataviz skill's "legend still mirrors the mark" rule.
function LegendRow({ items }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-[2px]" style={{ backgroundColor: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  )
}

// Positioned as a percentage of its `relative` chart container (computed
// from the same coordinate space the marks are drawn in) rather than via
// getBoundingClientRect — no layout reads mid-render. Value first, label
// second (the tooltip hierarchy the skill specifies is inverted from the
// legend's).
function ChartTooltip({ leftPct, topPct, value, label, align = 'center' }) {
  return (
    <div
      role="status"
      className={cn(
        'pointer-events-none absolute z-10 -translate-y-full rounded-md bg-foreground px-2.5 py-1.5 text-xs whitespace-nowrap text-background shadow-lg',
        align === 'center' && '-translate-x-1/2',
        align === 'start' && '-translate-x-2',
        align === 'end' && '-translate-x-[calc(100%-0.5rem)]'
      )}
      style={{ left: `${leftPct}%`, top: `${topPct}%`, marginTop: '-6px' }}
    >
      <span className="font-semibold">{value}</span> <span className="text-background/70">{label}</span>
    </div>
  )
}

function ChartCard({ title, hint, children }) {
  return (
    <section className="rounded-lg border bg-card px-4 py-4 sm:px-5 sm:py-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </section>
  )
}

// ---- weekly activity (grouped columns) ------------------------------------

// Two series (created vs. completed) over the last few weeks — a grouped
// column chart, categorical color, direct-labeled since two series is
// still comfortable per the series-count ladder.
function WeeklyActivityBars({ weekly }) {
  const [hover, setHover] = useState(null) // { week, series } | null

  const maxVal = Math.max(1, ...weekly.flatMap((w) => [w.created, w.completed]))
  const chartH = 140
  const headroom = 22 // px reserved above the tallest bar for its label
  const plotH = chartH - headroom
  const groupW = 100
  const barW = 24 // % of group width, per bar
  const gap = 6

  function barHeight(v) {
    return v === 0 ? 0 : Math.max(3, (v / maxVal) * plotH)
  }

  const totalW = groupW * weekly.length

  return (
    <ChartCard title="Weekly activity" hint={`Last ${weekly.length} weeks`}>
      <div className="relative">
        <svg viewBox={`0 0 ${totalW} ${chartH}`} className="w-full" style={{ height: `${chartH}px` }} role="img" aria-label="Tasks created versus completed per week">
          {/* baseline */}
          <line x1="0" y1={chartH - 20} x2={totalW} y2={chartH - 20} className="stroke-border" strokeWidth="1" />
          {weekly.map((w, i) => {
            const cx = i * groupW + groupW / 2
            const createdH = barHeight(w.created)
            const completedH = barHeight(w.completed)
            const baseline = chartH - 20
            const createdX = cx - barW - gap / 2
            const completedX = cx + gap / 2
            return (
              <g key={w.label}>
                {/* created */}
                <rect
                  x={createdX}
                  y={baseline - createdH}
                  width={barW}
                  height={createdH}
                  rx="3"
                  fill={CHART.blue}
                  opacity={hover && hover.week === i && hover.series !== 'created' ? 0.45 : 1}
                  className="transition-opacity duration-150"
                  tabIndex={0}
                  role="img"
                  aria-label={`Week of ${w.label}: ${w.created} created`}
                  onMouseEnter={() => setHover({ week: i, series: 'created' })}
                  onFocus={() => setHover({ week: i, series: 'created' })}
                  onMouseLeave={() => setHover(null)}
                  onBlur={() => setHover(null)}
                />
                {/* completed */}
                <rect
                  x={completedX}
                  y={baseline - completedH}
                  width={barW}
                  height={completedH}
                  rx="3"
                  fill={CHART.completed}
                  opacity={hover && hover.week === i && hover.series !== 'completed' ? 0.45 : 1}
                  className="transition-opacity duration-150"
                  tabIndex={0}
                  role="img"
                  aria-label={`Week of ${w.label}: ${w.completed} completed`}
                  onMouseEnter={() => setHover({ week: i, series: 'completed' })}
                  onFocus={() => setHover({ week: i, series: 'completed' })}
                  onMouseLeave={() => setHover(null)}
                  onBlur={() => setHover(null)}
                />
                {/* x-axis label */}
                <text x={cx} y={chartH - 6} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: '7px' }}>
                  {w.label}
                </text>
              </g>
            )
          })}
        </svg>

        {hover && (
          <ChartTooltip
            leftPct={((hover.week * groupW + groupW / 2) / totalW) * 100}
            topPct={
              ((chartH -
                20 -
                barHeight(hover.series === 'created' ? weekly[hover.week].created : weekly[hover.week].completed)) /
                chartH) *
              100
            }
            value={hover.series === 'created' ? weekly[hover.week].created : weekly[hover.week].completed}
            label={hover.series === 'created' ? 'created' : 'completed'}
          />
        )}
      </div>

      <div className="mt-3">
        <LegendRow items={[{ label: 'Created', color: CHART.blue }, { label: 'Completed', color: CHART.completed }]} />
      </div>
    </ChartCard>
  )
}

// ---- overview status bar (part-to-whole) ----------------------------------

// Total tasks split into completed / on-track / overdue — part-to-whole
// rides the stacked bar per the skill (donut stays deprioritized). Status
// colors here because these genuinely are task states, not arbitrary series
// identity — completed reuses the same green every checkbox/badge uses.
function StatusBreakdownBar({ overview }) {
  const [hover, setHover] = useState(null) // 'completed' | 'open' | 'overdue' | null
  const { totalTasks, completedCount, overdueCount } = overview
  const openOnTrack = Math.max(0, overview.openCount - overdueCount)

  if (totalTasks === 0) {
    return null
  }

  const segments = [
    { key: 'completed', label: 'Completed', count: completedCount, color: CHART.completed },
    { key: 'open', label: 'On track', count: openOnTrack, color: CHART.purple },
    { key: 'overdue', label: 'Overdue', count: overdueCount, color: CHART.overdue },
  ].filter((s) => s.count > 0)

  const gapPct = 0.4 // thin surface gap between segments, in % width

  return (
    <ChartCard title="Where everything stands" hint={`${totalTasks} total task${totalTasks === 1 ? '' : 's'}`}>
      <div className="relative">
        <div className="flex h-7 w-full overflow-hidden rounded-md bg-muted" role="img" aria-label="Task status breakdown">
          {segments.map((seg, i) => {
            const pct = (seg.count / totalTasks) * 100
            const width = `calc(${pct}% - ${i < segments.length - 1 ? gapPct : 0}%)`
            const showInlineLabel = pct >= 14
            return (
              <button
                key={seg.key}
                type="button"
                className="flex h-full items-center justify-center transition-opacity duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                style={{ width, marginRight: i < segments.length - 1 ? `${gapPct}%` : 0, backgroundColor: seg.color, opacity: hover && hover !== seg.key ? 0.55 : 1 }}
                onMouseEnter={() => setHover(seg.key)}
                onFocus={() => setHover(seg.key)}
                onMouseLeave={() => setHover(null)}
                onBlur={() => setHover(null)}
                aria-label={`${seg.label}: ${seg.count} of ${totalTasks}`}
              >
                {showInlineLabel && (
                  <span className="px-1 text-xs font-semibold text-white">{seg.count}</span>
                )}
              </button>
            )
          })}
        </div>

        {hover && (() => {
          const seg = segments.find((s) => s.key === hover)
          const idx = segments.indexOf(seg)
          const before = segments.slice(0, idx).reduce((sum, s) => sum + (s.count / totalTasks) * 100, 0)
          const width = (seg.count / totalTasks) * 100
          return (
            <ChartTooltip
              leftPct={before + width / 2}
              topPct={0}
              value={seg.count}
              label={seg.label.toLowerCase()}
              align={before + width / 2 < 10 ? 'start' : before + width / 2 > 90 ? 'end' : 'center'}
            />
          )
        })()}
      </div>

      <div className="mt-3">
        <LegendRow items={segments.map((s) => ({ label: `${s.label} (${s.count})`, color: s.color }))} />
      </div>
    </ChartCard>
  )
}

// ---- daily activity heatmap ------------------------------------------------

const HEAT_STEPS = [0, 0.28, 0.55, 0.8, 1] // opacity steps of one hue — a
// sequential ramp done as intensity-of-one-color rather than four separate
// hex values; avoids re-validating a whole new ramp for what is, visually,
// the same "more = darker" idea the skill asks for.

function heatLevel(count) {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  if (count <= 4) return 3
  return 4
}

// GitHub-style contribution grid — deliberately doubles as the streak
// visual: an unbroken run of filled cells at the right edge *is* the
// current streak, which a single number can't show as legibly.
function ActivityHeatmap({ dailyActivity, currentStreak }) {
  const [hover, setHover] = useState(null) // index into dailyActivity | null

  const leadingBlanks = dailyActivity.length > 0 ? dailyActivity[0].date.getDay() : 0
  const cols = Math.ceil((leadingBlanks + dailyActivity.length) / 7)
  const cell = 11
  const cellGap = 3
  const pitch = cell + cellGap
  const width = cols * pitch
  const height = 7 * pitch

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <ChartCard
      title="Daily activity"
      hint={
        <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2 py-0.5 font-medium text-orange-600">
          <Flame className="size-3 fill-orange-500 text-orange-500" aria-hidden="true" />
          {currentStreak}-day streak
        </span>
      }
    >
      <div className="relative overflow-x-auto pb-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: `${width * 1.6}px`, height: `${height * 1.6}px`, maxWidth: '100%' }}
          role="img"
          aria-label={`Daily task completions, last ${dailyActivity.length} days`}
        >
          {dailyActivity.map((d, i) => {
            const gridIndex = leadingBlanks + i
            const col = Math.floor(gridIndex / 7)
            const row = gridIndex % 7
            const level = heatLevel(d.count)
            const isToday = d.date.getTime() === today.getTime()
            return (
              <rect
                key={i}
                x={col * pitch}
                y={row * pitch}
                width={cell}
                height={cell}
                rx="2.5"
                fill={level === 0 ? 'var(--muted)' : withAlpha(CHART.purple, HEAT_STEPS[level])}
                stroke={isToday ? CHART.purple : 'transparent'}
                strokeWidth={isToday ? 1.25 : 0}
                tabIndex={0}
                role="img"
                aria-label={`${d.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${d.count} completed`}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onBlur={() => setHover(null)}
              />
            )
          })}
        </svg>

        {hover !== null && (() => {
          const d = dailyActivity[hover]
          const gridIndex = leadingBlanks + hover
          const col = Math.floor(gridIndex / 7)
          const row = gridIndex % 7
          return (
            <ChartTooltip
              leftPct={((col * pitch + cell / 2) / width) * 100}
              topPct={((row * pitch) / height) * 100}
              value={d.count}
              label={d.count === 1 ? 'task' : 'tasks'}
              align={col < 2 ? 'start' : col > cols - 3 ? 'end' : 'center'}
            />
          )
        })()}
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        Less
        {HEAT_STEPS.map((step, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="size-2.5 rounded-[2px]"
            style={{ backgroundColor: step === 0 ? 'var(--muted)' : withAlpha(CHART.purple, step) }}
          />
        ))}
        More
      </div>
    </ChartCard>
  )
}

// ---- best-day / best-time distributions ------------------------------------

// Horizontal bars, one hue (magnitude, not identity) — the tallest bar
// carries the full accent and its value inline; the rest stay a light tint
// of the same hue. This is the "emphasis" form the skill prefers over
// coloring every bar its own hue for a single-series distribution.
function DistributionBars({ title, data }) {
  const [hover, setHover] = useState(null)
  const maxVal = Math.max(1, ...data.map((d) => d.count))
  const bestIndex = data.reduce((bi, d, i) => (d.count > data[bi].count ? i : bi), 0)
  const hasAny = data.some((d) => d.count > 0)

  return (
    <ChartCard title={title}>
      <div className="flex flex-col gap-2">
        {data.map((d, i) => {
          const pct = hasAny ? Math.max(2, (d.count / maxVal) * 100) : 0
          const isBest = hasAny && i === bestIndex && d.count > 0
          return (
            <div key={d.label} className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">{d.label}</span>
              <div className="relative h-5 min-w-0 flex-1">
                <div
                  role="img"
                  aria-label={`${d.label}: ${d.count} completed`}
                  tabIndex={0}
                  className="h-5 rounded-[4px] transition-[opacity,width] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: isBest ? CHART.purple : withAlpha(CHART.purple, 0.25),
                    opacity: hover !== null && hover !== i ? 0.6 : 1,
                  }}
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onBlur={() => setHover(null)}
                />
                {hover === i && (
                  <ChartTooltip leftPct={Math.min(96, pct)} topPct={-8} value={d.count} label="completed" align={pct > 85 ? 'end' : 'start'} />
                )}
                {isBest && d.count > 0 && (
                  <span className="absolute top-1/2 left-2 -translate-y-1/2 text-xs font-semibold text-white">
                    {d.count}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </ChartCard>
  )
}

// ---- assembled dashboard ---------------------------------------------------

// Computed once here rather than re-derived per chart — every chart below
// reads off this single `computeStats` pass, same as StatsPanel does, so
// the two never disagree with each other.
export function ProgressCharts({ tasks }) {
  const stats = computeStats(tasks)
  const { overview, weekly, habits } = stats

  const hasWeeklyActivity = weekly.some((w) => w.created > 0 || w.completed > 0)
  const hasHabitData = habits.dailyActivity.some((d) => d.count > 0)

  return (
    <div className="flex flex-col gap-5">
      <StatusBreakdownBar overview={overview} />

      {hasWeeklyActivity && <WeeklyActivityBars weekly={weekly} />}

      {hasHabitData && (
        <>
          <ActivityHeatmap dailyActivity={habits.dailyActivity} currentStreak={habits.currentStreak} />
          <div className="grid gap-5 sm:grid-cols-2">
            <DistributionBars title="Completions by day of week" data={habits.bestDayDistribution} />
            <DistributionBars title="Completions by time of day" data={habits.bestTimeDistribution} />
          </div>
        </>
      )}
    </div>
  )
}
