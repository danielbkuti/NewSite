import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import './App.css'
import { LoginForm } from '@/components/LoginForm'
import { SignupForm } from '@/components/SignupForm'
import { SignupVerify } from '@/components/SignupVerify'
import { LandingPage } from '@/components/LandingPage'
import { AppShell } from '@/components/AppShell'
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

function App() {
  // 'loading' | 'authenticated' | 'anonymous'
  const [authState, setAuthState] = useState('loading')
  const [username, setUsername] = useState(null)

  useEffect(() => {
    checkAuth()
      .then((data) => {
        if (data.authenticated) {
          setUsername(data.username)
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
    setAuthState('anonymous')
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
  // now actually reflects where you are (/tasks vs /, /login, …),
  // refresh and back/forward work, and each route decides for itself
  // whether the current auth state is allowed there — landing/login/
  // signup redirect an already-authenticated visitor straight to
  // /tasks, and /tasks redirects an anonymous one back to /.
  return (
    <Routes>
      {/* Every public route nests under PublicLayout, so the gradient is
          one persistent element shared across all of them, not a copy
          re-painted per page. */}
      <Route element={<PublicLayout />}>
        <Route
          path="/"
          element={isAuthenticated ? <Navigate to="/tasks" replace /> : <LandingPage />}
        />
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/tasks" replace />
            ) : (
              <AuthLayout>
                <LoginForm
                  onLoginSuccess={(data) => {
                    setUsername(data.username)
                    setAuthState('authenticated')
                  }}
                />
              </AuthLayout>
            )
          }
        />
        <Route
          path="/signup"
          element={
            isAuthenticated ? (
              <Navigate to="/tasks" replace />
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
              <Navigate to="/tasks" replace />
            ) : (
              <AuthLayout>
                <SignupVerify
                  onSignupSuccess={(data) => {
                    setUsername(data.username)
                    setAuthState('authenticated')
                  }}
                />
              </AuthLayout>
            )
          }
        />
      </Route>

      <Route
        path="/tasks"
        element={
          isAuthenticated ? (
            <AppShell username={username} onLogout={handleLogout} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      {/* Unmatched paths land on the real homepage (or the app, if
          already logged in), not a dead end. */}
      <Route path="*" element={<Navigate to={isAuthenticated ? '/tasks' : '/'} replace />} />
    </Routes>
  )
}

export default App
