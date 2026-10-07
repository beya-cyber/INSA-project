import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ShieldCheck, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react'
import Button from '../../components/common/Button'
import { authApi } from '../../api/authApi'

/**
 * Handles both halves of the staff/partner password reset flow on one
 * route: with no ?token= present, shows the "request a reset link"
 * form; with a token present (the person arrived via the emailed
 * link), shows the "set a new password" form instead.
 */
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  return (
    <div className="console-shell flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 ring-1 ring-brand/25 mb-4">
            <KeyRound className="h-5 w-5 text-brand-light" />
          </span>
          <h1 className="text-fg-primary heading font-semibold text-lg">
            {token ? 'Set a new password' : 'Reset your password'}
          </h1>
          <p className="text-fg-muted text-sm mt-1 text-center">
            {token
              ? 'Choose a new password for your NDSIR account.'
              : "Enter your username or email and we'll send a reset link."}
          </p>
        </div>

        {token ? <ConfirmForm token={token} /> : <RequestForm />}

        <p className="text-center mt-5">
          <Link to="/login" className="text-sm text-fg-muted hover:text-brand-light">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

function RequestForm() {
  const [identifier, setIdentifier] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.requestPasswordReset(identifier)
      // The backend always returns this same generic message regardless
      // of whether the identifier matched an account, by design (avoids
      // leaking which usernames/emails exist) - the frontend mirrors
      // that rather than inferring anything from the response.
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again in a moment.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="console-panel p-6 text-center">
        <CheckCircle2 className="h-8 w-8 text-status-success mx-auto mb-3" />
        <p className="text-sm text-fg-primary">
          If an account matches that username or email, a reset link has been sent.
        </p>
        <p className="text-xs text-fg-faint mt-2">The link expires in 30 minutes.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="console-panel p-6">
      <label className="block mb-5">
        <span className="block text-sm font-medium text-fg-primary mb-1.5">Username or email</span>
        <input
          className="console-input w-full"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          autoFocus
          required
        />
      </label>
      {error && (
        <div className="flex items-center gap-2 text-status-danger text-sm mb-4">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}
      <Button type="submit" variant="primary" className="w-full" loading={loading}>
        Send reset link
      </Button>
    </form>
  )
}

function ConfirmForm({ token }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 12) {
      setError('Password must be at least 12 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await authApi.confirmPasswordReset(token, password)
      setDone(true)
    } catch (err) {
      setError(err.response?.data?.error?.detail?.detail || 'This reset link is invalid or has expired.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="console-panel p-6 text-center">
        <CheckCircle2 className="h-8 w-8 text-status-success mx-auto mb-3" />
        <p className="text-sm text-fg-primary mb-4">Your password has been updated.</p>
        <Link to="/login" className="btn-primary w-full inline-flex">
          <ShieldCheck className="h-4 w-4" /> Sign in
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="console-panel p-6">
      <label className="block mb-4">
        <span className="block text-sm font-medium text-fg-primary mb-1.5">New password</span>
        <input
          type="password"
          className="console-input w-full"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          required
        />
      </label>
      <label className="block mb-5">
        <span className="block text-sm font-medium text-fg-primary mb-1.5">Confirm new password</span>
        <input
          type="password"
          className="console-input w-full"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </label>
      {error && (
        <div className="flex items-center gap-2 text-status-danger text-sm mb-4">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}
      <Button type="submit" variant="primary" className="w-full" loading={loading}>
        Update password
      </Button>
    </form>
  )
}
