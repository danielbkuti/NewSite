import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import './App.css'
import { LoginForm } from '@/components/LoginForm'
import { SignupForm } from '@/components/SignupForm'
import { SignupVerify } from '@/components/SignupVerify'
import { LandingPage } from '@/components/LandingPage'
import { NavBar } from '@/components/NavBar'
import { Dashboard } from '@/components/Dashboard'
import { TasksPage } from '@/components/TasksPage'
import { ComingSoonPage } from '@/components/ComingSoonPage'
import { Footer } from '@/components/Footer'
import { checkAuth, logout } from '@/lib/auth'

// Wraps every public route (landing, login, signup, verify) so the
// gradient is one persistent element that never unmounts as you
// navigate between them — not a copy re-painted on each page. <Outlet />
// is where React Router renders whichever child route actually matched.
function PublicLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e0c3fc] via-[#7c5fb0] to-[#8ec5fc]">
      <Outlet />
    </div>
  )
}

// Shared shell for the auth screens (login + signup + verify) — the
// top-left logo and the bottom info bar are identical on all three; only
// the card in the middle changes. The gradient itself now lives on
// PublicLayout, one level up, so it isn't duplicated here.

function AuthLayout({ children }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center p-8">
      <span className="absolute top-6 left-8 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-xl font-bold text-transparent">
        FlexMaster
      </span>
      {children}
      <div className="absolute bottom-0 left-0 flex w-full justify-center gap-6 bg-[#f8f9fa] p-4 text-sm">
        <a href="...">Contact Us</a>
        <a href="...">About</a>
      </div>
    </div>
  )
}

// Shell for every authenticated page (Home, Tasks, Goals, Calendar,
// Progress) — NavBar is one persistent element shared across all of
// them, same pattern as PublicLayout above.
function AuthenticatedLayout({ firstName, onLogout }) {
  return (
    <div className="min-h-screen bg-background">
      <NavBar firstName={firstName} onLogout={onLogout} />
      {/* NavBar is fixed, and taller on narrow screens (it grows a second
          link row below md) — pt-28 clears that worst case, pt-16 clears
          the single-row desktop height (h-16) from md up. */}
      <div className="pt-28 md:pt-16">
        <Outlet />
        <Footer />
      </div>
    </div>
  )
}

function App() {
  // 'loading' | 'authenticated' | 'anonymous'
  const [authState, setAuthState] = useState('loading')
  const [username, setUsername] = useState(null)
  const [firstName, setFirstName] = useState('')

  useEffect(() => {
    checkAuth()
      .then((data) => {
        if (data.authenticated) {
          setUsername(data.username)
          setFirstName(data.first_name)
          setAuthState('authenticated')
        } else {
          setAuthState('anonymous')
        }
      })
      .catch(() => setAuthState('anonymous'))
  }, [])

  async function handleLogout() {
    await logout()
    setUsername(null)
    setFirstName('')
    setAuthState('anonymous')
  }

  function handleAuthSuccess(data) {
    setUsername(data.username)
    setFirstName(data.first_name)
    setAuthState('authenticated')
  }

  if (authState === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  const isAuthenticated = authState === 'authenticated'

  // A single route tree for both auth states, rather than an early
  // return that bypasses routing entirely once logged in: the URL bar
  // now actually reflects where you are, refresh and back/forward work,
  // and each route decides for itself whether the current auth state is
  // allowed there — landing/login/signup redirect an already
  // authenticated visitor straight to /home, and every authenticated
  // page redirects an anonymous one back to /.
  return (
    <Routes>
      {/* Every public route nests under PublicLayout, so the gradient is
          one persistent element shared across all of them, not a copy
          re-painted per page. */}
      <Route element={<PublicLayout />}>
        <Route
          path="/"
          element={isAuthenticated ? <Navigate to="/home" replace /> : <LandingPage />}
        />
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/home" replace />
            ) : (
              <AuthLayout>
                <LoginForm onLoginSuccess={handleAuthSuccess} />
              </AuthLayout>
            )
          }
        />
        <Route
          path="/signup"
          element={
            isAuthenticated ? (
              <Navigate to="/home" replace />
            ) : (
              <AuthLayout>
                <SignupForm />
              </AuthLayout>
            )
          }
        />
        <Route
          path="/signup/verify/:token"
          element={
            isAuthenticated ? (
              <Navigate to="/home" replace />
            ) : (
              <AuthLayout>
                <SignupVerify onSignupSuccess={handleAuthSuccess} />
              </AuthLayout>
            )
          }
        />
      </Route>

      {/* Every authenticated route nests under AuthenticatedLayout, so
          the guard (redirect anonymous visitors to /) only needs to
          live in one place instead of being repeated per page. */}
      <Route
        element={
          isAuthenticated ? (
            <AuthenticatedLayout firstName={firstName} onLogout={handleLogout} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      >
        <Route path="/home" element={<Dashboard firstName={firstName} username={username} />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/goals" element={<ComingSoonPage title="Goals" />} />
        <Route path="/calendar" element={<ComingSoonPage title="Calendar" />} />
        <Route path="/progress" element={<ComingSoonPage title="Progress" />} />
      </Route>

      {/* Unmatched paths land on the real homepage (or the dashboard, if
          already logged in), not a dead end. */}
      <Route path="*" element={<Navigate to={isAuthenticated ? '/home' : '/'} replace />} />
    </Routes>
  )
}

export default App
