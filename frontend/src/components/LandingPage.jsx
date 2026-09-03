import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CalendarClock,
  Gauge,
  ListChecks,
  Search,
  TrendingUp,
  ArrowRight,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Logo } from '@/components/Logo'
import { Footer } from '@/components/Footer'
import { checkEmailExists } from '@/lib/auth'
import { cn } from '@/lib/utils'

// The one brand identity mark used everywhere else in the app (Logo's
// tile, the search bars' gradient-ring, task cards' gradient border) —
// reused here rather than reinvented, so the marketing page and the
// product it's selling visibly share one palette instead of drifting
// into its own "landing page purple."
const BRAND_GRADIENT = 'linear-gradient(to bottom right, #e0c3fc, #7c5fb0, #8ec5fc)'

// One tile marked `featured` spans two grid columns on sm+ — five equal
// boxes in a 3-col grid leaves an orphaned gap on the last row (a
// generic-feeling layout); this way every row fills exactly, and the
// bigger tile reads as "the differentiator" rather than five identical
// cards.
const FEATURES = [
  {
    icon: CalendarClock,
    title: 'Stay on schedule',
    description:
      'Set a deadline on any task and see it right on the card — no digging through a separate calendar.',
    accent: '#7c5fb0',
    featured: true,
  },
  {
    icon: ListChecks,
    title: 'Break it down',
    description:
      'Split a task into subtasks. Finish all of them and the parent task marks itself done automatically.',
    accent: '#8ec5fc',
  },
  {
    icon: Gauge,
    title: 'See progress at a glance',
    description:
      'A clear status badge on every task means you always know what’s pending, in progress, or done.',
    accent: '#56a456',
  },
  {
    icon: Search,
    title: 'Find anything fast',
    description:
      'Live search across every task and subtask by name — or just start typing a date to jump straight to what’s due then.',
    accent: '#f5c451',
  },
  {
    icon: TrendingUp,
    title: 'Know your habits',
    description:
      'Completion rate, streaks, and your most productive time of day — tracked automatically from what you already do.',
    accent: '#ec4899',
  },
]

const TRUST_ITEMS = ['Free to start', 'No credit card required', 'Search, stats, and reminders included']

// Mimics a task flipping between pending and completed — cycles between
// the two states the app itself actually uses for "not done yet" (the
// brand gradient, same as a pending task's own accent chrome) and "done"
// (emerald, same as every completed badge/checkbox in the product) —
// not an arbitrary landing-page color pair.
function useCyclingHighlight(intervalMs = 1800) {
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }
    const id = setInterval(() => setDone((d) => !d), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return done
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

// A plain span rather than the shared <Badge> — Badge's own
// `useRender`/`mergeProps` plumbing doesn't forward a `style` prop to
// the DOM node, and separately, its default variant's `bg-primary`
// utility beat a `bg-emerald-500`/gradient override class here even
// with the conflicting class correctly stripped from the element
// (confirmed live: computed `background-color` still resolved to
// `--primary`, a stylesheet cascade-order quirk with cva's own
// variant classes, not a className-string bug) — so this pill sets
// its own color with inline `style`, which isn't subject to either
// problem. Visually identical to Badge's own default pill treatment.
function StatusChip({ done }) {
  return (
    <span
      className="inline-flex h-5 w-fit shrink-0 items-center justify-center rounded-4xl px-2 py-0.5 text-xs font-medium whitespace-nowrap text-white transition-colors duration-300"
      style={{ background: done ? '#10b981' : BRAND_GRADIENT }}
    >
      {done ? 'completed' : 'pending'}
    </span>
  )
}

// Same reasoning as StatusChip above (a plain span with inline style,
// not <Badge>) — the headline's "doers"/"done" words, sized up for
// display type instead of a status pill.
function HeroWordChip({ done, children }) {
  return (
    <span
      className="inline-block rounded-full px-3 py-1 align-middle text-2xl font-bold text-white transition-colors duration-500 sm:text-3xl lg:text-4xl"
      style={{ background: done ? '#10b981' : BRAND_GRADIENT }}
    >
      {children}
    </span>
  )
}

function DemoTaskCard({ task, checked }) {
  return (
    <Card size="sm" className="ring-black/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Checkbox checked={checked} disabled />
          <span className={cn('transition-colors duration-300', checked && 'text-muted-foreground line-through')}>
            {task.name}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <StatusChip done={checked} />
        {task.dateDeadline && (
          <p className="text-xs text-muted-foreground">
            Due {formatDeadline(task.dateDeadline)}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// The floating product mockup — a browser-chrome-style card holding the
// live demo loop, given a slight permanent tilt and a couple of small
// overlapping chips so it reads as a floating screenshot next to the
// hero copy rather than a flat, centered rectangle. All decorative bits
// (chips, glow) are aria-hidden; the actual demo underneath still has
// its own real DOM (the checkboxes/badges), same as before.
function ProductMockup({ demoFrame }) {
  return (
    <div className="relative mx-auto w-full max-w-sm lg:mx-0">
      <div
        aria-hidden="true"
        className="absolute -inset-10 -z-10 rounded-[3rem] opacity-60 blur-3xl"
        style={{ background: BRAND_GRADIENT }}
      />

      <div className="relative rounded-[28px] p-[3px] shadow-2xl shadow-[#7c5fb0]/20" style={{ background: BRAND_GRADIENT }}>
        <div className="rounded-[25px] bg-white/95 p-4 backdrop-blur">
          <div className="flex items-center justify-between px-1 pb-3">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-destructive/40" />
              <span className="size-2.5 rounded-full bg-[#f5c451]" />
              <span className="size-2.5 rounded-full bg-[#56a456]/60" />
            </div>
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-foreground/50">
              <span className="relative flex size-1.5 motion-reduce:hidden">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#56a456] opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-[#56a456]" />
              </span>
              Live preview
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {DEMO_TASKS.map((task, i) => (
              <DemoTaskCard key={task.id} task={task} checked={demoFrame.checked[i]} />
            ))}
          </div>
        </div>
      </div>

      {/* Floating chips — purely decorative, illustrating the stats/
          streak feature the same way DEMO_TASKS illustrates the task
          list itself: fabricated numbers on fabricated demo data, not a
          claim about any real account. */}
      <div
        aria-hidden="true"
        className="absolute -top-5 -right-4 hidden rotate-3 items-center gap-1.5 rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-foreground shadow-lg ring-1 ring-black/5 sm:flex"
      >
        <TrendingUp className="size-3.5 text-[#56a456]" />
        7-day streak
      </div>
      <div
        aria-hidden="true"
        className="absolute -bottom-5 -left-4 hidden -rotate-2 items-center gap-1.5 rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-foreground shadow-lg ring-1 ring-black/5 sm:flex"
      >
        <Check className="size-3.5 text-emerald-600" />
        Auto-completes
      </div>
    </div>
  )
}

export function LandingPage() {
  const heroDone = useCyclingHighlight()
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
    <div className="min-h-screen overflow-x-hidden bg-background">
      {/* Visually hidden until focused — the one keyboard-only path past
          the sticky header straight to the hero, skipping the nav. */}
      <a
        href="#main-content"
        className="sr-only rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60]"
      >
        Skip to content
      </a>

      {/* ---- header ---- */}
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          {/* This page only ever renders when logged out (App.jsx
              redirects an authenticated visitor away from / entirely),
              so linking to / here is a same-page no-op — kept anyway
              for consistency with every other Logo instance in the app,
              all of which are real links. */}
          <Link to="/" aria-label="Fauxcus home">
            <Logo scale="secondary" />
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-full px-3 py-1.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-black/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-[#56a456]/50 focus-visible:outline-none"
            >
              Log in
            </Link>
            <Button
              size="sm"
              render={<Link to="/signup" />}
              className="rounded-full bg-[#56a456] px-4 shadow-md shadow-[#56a456]/25 hover:bg-[#56a456]/90"
              nativeButton={false}
            >
              Sign up
            </Button>
          </nav>
        </div>
      </header>

      <main id="main-content">
      {/* ---- hero ---- */}
      <section className="relative overflow-hidden px-6 pt-16 pb-20 sm:pt-20 lg:pb-28">
        {/* Soft brand-gradient blobs behind the hero content — the same
            three stops as everywhere else, just spread out and blurred
            into ambient color instead of a hard-edged tile. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 -left-24 -z-10 size-96 rounded-full opacity-40 blur-3xl"
          style={{ background: '#e0c3fc' }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 right-0 -z-10 size-[28rem] rounded-full opacity-30 blur-3xl"
          style={{ background: '#8ec5fc' }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-40 left-1/3 -z-10 size-72 rounded-full opacity-20 blur-3xl"
          style={{ background: '#7c5fb0' }}
        />

        <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-white/60 px-3 py-1 text-xs font-medium text-foreground/80 backdrop-blur-sm">
              <span aria-hidden="true" className="size-1.5 rounded-full" style={{ background: BRAND_GRADIENT }} />
              Lightweight task tracking
            </span>

            <h1 className="text-4xl leading-[1.08] font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Where <HeroWordChip done={heroDone}>doers</HeroWordChip> get it{' '}
              <HeroWordChip done={heroDone}>done</HeroWordChip>.
            </h1>

            <p className="max-w-xl text-lg text-foreground/70">
              Fauxcus tracks tasks, subtasks, and deadlines in one place — so nothing
              slips through.
            </p>

            <form onSubmit={handleStart} className="relative w-full max-w-md rounded-full">
              <label htmlFor="hero-email" className="sr-only">
                Email address
              </label>
              <span aria-hidden="true" className="gradient-ring" />
              <div className="relative flex overflow-hidden rounded-full bg-white shadow-sm focus-within:ring-2 focus-within:ring-[#56a456]/50">
                <input
                  id="hero-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  spellCheck={false}
                  value={heroEmail}
                  onChange={(e) => setHeroEmail(e.target.value)}
                  placeholder="fake@example.com"
                  required
                  className="min-w-0 flex-1 bg-transparent py-3 pr-2 pl-5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                <Button
                  type="submit"
                  disabled={checkingEmail}
                  className="m-1 h-auto shrink-0 rounded-full bg-[#56a456] px-5 hover:bg-[#56a456]/90"
                >
                  {checkingEmail ? 'Checking…' : (
                    <span className="inline-flex items-center gap-1.5">
                      Get started free
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </span>
                  )}
                </Button>
              </div>
            </form>

            {heroError && (
              <p role="alert" aria-live="polite" className="text-sm text-destructive">
                {heroError}
              </p>
            )}

            <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-foreground/60 lg:justify-start">
              {TRUST_ITEMS.map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <Check className="size-3.5 text-[#56a456]" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <ProductMockup demoFrame={demoFrame} />
        </div>
      </section>

      {/* ---- feature highlights ---- */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Everything a task list needs, nothing it doesn&apos;t
          </h2>
          <p className="mt-3 text-foreground/70">
            No boards to configure, no workflow to learn — just tasks that stay
            organized on their own.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card
              key={feature.title}
              className={cn(
                'group relative overflow-hidden shadow-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_16px_40px_-16px_var(--feature-shadow)]',
                feature.featured ? 'p-8 sm:col-span-2' : 'p-6'
              )}
              style={{ '--feature-shadow': `${feature.accent}40` }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full opacity-20 blur-2xl transition-opacity duration-200 group-hover:opacity-35"
                style={{ backgroundColor: feature.accent }}
              />
              <div className="relative flex flex-col gap-3">
                <div
                  className={cn(
                    'flex items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-110',
                    feature.featured ? 'size-14' : 'size-11'
                  )}
                  style={{ backgroundColor: `${feature.accent}1a`, color: feature.accent }}
                >
                  <feature.icon className={feature.featured ? 'size-7' : 'size-5'} aria-hidden="true" />
                </div>
                <h3 className={cn('font-semibold', feature.featured && 'text-lg')}>{feature.title}</h3>
                <p className={cn('text-foreground/70', feature.featured ? 'max-w-md text-sm sm:text-base' : 'text-sm')}>
                  {feature.description}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ---- closing CTA — a gradient-ringed card on the page's own
          light background (not a second dark band) so Footer's own
          diagonal-clipped starfield top edge, right below, still reads
          as the one deliberate light-to-dark transition on the page
          instead of competing with an earlier one. */}
      <section className="px-6 pt-4 pb-20">
        <div className="relative mx-auto max-w-3xl rounded-[28px] p-[3px]" style={{ background: BRAND_GRADIENT }}>
          <div className="rounded-[25px] bg-white px-8 py-14 text-center sm:px-16">
            <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              Ready to get organized?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-foreground/70">
              Join Fauxcus and keep every task, deadline, and subtask in one place.
            </p>
            <div className="mt-8 flex justify-center">
              <Button
                size="lg"
                render={<Link to="/signup" />}
                nativeButton={false}
                className="rounded-full bg-[#56a456] px-6 shadow-lg shadow-[#56a456]/30 hover:bg-[#56a456]/90"
              >
                <span className="inline-flex items-center gap-1.5">
                  Sign up free
                  <ArrowRight className="size-4" aria-hidden="true" />
                </span>
              </Button>
            </div>
          </div>
        </div>
      </section>
      </main>

      {/* ---- footer — the same component every authenticated page
          uses, not a bespoke landing-page one, so the mark, link
          columns, and starfield ground are identical wherever they
          appear in the app. ---- */}
      <Footer />
    </div>
  )
}
