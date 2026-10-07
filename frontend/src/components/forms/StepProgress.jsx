export default function StepProgress({ steps, currentStep }) {
  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-2">
        {steps.map((label, i) => {
          const stepNum = i + 1
          const active = stepNum === currentStep
          const done = stepNum < currentStep
          return (
            <span
              key={label}
              className={`text-xs font-medium ${active ? 'text-ink-950' : done ? 'text-signal-dark' : 'text-fog-500'}`}
            >
              {label}
            </span>
          )
        })}
      </div>
      <div className="h-1.5 w-full rounded-full bg-mist-300 overflow-hidden flex gap-0.5">
        {steps.map((label, i) => (
          <div
            key={label}
            className={`h-full flex-1 rounded-full transition-colors ${
              i + 1 <= currentStep ? 'bg-signal' : 'bg-mist-300'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
