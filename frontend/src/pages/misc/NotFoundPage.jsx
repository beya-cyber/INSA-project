import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-mist-100">
      <Search className="h-10 w-10 text-fog-500 mb-4" />
      <h1 className="text-lg font-semibold text-ink-950">Page not found</h1>
      <p className="text-sm text-fog-500 mt-1">The page you're looking for doesn't exist or has moved.</p>
      <Link to="/" className="btn-primary mt-6">Return home</Link>
    </div>
  )
}
