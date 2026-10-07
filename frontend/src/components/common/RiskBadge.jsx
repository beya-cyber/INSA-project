import { riskBand } from '../../lib/constants'

const TONE_BAR = {
  verified: 'bg-status-success',
  amber: 'bg-status-warning',
  critical: 'bg-status-danger',
}
const TONE_TEXT = {
  verified: 'text-status-success',
  amber: 'text-status-warning',
  critical: 'text-status-danger',
}

export default function RiskBadge({ score }) {
  const band = riskBand(score)
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="h-1.5 w-14 rounded-full bg-console-border overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${TONE_BAR[band.tone]}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`font-mono text-xs font-medium ${TONE_TEXT[band.tone]}`}>
        {score} · {band.label}
      </span>
    </div>
  )
}
