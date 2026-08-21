import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { User, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { to: '/home', label: 'Home' },
  { to: '/tasks', label: 'Tasks' },
  { to: '/goals', label: 'Goals' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/progress', label: 'Progress' },
]

const GRADIENT = 'bg-gradient-to-br from-[#e0c3fc] via-[#7c5fb0] to-[#8ec5fc]'

// Fixed top nav for the whole authenticated app. Starts off-white with a
// faint bottom hairline; past a small scroll threshold it blends into
// the same pastel gradient used on the login/signup pages, the
// wordmark swaps from its gradient fill to solid white, and all the
// nav text/icons go from dark to white with it.
//
// The background swap is a cross-fade, not a class swap: a browser
// can't smoothly transition between a flat color and a gradient
// (background-image isn't an interpolable property, it just snaps), so
// instead there are two full-size layers stacked on top of each other
// — one flat, one gradient — and scrolling fades one out while fading
// the other in via opacity, which *is* interpolable. Same trick for the
// wordmark, which needs to go from gradient-fill text to solid white.
export function NavBar({ firstName, onLogout }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    function handleScroll() {
      setScrolled((was) => {
        const isPast = window.scrollY > 8
        return isPast === was ? was : isPast
      })
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const linkClass = ({ isActive }) =>
    cn(
      'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-500',
      scrolled
        ? cn('text-white/80 hover:bg-white/10 hover:text-white', isActive && 'bg-white/20 text-white')
        : cn('text-black/70 hover:bg-black/5 hover:text-black', isActive && 'bg-black/10 text-black')
    )

  const mobileLinkClass = ({ isActive }) =>
    cn(
      'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors duration-500',
      scrolled
        ? cn('text-white/80', isActive && 'bg-white/20 text-white')
        : cn('text-black/70', isActive && 'bg-black/10 text-black')
    )

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* Flat, off-white layer — visible at rest, fades out on scroll. */}
      <div
        className={cn(
          'absolute inset-0 border-b border-black/10 bg-neutral-50 transition-opacity duration-500 ease-in-out',
          scrolled ? 'opacity-0' : 'opacity-100'
        )}
        aria-hidden="true"
      />
      {/* Gradient layer — hidden at rest, fades in on scroll. */}
      <div
        className={cn(
          GRADIENT,
          'absolute inset-0 shadow-sm transition-opacity duration-500 ease-in-out',
          scrolled ? 'opacity-100' : 'opacity-0'
        )}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <NavLink to="/home" className="relative inline-block text-xl font-bold tracking-tight">
          {/* Reserves layout space; the two crossfading spans sit on top
              of it via absolute inset-0. */}
          <span className="invisible">FlexMaster</span>
          <span
            className={cn(
              GRADIENT,
              'absolute inset-0 bg-clip-text text-transparent transition-opacity duration-500 ease-in-out',
              scrolled ? 'opacity-0' : 'opacity-100'
            )}
            aria-hidden="true"
          >
            FlexMaster
          </span>
          <span
            className={cn(
              'absolute inset-0 text-white transition-opacity duration-500 ease-in-out',
              scrolled ? 'opacity-100' : 'opacity-0'
            )}
            aria-hidden="true"
          >
            FlexMaster
          </span>
        </NavLink>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} className={linkClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex size-8 items-center justify-center rounded-full ring-1 transition-colors duration-500',
              scrolled ? 'bg-white/15 ring-white/30' : 'bg-white/70 ring-black/10'
            )}
            title={firstName || 'Profile'}
            aria-hidden="true"
          >
            <User className={cn('size-4 transition-colors duration-500', scrolled ? 'text-white' : 'text-black/70')} />
          </div>
          <button
            type="button"
            onClick={onLogout}
            title="Log out"
            aria-label="Log out"
            className={cn(
              'flex size-8 items-center justify-center rounded-full transition-colors duration-500',
              scrolled ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-black/5 text-black/70 hover:bg-black/10 hover:text-black'
            )}
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>

      {/* Compact link row for narrow screens — the centered layout above
          hides below md, this replaces it rather than squeezing five
          labels into the same header row. */}
      <nav className="relative z-10 flex items-center gap-1 overflow-x-auto border-t border-black/10 px-4 py-1.5 md:hidden">
        {NAV_LINKS.map((link) => (
          <NavLink key={link.to} to={link.to} className={mobileLinkClass}>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}
