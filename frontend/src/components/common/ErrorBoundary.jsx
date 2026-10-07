import { Component } from 'react'
import { ShieldAlert } from 'lucide-react'

/**
 * Catches any uncaught render/lifecycle error in the component tree
 * below it and shows a calm, actionable recovery screen instead of a
 * blank white page. This matters a great deal here specifically: the
 * person on the other end of a crashed page might be actively trying
 * to report a scam in progress or track money before it moves again.
 * A silent white screen with no recovery path is unacceptable for
 * that use case, so this is wrapped around the entire app in main.jsx.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // In production this is exactly where a call to Sentry/error-tracking
    // would go. Logged here so the failure is at least visible in the
    // browser console and in server logs if this is ever piped through
    // a logging endpoint.
    console.error('NDSIR UI crashed:', error, errorInfo)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-mist-100 px-6">
          <div className="max-w-sm text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-critical-50 mx-auto mb-5">
              <ShieldAlert className="h-6 w-6 text-critical" />
            </span>
            <h1 className="text-lg font-semibold text-ink-950">Something went wrong</h1>
            <p className="text-sm text-fog-500 mt-2 leading-relaxed">
              This page hit an unexpected error. Your report, if you already submitted one, is safe -
              this only affects what's currently on screen. If you were in the middle of reporting a scam,
              please try again below.
            </p>
            <button onClick={this.handleReload} className="btn-primary mt-6 w-full">
              Return to the homepage
            </button>
            <p className="text-xs text-fog-500 mt-4">
              If this keeps happening, please call INSA directly to report your case by phone.
            </p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
