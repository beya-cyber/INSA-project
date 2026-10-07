import React, { useState } from 'react'
import { ShieldAlert, AlertOctagon, CheckCircle2, FileText, ArrowRight } from 'lucide-react'
import FreezeRequestModal from '../../components/common/FreezeRequestModal'

export default function ProposeActionPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeCase, setActiveCase] = useState({
    id: 'ETH-2026-9041',
    victimBank: 'CBE',
    suspectBank: 'Telebirr',
    suspectAccount: '0911****82',
    amount: 'ETB 145,000',
    severity: 'CRITICAL',
    status: 'UNASSIGNED',
  })

  const handleFreezeSuccess = ({ caseId, status }) => {
    setActiveCase((prev) => ({
      ...prev,
      status: status,
    }))
  }

  return (
    <div className="p-6 space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-console-border pb-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-brand uppercase tracking-widest">
            <ShieldAlert className="h-3.5 w-3.5 text-status-danger" />
            <span>Intervention Terminal // Account Hold Protocol</span>
          </div>
          <h1 className="heading text-xl font-bold text-fg-primary">PROPOSE & EXECUTE ACTION</h1>
        </div>
      </div>

      {/* Case Telemetry Overview Card */}
      <div className="console-panel p-5 border-console-border bg-console-surface/90 space-y-4 font-mono text-xs">
        <div className="flex justify-between items-center border-b border-console-border pb-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-fg-primary text-sm">TARGET CASE: #{activeCase.id}</span>
          </div>
          <span className="text-status-danger bg-status-danger/20 px-2 py-0.5 rounded font-bold">
            SEVERITY: {activeCase.severity}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-fg-primary py-2">
          <div className="p-2.5 bg-console-bg rounded border border-console-border">
            <span className="text-fg-faint text-[10px] block">ORIGIN BANK</span>
            <p className="font-bold mt-1">{activeCase.victimBank}</p>
          </div>
          <div className="p-2.5 bg-console-bg rounded border border-console-border">
            <span className="text-fg-faint text-[10px] block">TARGET BANK</span>
            <p className="font-bold text-brand mt-1">{activeCase.suspectBank}</p>
          </div>
          <div className="p-2.5 bg-console-bg rounded border border-console-border">
            <span className="text-fg-faint text-[10px] block">SUSPECT ACCOUNT / WALLET</span>
            <p className="font-bold text-status-danger mt-1">{activeCase.suspectAccount}</p>
          </div>
          <div className="p-2.5 bg-console-bg rounded border border-console-border">
            <span className="text-fg-faint text-[10px] block">REPORTED LOSS AMOUNT</span>
            <p className="font-bold mt-1">{activeCase.amount}</p>
          </div>
        </div>

        {/* Action Trigger Row */}
        <div className="pt-4 border-t border-console-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-fg-faint">CURRENT PROTOCOL STATUS:</span>
            {activeCase.status === 'FREEZE_ORDER_SENT' ? (
              <span className="bg-status-success/20 text-status-success px-2 py-1 rounded font-bold flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> FREEZE DIRECTIVE DISPATCHED
              </span>
            ) : (
              <span className="bg-status-warning/20 text-status-warning px-2 py-1 rounded font-bold">
                {activeCase.status}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setIsModalOpen(true)}
              disabled={activeCase.status === 'FREEZE_ORDER_SENT'}
              className={`w-full sm:w-auto py-2 px-4 rounded font-bold text-xs flex items-center justify-center gap-2 transition-colors ${activeCase.status === 'FREEZE_ORDER_SENT'
                ? 'bg-console-bg text-fg-faint border border-console-border cursor-not-allowed'
                : 'bg-status-danger text-white hover:bg-status-danger/90'
                }`}
            >
              <AlertOctagon className="h-4 w-4" />
              {activeCase.status === 'FREEZE_ORDER_SENT'
                ? 'FREEZE DISPATCHED'
                : 'TRIGGER INTER-BANK FREEZE'}
            </button>
          </div>
        </div>
      </div>

      {/* Freeze Request Modal Component */}
      <FreezeRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        caseData={activeCase}
        onSubmitSuccess={handleFreezeSuccess}
      />
    </div>
  )
}