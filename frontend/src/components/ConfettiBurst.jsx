// Blue ↔ pink. Sky, royal, light pink, magenta, then a pale blue to keep
// the mix from reading purple.
const FW_COLORS = ['#8ec5fc', '#4f8ef7', '#f9a8d4', '#ec4899', '#c7dcff']

// Five emitters, left → right, so the celebration sweeps the whole card
// instead of popping from one or two spots. `scale` sizes the shell; the
// centre one is biggest, which puts the visual weight in the middle of
// the card.
const FW_EMITTERS = [
  { left: '10%', top: '34px', delay: 0, scale: 0.85 },
  { left: '30%', top: '14px', delay: 160, scale: 1.05 },
  { left: '52%', top: '4px', delay: 320, scale: 1.3 },
  { left: '74%', top: '16px', delay: 480, scale: 1.05 },
  { left: '92%', top: '36px', delay: 640, scale: 0.85 },
]

const SPARK_COUNT = 22 // outer ring
const SPARK2_COUNT = 10 // inner ring, all white, fires 50ms later

function degToRad(deg) {
  return (deg * Math.PI) / 180
}

// Deterministic per-index angle/distance/timing, same reasoning as the old
// confetti particles — no Math.random(), so a re-render never re-randomises
// a burst mid-flight. `e` is the emitter's own index, folded into the
// colour pick so the three shells don't all cycle through the palette in
// lockstep.
function outerSparkStyle(i, e, scale, burstAt) {
  const angle = i * (360 / SPARK_COUNT) + (i % 3) * 6 // %3 jitter breaks the wheel look
  const dist = (86 + (i % 4) * 16) * scale
  const sx = Math.cos(degToRad(angle)) * dist
  const sy = Math.sin(degToRad(angle)) * dist + 34 // +34px = gravity droop
  const size = 3
  const color = FW_COLORS[(i + e) % FW_COLORS.length]
  const duration = 900 + (i % 4) * 110
  const delay = burstAt + (i % 5) * 16
  return {
    left: `${-size / 2}px`,
    top: `${-size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    background: color,
    boxShadow: `0 0 ${size * 3}px ${size * 0.8}px ${color}`,
    opacity: 0,
    '--sx': `${sx}px`,
    '--sy': `${sy}px`,
    animation: `fw-spark ${duration}ms cubic-bezier(.15,.6,.35,1) ${delay}ms forwards`,
  }
}

function innerSparkStyle(i, scale, burstAt) {
  const angle = i * (360 / SPARK2_COUNT) + 22
  const dist = (42 + (i % 3) * 12) * scale
  const sx = Math.cos(degToRad(angle)) * dist
  const sy = Math.sin(degToRad(angle)) * dist + 18
  const size = 2
  const color = '#fff'
  const delay = burstAt + 50
  return {
    left: `${-size / 2}px`,
    top: `${-size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    background: color,
    boxShadow: `0 0 ${size * 3}px ${size * 0.8}px ${color}`,
    opacity: 0,
    '--sx': `${sx}px`,
    '--sy': `${sy}px`,
    animation: `fw-spark 600ms cubic-bezier(.15,.6,.35,1) ${delay}ms forwards`,
  }
}

// A single shell: white flash → expanding ring → two rings of sparks,
// all timed off the same `burstAt` moment so it reads as one event
// rather than three separate effects. Bursts immediately at `em.delay`
// — no rising trail beforehand (that read as a stray dot appearing
// before the "explosion", not part of it).
function Shell({ em, e }) {
  const burstAt = em.delay
  return (
    <div className="absolute" style={{ left: em.left, top: em.top, width: 0, height: 0 }}>
      <span
        className="absolute rounded-full"
        style={{
          left: `${-16 * em.scale}px`,
          top: `${-16 * em.scale}px`,
          width: `${32 * em.scale}px`,
          height: `${32 * em.scale}px`,
          background:
            'radial-gradient(circle, #fff 0%, rgba(249,168,212,.8) 38%, rgba(142,197,252,.35) 60%, rgba(142,197,252,0) 76%)',
          // Explicit resting opacity — without it, the shape sits here
          // fully visible at its plain (unanimated) size for the whole
          // `burstAt` delay, reading as a little circle sitting on the
          // card before it "explodes". Same fix as the spark styles
          // below already had (they set opacity: 0 inline); this and
          // the ring beneath it didn't.
          opacity: 0,
          animation: `fw-flash 520ms ease-out ${burstAt}ms forwards`,
        }}
      />
      <span
        className="absolute rounded-full"
        style={{
          left: `${-85 * em.scale}px`,
          top: `${-85 * em.scale}px`,
          width: `${170 * em.scale}px`,
          height: `${170 * em.scale}px`,
          border: '3px solid rgba(236,72,153,.6)',
          opacity: 0,
          animation: `fw-ring 760ms cubic-bezier(.2,.7,.3,1) ${burstAt}ms forwards`,
        }}
      />
      {Array.from({ length: SPARK_COUNT }).map((_, i) => (
        <span key={`o${i}`} className="absolute rounded-full" style={outerSparkStyle(i, e, em.scale, burstAt)} />
      ))}
      {Array.from({ length: SPARK2_COUNT }).map((_, i) => (
        <span key={`i${i}`} className="absolute rounded-full" style={innerSparkStyle(i, em.scale, burstAt)} />
      ))}
    </div>
  )
}

// Was disabled app-wide ("reported broken/damaged") — root cause found
// and fixed: TaskCard's collapsed subtask stack gives every row its own
// `transform` (for the peek-scale effect), which opens a fresh CSS
// stacking context per row. A burst mounted on a row with a lower
// resting z-index than its neighbors was rendered *inside* that row's
// own context, so it painted entirely behind whichever row sits in
// front of it in the stack — the burst wasn't actually damaged, it was
// invisible, chopped off wherever it crossed under a neighboring card.
// Same class of bug this codebase already diagnosed once for
// DeadlineEditor. Fixed at the call site (TaskCard bumps a celebrating
// row's z-index above its siblings for the burst's duration) rather
// than here, so this flag is back on.
const FIREWORKS_ENABLED = true

// A short celebratory burst covering its positioned parent — used by
// TaskCard when a task or subtask is marked complete. Five shells fired
// left-to-right across the card rather than a single pop from one corner.
export function ConfettiBurst() {
  if (!FIREWORKS_ENABLED) return null

  const reducedMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (reducedMotion) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {FW_EMITTERS.map((em, e) => (
        <Shell key={e} em={em} e={e} />
      ))}
    </div>
  )
}
