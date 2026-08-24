const COLORS = ['#56a456', '#7c5fb0', '#8ec5fc', '#e0c3fc', '#f5c451']
const PARTICLE_COUNT = 14

// Deterministic per-index angle/distance rather than Math.random() — a
// burst that looks the same shape every time is fine (it's a celebratory
// flourish, not something that needs true randomness), and avoids
// re-randomizing on every re-render since this has no dependency array.
function particleStyle(i) {
  const angle = (i * (360 / PARTICLE_COUNT) + (i % 3) * 11) * (Math.PI / 180)
  const distance = 46 + (i % 4) * 14
  const dx = Math.cos(angle) * distance
  const dy = Math.sin(angle) * distance - 18 // bias upward so it reads as a "pop"
  return {
    backgroundColor: COLORS[i % COLORS.length],
    '--dx': `${dx}px`,
    '--dy': `${dy}px`,
    '--rot': `${(angle * 180) / Math.PI + 180}deg`,
    animation: `confetti-burst 850ms ease-out ${i * 18}ms forwards`,
  }
}

// A short celebratory burst anchored at the top-left of its positioned
// parent — used by TaskCard when a task is marked complete, before it
// actually drops down into the Completed section.
export function ConfettiBurst() {
  return (
    <div className="pointer-events-none absolute top-6 left-10 z-20" aria-hidden="true">
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        <span key={i} className="absolute size-1.5 rounded-sm" style={particleStyle(i)} />
      ))}
    </div>
  )
}
