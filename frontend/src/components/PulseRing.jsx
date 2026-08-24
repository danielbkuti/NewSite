import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

const PULSE_DURATION_MS = 1000
const INITIAL_PULSE_COUNT = 5

// A pulsing ring meant to draw the eye to something urgent — sits
// behind an overdue/urgent due-date badge. Pulses INITIAL_PULSE_COUNT
// times right after mount (a page load/reload), then goes quiet
// rather than pulsing forever. After that, scrolling it out of view
// and back earns exactly one more pulse, not a fresh burst of five —
// a light nudge on re-encounter, not a repeat alarm. Reused as-is on
// both the task list (many of these on screen, scrolling in and out)
// and the task detail page (one, rarely scrolled — the re-entry
// behavior is just inert there, not wrong).
//
// `ready` (default true) gates when the initial burst is allowed to
// start — the task list passes `ready={false}` while the overdue gate
// modal is covering the screen, so cards underneath it don't spend
// their five pulses on a burst nobody can see; once the modal's
// dismissed, `ready` flips true and the burst starts for real.
export function PulseRing({ className, ready = true }) {
  const ref = useRef(null)
  // 'waiting' | 'initial' | 'idle' | 'once'
  const [phase, setPhase] = useState(ready ? 'initial' : 'waiting')
  const wasVisibleRef = useRef(null)
  const prevReadyRef = useRef(ready)

  // Reacts to `ready` actually *changing*, not just its value at
  // mount — the task list's own `ready` can briefly flash true right
  // at mount (its overdue check hasn't run yet, so the gate hasn't
  // shown itself as blocking) before settling to false once the modal
  // appears. Without this, that flash would already have started the
  // burst via the useState initializer above, and it'd quietly finish
  // *behind* the modal — the exact thing `ready` exists to prevent.
  // Only a genuine false -> true edge (re)starts the burst; going
  // not-ready at any point interrupts whatever was happening back to
  // 'waiting', so a stray head start never survives.
  useEffect(() => {
    const wasReady = prevReadyRef.current
    prevReadyRef.current = ready
    if (!ready) {
      setPhase('waiting')
    } else if (!wasReady) {
      setPhase('initial')
    }
  }, [ready])

  useEffect(() => {
    if (phase !== 'initial') return
    const timer = setTimeout(() => setPhase('idle'), INITIAL_PULSE_COUNT * PULSE_DURATION_MS)
    return () => clearTimeout(timer)
  }, [phase])

  useEffect(() => {
    if (phase !== 'idle') return
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (wasVisibleRef.current === null) {
          // First reading after entering idle just establishes a
          // baseline — otherwise merely being on-screen already would
          // read as a "re-entry" and fire immediately.
          wasVisibleRef.current = entry.isIntersecting
          return
        }
        if (entry.isIntersecting && !wasVisibleRef.current) {
          setPhase('once')
        }
        wasVisibleRef.current = entry.isIntersecting
      },
      { threshold: 0.5 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [phase])

  useEffect(() => {
    if (phase !== 'once') return
    const timer = setTimeout(() => setPhase('idle'), PULSE_DURATION_MS)
    return () => clearTimeout(timer)
  }, [phase])

  const pulsing = phase === 'initial' || phase === 'once'

  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 rounded-full bg-red-500',
        pulsing ? 'animate-ping opacity-75' : 'opacity-0',
        className
      )}
      style={pulsing ? { animationIterationCount: phase === 'initial' ? INITIAL_PULSE_COUNT : 1 } : undefined}
    />
  )
}
