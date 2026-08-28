import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarClock, Gauge, ListChecks } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Logo } from '@/components/Logo'
import { checkEmailExists } from '@/lib/auth'
import { cn } from '@/lib/utils'

const FEATURES = [
  {
    icon: CalendarClock,
    title: 'Stay on schedule',
    description:
      'Set a deadline on any task and see it right on the card — no digging through a separate calendar.',
  },
  {
    icon: ListChecks,
    title: 'Break it down',
    description:
      'Split a task into subtasks. Finish all of them and the parent task marks itself done automatically.',
  },
  {
    icon: Gauge,
    title: 'See progress at a glance',
    description:
      'A clear status badge on every task means you always know what’s pending, in progress, or done.',
  },
]

// Mimics a task flipping between pending and completed — same two Badge
// variants used everywhere else (TaskCard, DemoTaskCard), just cycling
// on a timer instead of reacting to a checkbox. Badge already has
// transition-all in its own base classes (badge.jsx), so changing the
// variant alone is what produces the smooth color animation — no manual
// fade sequencing needed here.
const STATUS_CYCLE = ['secondary', 'default']

function useCyclingBadgeVariant(intervalMs = 1800) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % STATUS_CYCLE.length)
    }, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return STATUS_CYCLE[index]
}

// ---- "watch it work" demo -------------------------------------------
// Purely presentational — three sample tasks shaped exactly like real
// API tasks (id/name/dateDeadline), rendered through the same
// Card/Badge/Checkbox components the real app uses, driven by a small
// timeline instead of user clicks. No login, no network calls: it just
// plays on a loop so the page shows the product actually doing
// something instead of a frozen mockup.
const DEMO_TASKS = [
  { id: 1, name: 'Draft Q3 project brief', dateDeadline: null },
  { id: 2, name: "Review teammate's pull request", dateDeadline: null },
  { id: 3, name: 'Prepare client demo', dateDeadline: '2026-09-05T00:00:00Z' },
]

// Each frame is which of DEMO_TASKS (by index) are checked at that point
// in the loop, and how long to hold before advancing.
const DEMO_FRAMES = [
  { checked: [false, false, false], holdMs: 1300 },
  { checked: [true, false, false], holdMs: 1200 },
  { checked: [true, true, false], holdMs: 1200 },
  { checked: [true, true, true], holdMs: 2600 },
]

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function useDemoAnimation() {
  // Reduced motion: settle on the last frame (everything completed) and
  // never schedule a timer — no motion at all, but still the feature at
  // its best static state rather than an empty checklist.
  const [frameIndex, setFrameIndex] = useState(() =>
    prefersReducedMotion() ? DEMO_FRAMES.length - 1 : 0
  )

  useEffect(() => {
    if (prefersReducedMotion()) return
    const id = setTimeout(() => {
      setFrameIndex((i) => (i + 1) % DEMO_FRAMES.length)
    }, DEMO_FRAMES[frameIndex].holdMs)
    return () => clearTimeout(id)
  }, [frameIndex])

  return DEMO_FRAMES[frameIndex]
}

function formatDeadline(iso) {
  // Explicit UTC so the displayed date matches what's actually stored,
  // regardless of the viewer's local timezone — mirrors TaskCard.
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function DemoTaskCard({ task, checked }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Checkbox checked={checked} disabled />
          <span className={cn(checked && 'text-muted-foreground line-through')}>
            {task.name}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Badge variant={checked ? 'default' : 'secondary'}>
          {checked ? 'completed' : 'pending'}
        </Badge>
        {task.dateDeadline && (
          <p className="text-xs text-muted-foreground">
            Due {formatDeadline(task.dateDeadline)}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function LandingPage() {
  const heroBadgeVariant = useCyclingBadgeVariant()
  const demoFrame = useDemoAnimation()
  const navigate = useNavigate()
  const [heroEmail, setHeroEmail] = useState('')
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [heroError, setHeroError] = useState(null)

  async function handleStart(event) {
    event.preventDefault()
    setHeroError(null)
    setCheckingEmail(true)

    try {
      const { exists } = await checkEmailExists(heroEmail)
      // Existing account -> straight to login; unrecognized email -> the
      // real signup flow. Either way the email carries over as router
      // state, so the next screen doesn't make them retype it.
      navigate(exists ? '/login' : '/signup', { state: { email: heroEmail } })
    } catch {
      setHeroError('Something went wrong. Please try again.')
    } finally {
      setCheckingEmail(false)
    }
  }

  return (
    <div className="min-h-screen">
      {/* ---- header ---- */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Logo scale="secondary" />
        <nav className="flex items-center gap-4">
          <Link
            to="/login"
            className="text-sm font-medium text-foreground/80 hover:text-foreground"
          >
            Log in
          </Link>
          <Button size="sm" render={<Link to="/signup" />} className="bg-[#56a456] hover:bg-[#56a456]/90" nativeButton={false}>
            Sign up
          </Button>
        </nav>
      </header>

      {/* ---- hero ---- */}
      <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 py-16 text-center">
        <span className="inline-flex items-center rounded-full border border-foreground/15 bg-white/40 px-3 py-1 text-xs font-medium text-foreground/80 backdrop-blur-sm">
          Lightweight task tracking
        </span>
        <h1 className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-4xl font-bold tracking-tight sm:text-5xl">
          <span>Where</span>
          <Badge variant={heroBadgeVariant} className="h-auto rounded-full px-3 py-1 text-2xl font-bold sm:text-3xl">
            doers
          </Badge>
          <span>get it</span>
          <Badge variant={heroBadgeVariant} className="h-auto rounded-full px-3 py-1 text-2xl font-bold sm:text-3xl">
            done
          </Badge>
          <span>.</span>
        </h1>
        <p className="max-w-xl text-lg text-foreground/80">
          Fauxcus tracks tasks, subtasks, and deadlines in one place — so nothing
          slips through.
        </p>
        <form
          onSubmit={handleStart}
          className="flex w-full max-w-md overflow-hidden rounded-lg border border-input bg-white shadow-sm"
        >
          <input
            type="email"
            value={heroEmail}
            onChange={(e) => setHeroEmail(e.target.value)}
            placeholder="fake@example.com"
            required
            className="min-w-0 flex-1 bg-transparent px-4 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <Button
            type="submit"
            disabled={checkingEmail}
            className="h-auto self-stretch rounded-none bg-[#56a456] px-5 hover:bg-[#56a456]/90"
          >
            {checkingEmail ? 'Checking…' : 'Start here'}
          </Button>
        </form>
        {heroError ? (
          <p className="text-sm text-destructive">{heroError}</p>
        ) : (
          <p className="text-xs text-foreground/60">Free to start. No credit card required.</p>
        )}
      </section>

      {/* ---- watch it work: real TaskCard-shaped data, animated on a loop ---- */}
      <section className="border-y border-foreground/10 bg-muted/30 px-6 py-16">
        <div className="mx-auto max-w-md">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">Watch it work</h2>
            <p className="mt-2 text-sm text-foreground/70">
              A live look at Fauxcus keeping a task list on track.
            </p>
          </div>

          <div className="mb-4 flex items-center justify-center gap-2 text-xs text-foreground/60">
            <span className="relative flex size-2 motion-reduce:hidden">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#56a456] opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-[#56a456]" />
            </span>
            Auto-playing preview
          </div>

          <div className="rounded-2xl border bg-card p-3 shadow-xl ring-1 ring-foreground/10">
            <div className="flex items-center gap-1.5 px-1 pb-2">
              <span className="size-2.5 rounded-full bg-destructive/40" />
              <span className="size-2.5 rounded-full bg-[#f5c451]" />
              <span className="size-2.5 rounded-full bg-[#56a456]/60" />
            </div>
            <div className="flex flex-col gap-3">
              {DEMO_TASKS.map((task, i) => (
                <DemoTaskCard key={task.id} task={task} checked={demoFrame.checked[i]} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---- feature highlights ---- */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-8 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="flex flex-col gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-[#56a456]/10 text-[#56a456]">
                <feature.icon className="size-5" />
              </div>
              <h3 className="font-semibold">{feature.title}</h3>
              <p className="text-sm text-foreground/70">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- closing CTA ---- */}
      <section className="border-t border-foreground/10 px-6 py-16 text-center">
        <h2 className="mb-2 text-2xl font-semibold tracking-tight">
          Ready to get organized?
        </h2>
        <p className="mb-6 text-sm text-foreground/70">
          Join Fauxcus and keep every task, deadline, and subtask in one place.
        </p>
        <Button size="lg" render={<Link to="/signup" />} nativeButton={false}>
          Sign up free
        </Button>
      </section>

      {/* ---- footer ---- */}
      <footer className="border-t border-foreground/10 p-6 text-center text-sm text-foreground/60">
        © {new Date().getFullYear()} Fauxcus. All rights reserved.
      </footer>
    </div>
  )
}
