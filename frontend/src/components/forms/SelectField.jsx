export default function SelectField({ label, options, error, className = '', ...props }) {
  return (
    <label className="block mb-4">
      {label && <span className="block text-sm font-medium text-ink-950 mb-1.5">{label}</span>}
      <select className={`public-input ${error ? 'border-critical' : ''} ${className}`} {...props}>
        <option value="">Select an option</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="block text-xs text-critical mt-1">{error}</span>}
    </label>
  )
}
