import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

// A vertical scroll-snap wheel — the iOS/Apple-style picker: scroll to
// bring a row to the center band, or tap a row to jump to it. Renders
// every item rather than virtualizing; fine at the list sizes this is
// used for (a few hundred rows at most), and keeps the component simple.
export function WheelPicker({ items, value, onChange, itemHeight = 40, visibleCount = 5, className }) {
  const containerRef = useRef(null)
  const scrollTimeoutRef = useRef(null)
  const didMountRef = useRef(false)
  const padding = itemHeight * Math.floor(visibleCount / 2)
  const selectedIndex = items.findIndex((item) => item.value === value)

  // Keeps the scroll position in sync with the controlled `value` —
  // guarded so it only actually writes `scrollTop` when it's not
  // already there, which is what stops this from fighting an
  // in-progress scroll gesture: the scroll handler below updates
  // `value` only after the user's scroll has settled, by which point
  // the position already matches and this is a no-op.
  useEffect(() => {
    const el = containerRef.current
    if (!el || selectedIndex < 0) return
    const target = selectedIndex * itemHeight
    if (Math.abs(el.scrollTop - target) > 1) {
      el.scrollTo({ top: target, behavior: didMountRef.current ? 'smooth' : 'instant' })
    }
    didMountRef.current = true
  }, [selectedIndex, itemHeight])

  function handleScroll() {
    clearTimeout(scrollTimeoutRef.current)
    // Debounced rather than firing on every scroll tick — only decide
    // what's "selected" once the wheel has actually settled, same as
    // a real iOS picker only committing once it stops spinning.
    scrollTimeoutRef.current = setTimeout(() => {
      const el = containerRef.current
      if (!el) return
      const index = Math.round(el.scrollTop / itemHeight)
      const clamped = Math.min(items.length - 1, Math.max(0, index))
      const item = items[clamped]
      if (item && item.value !== value) onChange(item.value)
    }, 120)
  }

  useEffect(() => () => clearTimeout(scrollTimeoutRef.current), [])

  return (
    <div className={cn('relative', className)} style={{ height: itemHeight * visibleCount }}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 rounded-md bg-muted/70"
        style={{ top: padding, height: itemHeight }}
      />
      <div
        ref={containerRef}
        onScroll={handleScroll}
        role="listbox"
        className="relative h-full overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          scrollSnapType: 'y mandatory',
          paddingTop: padding,
          paddingBottom: padding,
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 25%, black 75%, transparent)',
          maskImage: 'linear-gradient(to bottom, transparent, black 25%, black 75%, transparent)',
        }}
      >
        {items.map((item) => (
          <div
            key={item.value}
            role="option"
            aria-selected={item.value === value}
            onClick={() => onChange(item.value)}
            className={cn(
              'flex cursor-pointer items-center justify-center text-sm tabular-nums transition-colors',
              item.value === value ? 'font-semibold text-foreground' : 'text-muted-foreground'
            )}
            style={{ height: itemHeight, scrollSnapAlign: 'center' }}
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  )
}
