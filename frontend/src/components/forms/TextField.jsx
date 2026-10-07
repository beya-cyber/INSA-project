export default function TextField({ label, error, hint, className = '', ...props }) {
  return (
    <label className="block mb-4">
      {label && <span className="block text-sm font-medium text-ink-950 mb-1.5">{label}</span>}
      <input className={`public-input ${error ? 'border-critical' : ''} ${className}`} {...props} />
      {hint && !error && <span className="block text-xs text-fog-500 mt-1">{hint}</span>}
      {error && <span className="block text-xs text-critical mt-1">{error}</span>}
    </label>
  )
}
