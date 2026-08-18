import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SignupProgress } from '@/components/SignupProgress'
import { checkPendingSignup, submitSignupDetails, completeSignup } from '@/lib/auth'
import { cn } from '@/lib/utils'

// Same boxed-field pattern used everywhere else in the auth forms.
function AuthField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  focused,
  onFocus,
  onBlur,
  error,
  autoComplete,
  required = true,
}) {
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
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          autoComplete={autoComplete}
          required={required}
          className="border-0 bg-transparent p-0 text-sm text-black outline-none"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

// Splits a backend error payload (field -> [{message, code}]) into a
// per-field map plus a general/__all__ message. Same shape used by every
// other form in this app.
function splitErrors(errors) {
  const { __all__, ...perField } = errors
  const fieldErrors = {}
  for (const [field, issues] of Object.entries(perField)) {
    fieldErrors[field] = issues[0]?.message
  }
  return { fieldErrors, generalError: __all__?.[0]?.message ?? null }
}

// The page the emailed link actually points at. Handles steps 2 (email
// verification, automatic on mount), 3 (name/username), and 4 (password)
// all in one place, since once someone's clicked the link the rest of
// the flow is a normal continuous session again — no more device-hopping
// concerns past this point.
export function SignupVerify({ onSignupSuccess }) {
  const { token } = useParams()

  // 'loading' | 'invalid' | 'details' | 'password'
  const [status, setStatus] = useState('loading')
  const [values, setValues] = useState({
    firstName: '',
    lastName: '',
    username: '',
    password1: '',
    password2: '',
  })
  const [focusedField, setFocusedField] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [generalError, setGeneralError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    checkPendingSignup(token)
      .then((data) => {
        setValues((v) => ({
          ...v,
          firstName: data.first_name,
          lastName: data.last_name,
          username: data.username,
        }))
        // Resuming a signup that already finished step 3 (e.g. a page
        // refresh) skips straight to the password step instead of
        // asking for the name again.
        setStatus(data.first_name && data.last_name ? 'password' : 'details')
      })
      .catch(() => setStatus('invalid'))
  }, [token])

  const setValue = (field) => (e) =>
    setValues((v) => ({ ...v, [field]: e.target.value }))

  const focusHandlers = (field) => ({
    onFocus: () => setFocusedField(field),
    onBlur: () => setFocusedField((f) => (f === field ? null : f)),
  })

  async function handleDetailsSubmit(event) {
    event.preventDefault()
    setFieldErrors({})
    setGeneralError(null)
    setSubmitting(true)

    try {
      await submitSignupDetails(token, values)
      setStatus('password')
    } catch (err) {
      if (err.data?.errors) {
        const { fieldErrors, generalError } = splitErrors(err.data.errors)
        setFieldErrors(fieldErrors)
        setGeneralError(generalError)
      } else {
        setGeneralError('Something went wrong. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault()
    setFieldErrors({})
    setGeneralError(null)
    setSubmitting(true)

    try {
      const data = await completeSignup(token, values)
      onSignupSuccess(data)
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

  if (status === 'loading') {
    return (
      <Card className="w-full max-w-sm zoom-[1.125] border-transparent bg-[#f8f9fa] text-black shadow-2xl">
        <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
          <p className="text-sm text-black/70">Verifying your link…</p>
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
            This signup link is no longer valid. Start again below.
          </p>
          <Link to="/signup" className="text-sm font-semibold text-sky-600 hover:underline">
            Back to signup
          </Link>
        </CardContent>
      </Card>
    )
  }

  if (status === 'details') {
    return (
      <Card className="w-full max-w-sm zoom-[1.125] border-transparent bg-[#f8f9fa] text-black shadow-2xl">
        <CardContent className="flex flex-col gap-5 pt-6">
          <SignupProgress currentStep="details" />

          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold text-black">Tell us about you</h2>
            <p className="text-sm text-black/70">
              Email verified — just a couple more details.
            </p>
          </div>

          <form onSubmit={handleDetailsSubmit} className="flex flex-col gap-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <AuthField
                  id="firstName"
                  label="First name"
                  value={values.firstName}
                  onChange={setValue('firstName')}
                  focused={focusedField === 'firstName'}
                  error={fieldErrors.first_name}
                  autoComplete="given-name"
                  {...focusHandlers('firstName')}
                />
              </div>
              <div className="flex-1">
                <AuthField
                  id="lastName"
                  label="Last name"
                  value={values.lastName}
                  onChange={setValue('lastName')}
                  focused={focusedField === 'lastName'}
                  error={fieldErrors.last_name}
                  autoComplete="family-name"
                  {...focusHandlers('lastName')}
                />
              </div>
            </div>

            <AuthField
              id="username"
              label="Username (optional)"
              value={values.username}
              onChange={setValue('username')}
              focused={focusedField === 'username'}
              error={fieldErrors.username}
              autoComplete="username"
              required={false}
              {...focusHandlers('username')}
            />

            {generalError && <p className="text-xs text-destructive">{generalError}</p>}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full py-3 text-base font-semibold hover:bg-[#8ec5fc] hover:text-black"
            >
              {submitting ? 'Saving…' : 'Continue'}
            </Button>
          </form>
        </CardContent>
      </Card>
    )
  }

  // status === 'password'
  const greetingName = values.firstName || values.username || 'there'

  return (
    <Card className="w-full max-w-sm zoom-[1.125] border-transparent bg-[#f8f9fa] text-black shadow-2xl">
      <CardContent className="flex flex-col gap-5 pt-6">
        <SignupProgress currentStep="password" />

        <button
          type="button"
          onClick={() => setStatus('details')}
          className="flex w-fit items-center gap-1 text-sm font-semibold text-sky-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Edit username
        </button>

        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold text-black">Welcome, {greetingName}</h2>
          <p className="text-sm text-black/70">
            Please provide a password to finish creating your account.
          </p>
        </div>

        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
          <AuthField
            id="password1"
            label="Password"
            type="password"
            value={values.password1}
            onChange={setValue('password1')}
            focused={focusedField === 'password1'}
            error={fieldErrors.password1}
            autoComplete="new-password"
            {...focusHandlers('password1')}
          />

          <AuthField
            id="password2"
            label="Confirm password"
            type="password"
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
            {submitting ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
