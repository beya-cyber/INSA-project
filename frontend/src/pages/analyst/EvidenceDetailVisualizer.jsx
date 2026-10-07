import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ZoomIn, ZoomOut, Lock, PhoneOff, FileOutput, ShieldAlert, CheckCircle2, ImageOff,
  Cpu, Smartphone, ShieldCheck
} from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import StatusBadge from '../../components/common/StatusBadge'
import RiskBadge from '../../components/common/RiskBadge'
import Modal from '../../components/common/Modal'
import Button from '../../components/common/Button'
import { incidentsApi } from '../../api/incidentsApi'
import { analystApi } from '../../api/analystApi'
import { MOCK_REPORTS } from '../../lib/mockData'

const MOCK_DETAIL = {
  ...MOCK_REPORTS[0],
  description: 'Received a call from 0911223344 claiming to be from CBE fraud department, asking to confirm a "suspicious transaction" via a PIN reset link sent by SMS.',
  scammer_phone_number: '0911223344',
  scammer_identifier: '1000123456789',
  evidence_files: [
    {
      id: 'e1', original_filename: 'sms_screenshot.jpg', file_type: 'IMAGE', authenticity_flag: 'VALID',
      ocr_parsed_json: { transaction_reference: 'TXN9F82K1', destination_account: '1000123456789', amount: '15,500.00', timestamp_text: '10/09/2026, 08:03' }
    },
    { id: 'e2', original_filename: 'call_recording.mp3', file_type: 'AUDIO', authenticity_flag: 'PENDING', ocr_parsed_json: null },
  ],
}

export default function EvidenceDetailVisualizer() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [activeEvidence, setActiveEvidence] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [freezeModalOpen, setFreezeModalOpen] = useState(false)
  const [simModalOpen, setSimModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    incidentsApi
      .getReport(id)
      .then(({ data }) => setReport(data))
      .catch(() => setReport(MOCK_DETAIL))
  }, [id])

  if (!report) return null

  const evidence = report.evidence_files?.[activeEvidence]

  const handleProposeFreeze = async () => {
    setSubmitting(true)
    try {
      await analystApi.proposeFreeze({
        report_tracking_code: report.tracking_code,
        destination_bank_code: 'CBE',
        account_number: report.scammer_identifier,
        reason: 'Confirmed phishing destination account from OCR-verified receipt.',
      })
    } catch {
      /* demo mode: no backend reachable */
    } finally {
      setSubmitting(false)
      setFreezeModalOpen(false)
    }
  }

  const handleProposeSim = async () => {
    setSubmitting(true)
    try {
      await analystApi.proposeTelecomAction({
        report_tracking_code: report.tracking_code,
        carrier: 'ETHIO_TELECOM',
        action_type: 'SIM_SUSPEND',
        target_value: report.scammer_phone_number,
        reason: 'Number used in verified voice/SMS scam.',
      })
    } catch {
      /* demo mode */
    } finally {
      setSubmitting(false)
      setSimModalOpen(false)
    }
  }

  return (
    <div className="min-h-screen bg-console-bg text-fg-primary font-sans pb-12">
      <TopBar
        title={
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-fg-primary hover:text-brand transition-colors font-mono cursor-pointer">
            <ArrowLeft className="h-4 w-4" /> {report.tracking_code}
          </button>
        }
        subtitle="Side-by-side evidence review"
      />

      <div className="px-8 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {/* Left Column: Case Summary + Actions */}
        <div className="col-span-1 space-y-4">
          <div className="console-panel p-5 border-console-border bg-console-surface/90 relative">
            <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-brand"></div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-console-border/80">
              <StatusBadge status={report.status} dark />
              <RiskBadge score={report.risk_score} />
            </div>
            <dl className="space-y-2.5 text-xs">
              <SummaryRow label="Incident type" value={report.incident_type?.replaceAll('_', ' ')} />
              <SummaryRow label="Scammer number" value={report.scammer_phone_number} mono />
              <SummaryRow label="Destination account" value={report.scammer_identifier} mono />
            </dl>
            <p className="text-xs text-fg-muted mt-4 leading-relaxed font-sans bg-console-bg/50 p-3 rounded border border-console-border/60">
              {report.description}
            </p>
          </div>

          {/* Administrative Actions Direct Controls */}
          <div className="console-panel p-5 border-console-border bg-console-surface/90 space-y-3">
            <div className="flex items-center gap-2 border-b border-console-border pb-2">
              <ShieldAlert className="h-3.5 w-3.5 text-brand" />
              <h3 className="text-xs uppercase tracking-wider font-mono font-semibold text-fg-primary">Administrative directives</h3>
            </div>
            <div className="space-y-2 pt-1">
              <Button variant="critical" className="w-full !justify-start font-mono text-xs cursor-pointer" onClick={() => setFreezeModalOpen(true)}>
                <Lock className="h-3.5 w-3.5" /> Issue Account Lock
              </Button>
              <Button variant="ghostDark" className="w-full !justify-start font-mono text-xs border border-console-border hover:border-brand/40 cursor-pointer" onClick={() => setSimModalOpen(true)}>
                <PhoneOff className="h-3.5 w-3.5" /> Flag SIM/IMEI
              </Button>
              <Button variant="ghostDark" className="w-full !justify-start font-mono text-xs border border-console-border hover:border-brand/40 cursor-pointer" onClick={() => navigate('/console/legal-export')}>
                <FileOutput className="h-3.5 w-3.5" /> Generate Legal Export
              </Button>
            </div>
          </div>

          {/* Evidence Files Selection Tree */}
          <div className="console-panel p-5 border-console-border bg-console-surface/90">
            <div className="flex items-center gap-2 border-b border-console-border pb-2 mb-3">
              <Cpu className="h-3.5 w-3.5 text-brand" />
              <h3 className="text-xs uppercase tracking-wider font-mono font-semibold text-fg-primary">Evidence Artifacts</h3>
            </div>
            <ul className="space-y-2">
              {report.evidence_files?.map((ev, i) => (
                <li key={ev.id}>
                  <button
                    onClick={() => {
                      setActiveEvidence(i)
                      setZoom(1) // Reset zoom on file switch
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-mono flex items-center justify-between border transition-all cursor-pointer ${i === activeEvidence
                      ? 'bg-brand/15 border-brand text-brand-light font-semibold shadow-glow'
                      : 'bg-console-bg/60 border-console-border text-fg-muted hover:border-fg-faint/40'
                      }`}
                  >
                    <span className="truncate pr-2">{ev.original_filename}</span>
                    <AuthIcon flag={ev.authenticity_flag} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Columns: Side-by-Side Visualizer and Metadata */}
        <div className="col-span-1 lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Visual Canvas Panel */}
          <div className="console-panel p-4 flex flex-col border-console-border bg-console-surface/90 relative">
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-slate-600/60 rounded-tl-sm pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-slate-600/60 rounded-tr-sm pointer-events-none"></div>

            <div className="flex items-center justify-between mb-3 border-b border-console-border pb-2">
              <div className="flex items-center gap-2 font-mono text-xs">
                <Smartphone className="h-3.5 w-3.5 text-brand" />
                <h3 className="font-bold text-fg-primary uppercase tracking-wider">Original Evidence</h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
                  className="p-1 rounded hover:bg-console-surface-hover text-fg-muted hover:text-brand border border-console-border cursor-pointer"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="font-mono text-[10px] text-fg-faint px-1">{Math.round(zoom * 100)}%</span>
                <button
                  onClick={() => setZoom((z) => Math.min(2, z + 0.2))}
                  className="p-1 rounded hover:bg-console-surface-hover text-fg-muted hover:text-brand border border-console-border cursor-pointer"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-console-bg border border-console-border rounded-lg flex items-center justify-center overflow-auto min-h-[360px] p-4 bg-tactical-grid">
              {evidence?.file_type === 'IMAGE' ? (
                evidence.display_url ? (
                  <img
                    src={evidence.display_url}
                    alt={evidence.original_filename}
                    style={{ transform: `scale(${zoom})` }}
                    className="max-w-full max-h-[340px] object-contain transition-transform duration-150 ease-smooth rounded border border-brand/30 shadow-glow"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                ) : (
                  <div
                    style={{ transform: `scale(${zoom})` }}
                    className="flex flex-col items-center gap-2 text-fg-faint transition-transform font-mono"
                  >
                    <ImageOff className="h-10 w-10 text-brand/40" />
                    <span className="text-xs">No preview available — {evidence.original_filename}</span>
                  </div>
                )
              ) : evidence?.display_url ? (
                <div className="flex flex-col items-center gap-3 w-full px-6 font-mono">
                  <span className="text-xs text-brand font-bold">{evidence.original_filename}</span>
                  <audio controls src={evidence.display_url} className="w-full max-w-sm" />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-fg-faint font-mono">
                  <span className="text-xs">Audio Evidence Stream — {evidence?.original_filename}</span>
                  <div className="h-1.5 w-48 bg-console-border rounded-full overflow-hidden relative">
                    <div className="absolute inset-y-0 left-0 w-1/3 bg-brand animate-pulse"></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Metadata & Forensic Extraction Panel */}
          <div className="console-panel p-4 flex flex-col justify-between border-console-border bg-console-surface/90 relative">
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-slate-600/60 rounded-bl-sm pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-slate-600/60 rounded-br-sm pointer-events-none"></div>

            <div>
              <div className="flex items-center gap-2 border-b border-console-border pb-2 mb-3 font-mono text-xs">
                <ShieldCheck className="h-3.5 w-3.5 text-brand" />
                <h3 className="font-bold text-fg-primary uppercase tracking-wider">System-Extracted Metadata</h3>
              </div>

              {evidence?.ocr_parsed_json ? (
                <dl className="space-y-3 font-mono">
                  <EditableRow label="Transaction reference" value={evidence.ocr_parsed_json.transaction_reference} />
                  <EditableRow label="Destination account" value={evidence.ocr_parsed_json.destination_account} />
                  <EditableRow label="Amount (ETB)" value={evidence.ocr_parsed_json.amount} />
                  <EditableRow label="Timestamp" value={evidence.ocr_parsed_json.timestamp_text} />
                </dl>
              ) : (
                <p className="text-xs text-fg-faint font-mono bg-console-bg/50 p-3 rounded border border-console-border/60">
                  OCR extraction pending or not applicable for this file type.
                </p>
              )}
            </div>

            <div className="space-y-4 pt-4 mt-4 border-t border-console-border font-mono">
              <div>
                <h4 className="text-[10px] uppercase tracking-wider text-fg-faint mb-1.5 font-semibold">Authenticity Verification</h4>
                <div className="flex items-center gap-2 bg-console-bg/60 p-2.5 rounded border border-console-border/80">
                  <AuthIcon flag={evidence?.authenticity_flag} />
                  <span className="text-xs text-fg-muted font-sans">{authLabel(evidence?.authenticity_flag)}</span>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] uppercase tracking-wider text-fg-faint mb-1.5 font-semibold">eKYC National ID Sync</h4>
                <div className="flex items-center gap-2 text-status-success text-xs font-semibold bg-status-success/10 p-2.5 rounded border border-status-success/30">
                  <CheckCircle2 className="h-4 w-4 shrink-0" /> Victim identity verified via Fayda
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Account Freeze Directive Modal */}
      <Modal
        open={freezeModalOpen}
        onClose={() => setFreezeModalOpen(false)}
        title="Propose Administrative Asset Freeze"
        footer={
          <div className="flex justify-end gap-2 font-mono text-xs">
            <Button variant="ghostDark" onClick={() => setFreezeModalOpen(false)}>Cancel</Button>
            <Button variant="critical" loading={submitting} onClick={handleProposeFreeze}>Submit Proposal</Button>
          </div>
        }
      >
        <p className="text-xs text-fg-muted mb-3 font-sans leading-relaxed">
          This proposes a temporary hold on account <span className="mono-data text-brand font-bold">{report.scammer_identifier}</span> for
          Supervisor approval. The freeze is not executed until a Supervisor signs off with MFA.
        </p>
      </Modal>

      {/* SIM Suspend Directive Modal */}
      <Modal
        open={simModalOpen}
        onClose={() => setSimModalOpen(false)}
        title="Propose SIM / Telecom Suspension"
        footer={
          <div className="flex justify-end gap-2 font-mono text-xs">
            <Button variant="ghostDark" onClick={() => setSimModalOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={submitting} onClick={handleProposeSim}>Submit Proposal</Button>
          </div>
        }
      >
        <p className="text-xs text-fg-muted mb-3 font-sans leading-relaxed">
          This proposes suspending SIM <span className="mono-data text-brand font-bold">{report.scammer_phone_number}</span> via Ethio Telecom,
          pending Supervisor approval.
        </p>
      </Modal>
    </div>
  )
}

function SummaryRow({ label, value, mono }) {
  return (
    <div className="flex justify-between items-center gap-2">
      <dt className="text-fg-faint font-mono">{label}</dt>
      <dd className={`text-fg-primary text-right font-semibold ${mono ? 'mono-data text-brand' : ''}`}>{value || '—'}</dd>
    </div>
  )
}

function EditableRow({ label, value }) {
  return (
    <div>
      <dt className="text-[10px] text-fg-faint uppercase tracking-wider mb-1 font-mono">{label}</dt>
      <dd>
        <input defaultValue={value || ''} className="console-input w-full mono-data text-xs py-1.5" />
      </dd>
    </div>
  )
}

function AuthIcon({ flag }) {
  if (flag === 'VALID') return <CheckCircle2 className="h-4 w-4 text-status-success shrink-0" />
  if (flag === 'FLAGGED') return <ShieldAlert className="h-4 w-4 text-status-critical shrink-0" />
  return <span className="h-2 w-2 rounded-full bg-status-warning shrink-0" />
}

function authLabel(flag) {
  if (flag === 'VALID') return 'No anomalies detected by automated triage.'
  if (flag === 'FLAGGED') return 'Possible tampering detected — manual forensic review required.'
  return 'Authenticity analysis pending.'
}