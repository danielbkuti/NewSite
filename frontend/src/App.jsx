import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import './App.css'
import { Button } from '@/components/ui/button'
import { LoginForm } from '@/components/LoginForm'
import { SignupForm } from '@/components/SignupForm'
import { SignupVerify } from '@/components/SignupVerify'
import { LandingPage } from '@/components/LandingPage'
import { TaskList } from '@/components/TaskList'
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

  if (authState === 'authenticated') {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="mx-auto flex max-w-md flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight">FlexMaster</h1>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{username}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Log out
              </Button>
            </div>
          </div>

          <TaskList />
        </div>
      </div>
    )
  }

  // anonymous — real routes now, instead of one hardcoded card
  return (
    <Routes>
      {/* Every public route nests under PublicLayout, so the gradient is
          one persistent element shared across all of them, not a copy
          re-painted per page. */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={
            <AuthLayout>
              <LoginForm
                onLoginSuccess={(data) => {
                  setUsername(data.username)
                  setAuthState('authenticated')
                }}
              />
            </AuthLayout>
          }
        />
        <Route
          path="/signup"
          element={
            <AuthLayout>
              <SignupForm />
            </AuthLayout>
          }
        />
        <Route
          path="/signup/verify/:token"
          element={
            <AuthLayout>
              <SignupVerify
                onSignupSuccess={(data) => {
                  setUsername(data.username)
                  setAuthState('authenticated')
                }}
              />
            </AuthLayout>
          }
        />
      </Route>
      {/* Unmatched paths land on the real homepage now, not login. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
