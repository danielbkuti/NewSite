import { useCallback, useEffect, useRef } from 'react'

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

// Slides each registered card in from the left the first time it crosses
// into the viewport — including on initial load, if it's already in the
// viewport (the observer's first callback covers that for free, no
// special-casing needed). One IntersectionObserver shared across every
// card a page registers, rather than one per card — cheap no matter how
// many cards are on screen, and off the main scroll thread entirely (no
// scroll-event listener, so no scroll-jank risk).
//
// A card is unobserved right after its first reveal, so re-scrolling past
// an already-revealed card never replays the animation. Re-registering an
// already-revealed node (e.g. a re-sort swaps DOM nodes around, or React
// re-runs the ref callback on an unrelated re-render) is a no-op — it's
// detected by the class the first reveal already left behind, not by
// tracking node identity, so it survives a re-render fine.
//
// The observer is created lazily, the first time a card actually
// registers — not in a `useEffect` — because React attaches refs (calling
// `registerCard`) during commit, *before* passive effects ever run; an
// effect-created observer would always miss every card present on the
// very first render.
//
// `enabled` is false — and `registerCard` a no-op — when the browser has
// no IntersectionObserver or the viewer has requested reduced motion.
// Callers must gate their own "start hidden" styling on `enabled` too
// (see TaskList.jsx): if the caller always applied the hidden starting
// class, a card would stay invisible forever whenever this hook can't
// ever fire the reveal.
export function useScrollReveal() {
  const enabled = typeof IntersectionObserver !== 'undefined' && !prefersReducedMotion()
  const observerRef = useRef(null)

  useEffect(() => {
    return () => observerRef.current?.disconnect()
  }, [])

  const registerCard = useCallback(
    (node) => {
      if (!enabled || !node) return
      if (node.classList.contains('card-reveal-visible')) return
      if (!observerRef.current) {
        observerRef.current = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue
              entry.target.classList.add('card-reveal-visible')
              observerRef.current.unobserve(entry.target)
            }
          },
          { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
        )
      }
      observerRef.current.observe(node)
    },
    [enabled]
  )

  return { registerCard, enabled }
}
