import { apiFetch } from './api'

export function checkAuth() {
  return apiFetch('/user/api/auth/')
}

export function login(username, password) {
  return apiFetch('/user/api/login/', {
    method: 'POST',
    body: { username, password },
  })
}

export function logout() {
  return apiFetch('/user/api/logout/', { method: 'POST' })
}

// --- Multi-step signup flow ---

export function startSignup(email) {
  return apiFetch('/user/api/signup/start/', {
    method: 'POST',
    body: { email },
  })
}

export function checkPendingSignup(token) {
  return apiFetch(`/user/api/signup/pending/${token}/`)
}

export function submitSignupDetails(token, { firstName, lastName, username }) {
  return apiFetch(`/user/api/signup/pending/${token}/`, {
    method: 'PATCH',
    body: {
      first_name: firstName,
      last_name: lastName,
      username,
    },
  })
}

export function completeSignup(token, { password1, password2 }) {
  return apiFetch(`/user/api/signup/complete/${token}/`, {
    method: 'POST',
    body: { password1, password2 },
  })
}

export function checkEmailExists(email) {
  return apiFetch(`/user/api/email-exists/?email=${encodeURIComponent(email)}`)
}
