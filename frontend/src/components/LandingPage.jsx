import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { checkEmailExists } from '@/lib/auth'

// Sample data for the "see it in action" section below — deliberately
// shaped exactly like a real task from the API (id/name/status/completed/
// dateDeadline), so it renders through the same visual language as the
// real app rather than a mockup that could quietly drift from it.
const SAMPLE_TASKS = [
  { id: 1, name: 'Draft Q3 project brief', status: 'pending', completed: false, dateDeadline: null },
  { id: 2, name: "Review teammate's pull request", status: 'completed', completed: true, dateDeadline: null },
  { id: 3, name: 'Prepare client demo', status: 'pending', completed: false, dateDeadline: '2026-09-05T00:00:00Z' },
]

const FEATURES = [
  {
    title: 'Stay on schedule',
    description: 'Set a deadline on any task and see it right on the card — no digging through a separate calendar.',
  },
  {
    title: 'Break it down',
    description: 'Split a task into subtasks. Finish all of them and the parent task marks itself done automatically.',
  },
  {
    title: 'See progress at a glance',
    description: 'A clear status badge on every task means you always know what’s pending, in progress, or done.',
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

function DemoTaskCard({ task }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Checkbox checked={task.completed} disabled />
          <span className={task.completed ? 'text-muted-foreground line-through' : ''}>
            {task.name}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Badge variant={task.completed ? 'default' : 'secondary'}>
          {task.status.replace('_', ' ')}
        </Badge>
        {task.dateDeadline && (
          <p className="text-xs text-white">
            Due{' '}
            {new Date(task.dateDeadline).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              timeZone: 'UTC',
            })}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
{/*
<span className="absolute top-6 left-8 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-xl font-bold text-transparent">
        FlexMaster
      </span>
        <nav className="absolute right-6 items-center gap-3">
          <Link to="/login" className="text-sm text-white hover:text-foreground">
            Log in
          </Link>
          <Button size="sm" render={<Link to="/signup" />} className="bg-gradient-to-r from-blue-500 to-purple-600" nativeButton={false}>
            Sign up
          </Button>
          */}
export function LandingPage() {
  const heroBadgeVariant = useCyclingBadgeVariant()
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
      // real signup flow. Either way the email carries over as route
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
      <header className="flex max items-center justify-between p-6">
        <span className="left-6 text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text bg-clip-text text-transparent tracking-tight">FlexMaster</span>
        <nav className="flex items-center gap-3">
          <Link to="/login" className="text-sm text-white hover:text-foreground">
            Log in
          </Link>
          <Button size="sm" render={<Link to="/signup" />} className="bg-[#56a456]" nativeButton={false}>
            Sign up
          </Button>
        </nav>
      </header>

      {/* ---- hero ---- */}
      <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 py-16 text-center">
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
        <p className="max-w-xl text-lg text-white">
          FlexMaster tracks tasks, subtasks, and deadlines in one place — so nothing
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
        {heroError && <p className="text-sm text-destructive">{heroError}</p>}
      </section>

      {/* ---- see it in action: real TaskCard-shaped data, not a mockup ---- */}
      <section className="border-t bg-muted/30 px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight">
            See it in action
          </h2>
          <div className="flex flex-col gap-4">
            {SAMPLE_TASKS.map((task) => (
              <DemoTaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      </section>

      {/* ---- feature highlights ---- */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-8 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="flex flex-col gap-2">
              <h3 className="font-semibold">{feature.title}</h3>
              <p className="text-sm text-white">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- closing CTA ---- */}
      <section className="border-t px-6 py-16 text-center">
        <h2 className="mb-4 text-2xl font-semibold tracking-tight">
          Ready to get organized?
        </h2>
        <Button size="lg" render={<Link to="/signup" />} nativeButton={false}>
          Sign up free
        </Button>
      </section>

      {/* ---- footer ---- */}
      <footer className="flex justify-center gap-6 border-t p-4 text-sm text-white">
        <a href="...">Contact Us</a>
        <a href="...">About</a>
      </footer>
    </div>
  )
}
