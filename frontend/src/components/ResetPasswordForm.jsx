import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { checkPasswordResetLink, confirmPasswordReset } from '@/lib/auth'
import { cn } from '@/lib/utils'

// Same boxed-field-with-show/hide pattern as SignupVerify's local
// AuthField — duplicated rather than shared, matching how each auth
// form in this app already hand-rolls its own field markup (LoginForm
// and SignupForm do too) rather than pulling from one shared component.
function AuthField({ id, label, value, onChange, focused, onFocus, onBlur, error, autoComplete }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="flex flex-col gap-0.5">
      <div
        className={cn(
          'flex flex-col gap-0.5 rounded-t-md border-b-2 bg-black/5 px-3 pt-2 pb-1.5 transition-colors',
          focused ? 'border-sky-400 bg-[#8ec5fc]/20' : 'border-black/30'
        )}
      >
        <label
          htmlFor={id}
          className={cn(
            'text-xs font-medium transition-colors',
            focused ? 'text-sky-500' : 'text-black/60'
          )}
        >
          {label}
        </label>
        <div className="flex items-center gap-2">
          <input
            id={id}
            type={visible ? 'text' : 'password'}
            value={value}
            onChange={onChange}
            onFocus={onFocus}
            onBlur={onBlur}
            autoComplete={autoComplete}
            required
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-black outline-none"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            tabIndex={-1}
            aria-label={visible ? 'Hide password' : 'Show password'}
            className="text-black/50 hover:text-black/80"
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function splitErrors(errors) {
  const { __all__, ...perField } = errors
  const fieldErrors = {}
  for (const [field, issues] of Object.entries(perField)) {
    fieldErrors[field] = issues[0]?.message
  }
  return { fieldErrors, generalError: __all__?.[0]?.message ?? null }
}

// The page the emailed reset link points at. Checks the link's still
// good on mount (GET), then submits the new password (POST) — same
// uid/token pair validated both times, same "one resource, two
// actions" shape as the backend view (password_reset_confirm_api).
export function ResetPasswordForm({ onResetSuccess }) {
  const { uidb64, token } = useParams()

  // 'checking' | 'invalid' | 'ready'
  const [status, setStatus] = useState('checking')
  const [values, setValues] = useState({ password1: '', password2: '' })
  const [focusedField, setFocusedField] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [generalError, setGeneralError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    checkPasswordResetLink(uidb64, token)
      .then((data) => setStatus(data.valid ? 'ready' : 'invalid'))
      .catch(() => setStatus('invalid'))
  }, [uidb64, token])

  const setValue = (field) => (e) =>
    setValues((v) => ({ ...v, [field]: e.target.value }))

  const focusHandlers = (field) => ({
    onFocus: () => setFocusedField(field),
    onBlur: () => setFocusedField((f) => (f === field ? null : f)),
  })

  async function handleSubmit(event) {
    event.preventDefault()
    setFieldErrors({})
    setGeneralError(null)
    setSubmitting(true)

    try {
      const data = await confirmPasswordReset(uidb64, token, values)
      onResetSuccess(data)
    } catch (err) {
      if (err.data?.errors) {
        const { fieldErrors, generalError } = splitErrors(err.data.errors)
        setFieldErrors(fieldErrors)
        setGeneralError(generalError)
      } else {
        setGeneralError(err.data?.detail ?? 'Something went wrong. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'checking') {
    return (
      <Card className="w-full max-w-sm zoom-[1.125] border-transparent bg-[#f8f9fa] text-black shadow-2xl">
        <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
          <p className="text-sm text-black/70">Checking your link…</p>
        </CardContent>
      </Card>
    )
  }

  if (status === 'invalid') {
    return (
      <Card className="w-full max-w-sm zoom-[1.125] border-transparent bg-[#f8f9fa] text-black shadow-2xl">
        <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
          <h2 className="text-2xl font-bold text-black">Link invalid or expired</h2>
          <p className="text-sm text-black/70">
            This password reset link is no longer valid. Request a new one below.
          </p>
          <Link
            to="/forgot-password"
            className="text-sm font-semibold text-sky-600 hover:underline"
          >
            Request a new link
          </Link>
        </CardContent>
      </Card>
    )
  }

  // status === 'ready'
  return (
    <Card className="w-full max-w-sm zoom-[1.125] border-transparent bg-[#f8f9fa] text-black shadow-2xl">
      <CardContent className="flex flex-col gap-5 pt-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold text-black">Choose a new password</h2>
          <p className="text-sm text-black/70">You&apos;ll be logged in right after.</p>
        </div>

        {/* Mirrors the backend's actual AUTH_PASSWORD_VALIDATORS config
            (backend/flexmaster/settings.py) — keep in sync if that
            list changes. Same checklist SignupVerify shows. */}
        <ul className="list-disc space-y-0.5 rounded-md bg-black/5 px-4 py-3 pl-8 text-xs text-black/60">
          <li>At least 8 characters</li>
          <li>Not entirely numbers</li>
          <li>Not a commonly used password</li>
          <li>Not too similar to your name, username, or email</li>
        </ul>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <AuthField
            id="password1"
            label="New password"
            value={values.password1}
            onChange={setValue('password1')}
            focused={focusedField === 'password1'}
            error={fieldErrors.password1}
            autoComplete="new-password"
            {...focusHandlers('password1')}
          />

          <AuthField
            id="password2"
            label="Confirm new password"
            value={values.password2}
            onChange={setValue('password2')}
            focused={focusedField === 'password2'}
            error={fieldErrors.password2}
            autoComplete="new-password"
            {...focusHandlers('password2')}
          />

          {generalError && <p className="text-xs text-destructive">{generalError}</p>}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full py-3 text-base font-semibold hover:bg-[#8ec5fc] hover:text-black"
          >
            {submitting ? 'Saving…' : 'Reset password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
