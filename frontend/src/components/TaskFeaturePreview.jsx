import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { ConfettiBurst } from '@/components/ConfettiBurst'
import { cn } from '@/lib/utils'

const PROGRESS_GRADIENT = 'bg-gradient-to-r from-[#e0c3fc] via-[#7c5fb0] to-[#8ec5fc]'
const SCENES = ['progress', 'confetti', 'complete', 'cascade']
const SCENE_MS = 2000

// A silent, looping preview of four of the app's real completion
// animations — the progress bar filling, the confetti burst, the
// Pending -> Complete gradient sweep, and subtasks checking off one by
// one — replayed here with the same components/classes those actually
// use, rather than a recorded video file. That keeps it pixel-
// identical to the real thing with no separate asset to host or keep
// in sync as those animations change. Cycles while `active` (the
// "Start a new task" card being hovered); each scene resets and
// restarts from scratch every time it's revisited, and the whole
// thing unmounts the moment hover ends.
export function TaskFeaturePreview({ active }) {
  const [sceneIndex, setSceneIndex] = useState(0)

  useEffect(() => {
    if (!active) {
      setSceneIndex(0)
      return
    }
    const id = setInterval(() => setSceneIndex((i) => (i + 1) % SCENES.length), SCENE_MS)
    return () => clearInterval(id)
  }, [active])

  if (!active) return null

  const scene = SCENES[sceneIndex]
  return (
    <div className="w-full">
      {scene === 'progress' && <ProgressScene />}
      {scene === 'confetti' && <ConfettiScene />}
      {scene === 'complete' && <CompleteScene />}
      {scene === 'cascade' && <CascadeScene />}
    </div>
  )
}

// Every scene starts its own transition a beat after mount rather than
// at the initial state itself — a CSS transition needs its starting
// value actually painted first, or the browser has nothing to animate
// from and it just snaps straight to the end state.
const START_DELAY_MS = 80

function ProgressScene() {
  const [filled, setFilled] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setFilled(true), START_DELAY_MS)
    return () => clearTimeout(id)
  }, [])

  return (
    <div className="flex flex-col gap-1.5 px-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full', PROGRESS_GRADIENT)}
          style={{ width: filled ? '100%' : '0%', transition: 'width 1600ms ease-out' }}
        />
      </div>
      <p className="text-center text-[11px] text-muted-foreground">{filled ? '100' : '0'}% complete</p>
    </div>
  )
}

function ConfettiScene() {
  const [burst, setBurst] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setBurst(true), START_DELAY_MS)
    return () => clearTimeout(id)
  }, [])

  return (
    <div className="relative flex items-center justify-center py-2">
      {burst && <ConfettiBurst />}
      <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700">
        Completed
      </span>
    </div>
  )
}

function CompleteScene() {
  const [filled, setFilled] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setFilled(true), START_DELAY_MS)
    return () => clearTimeout(id)
  }, [])

  return (
    <div className="flex items-center justify-center py-2">
      <span
        className={cn(
          'relative overflow-hidden rounded-full px-4 py-1.5 text-xs font-semibold',
          !filled && 'bg-secondary text-secondary-foreground'
        )}
      >
        <span
          aria-hidden="true"
          className={cn(PROGRESS_GRADIENT, 'absolute inset-0 origin-left')}
          style={{ transform: filled ? 'scaleX(1)' : 'scaleX(0)', transition: 'transform 700ms ease-linear' }}
        />
        <span className={cn('relative', filled && 'text-white')}>{filled ? 'Complete' : 'Pending'}</span>
      </span>
    </div>
  )
}

const CASCADE_ITEMS = ['Draft outline', 'Add sources', 'Proofread']

function CascadeScene() {
  const [checkedCount, setCheckedCount] = useState(0)

  useEffect(() => {
    if (checkedCount >= CASCADE_ITEMS.length) return
    const id = setTimeout(() => setCheckedCount((c) => c + 1), 500)
    return () => clearTimeout(id)
  }, [checkedCount])

  return (
    <div className="flex flex-col gap-1 px-2">
      {CASCADE_ITEMS.map((name, i) => {
        const checked = i < checkedCount
        return (
          <div key={name} className="flex items-center gap-1.5 rounded-md border bg-card px-2 py-1 text-[11px]">
            <span
              className={cn(
                'flex size-3 shrink-0 items-center justify-center rounded-[3px] border transition-colors duration-300',
                checked ? 'border-emerald-500 bg-emerald-500' : 'border-input'
              )}
            >
              {checked && <Check className="size-2.5 text-white" strokeWidth={3} />}
            </span>
            <span
              className={cn(
                'truncate transition-colors duration-300',
                checked && 'text-muted-foreground line-through'
              )}
            >
              {name}
            </span>
          </div>
        )
      })}
    </div>
  )
}
