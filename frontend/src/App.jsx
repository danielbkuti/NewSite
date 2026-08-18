import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { LoginForm } from '@/components/LoginForm'
import { SignupForm } from '@/components/SignupForm'
import { SignupVerify } from '@/components/SignupVerify'
import { checkAuth, logout } from '@/lib/auth'

// Placeholder data — still not real API data. That's the next step, now
// that we can actually authenticate to reach /api/tasks/.
const tasks = [
  { id: 1, name: 'Set up frontend tooling', status: 'done' },
  { id: 2, name: 'Wire up the Django API', status: 'pending' },
  { id: 3, name: 'Build the task list screen', status: 'pending' },
]

// Shared shell for both auth screens (login + signup) — the gradient
// background, the top-left logo, and the bottom info bar are identical on
// both; only the card in the middle changes.
function AuthLayout({ children }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-[#e0c3fc] via-[#7c5fb0] to-[#8ec5fc] p-8">
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

          {tasks.map((task) => (
            <Card key={task.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Checkbox checked={task.status === 'done'} />
                  {task.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={task.status === 'done' ? 'default' : 'secondary'}>
                  {task.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // anonymous — real routes now, instead of one hardcoded card
  return (
    <Routes>
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
      {/* No landing page yet — that's a separate task. Everything else
          falls back to login for now. */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
