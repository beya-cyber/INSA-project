import React, { useState } from 'react'
import { Network, ShieldAlert, Zap, RefreshCw, AlertCircle } from 'lucide-react'
import FreezeRequestModal from '../../components/common/FreezeRequestModal'

export default function ScamLinkageGraphPage() {
  const [selectedNode, setSelectedNode] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Target mule nodes dataset with relative percentage coordinates for responsive layout
  const nodes = [
    { id: 'node-1', label: 'CBE Source Acct', sub: '1000****88', cx: 15, cy: 50, risk: 'LOW', type: 'source' },
    { id: 'node-2', label: 'Primary Mule Hub', sub: '0922****19', cx: 45, cy: 50, risk: 'CRITICAL', type: 'hub', riskScore: 94 },
    { id: 'node-3', label: 'Layer 2 Layering', sub: '1000****42', cx: 80, cy: 25, risk: 'HIGH', type: 'mule', riskScore: 88 },
    { id: 'node-4', label: 'Telebirr Cashout', sub: '0911****55', cx: 80, cy: 75, risk: 'CRITICAL', type: 'mule', riskScore: 96 },
  ]

  const links = [
    { from: nodes[0], to: nodes[1], label: 'ETB 145,000' },
    { from: nodes[1], to: nodes[2], label: 'ETB 80,000' },
    { from: nodes[1], to: nodes[3], label: 'ETB 65,000' },
  ]

  return (
    <div className="p-6 space-y-6 font-mono bg-[#030712] text-slate-100 min-h-screen">
      {/* Top Header */}
      <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest flex items-center gap-2">
            <Network className="h-3.5 w-3.5" />
            <span>INSA // GRAPH INTELLIGENCE ENGINE</span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">SCAM LINKAGE & MONEY LAUNDERING GRAPH</h1>
        </div>

        <button
          onClick={() => setSelectedNode(null)}
          className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 px-3 py-1.5 rounded text-xs flex items-center gap-1.5 transition-colors self-start md:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Reset Selection</span>
        </button>
      </div>

      {/* Main Graph Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Responsive Canvas Panel */}
        <div className="lg:col-span-3 cyber-card p-4 relative min-h-[500px] flex flex-col bg-[#080d1a] border-slate-800 overflow-hidden">
          
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-slate-900/90 border border-cyan-500/40 px-3 py-1 rounded text-xs">
            <span className="text-[10px] text-cyan-400 font-bold tracking-wider">CASE: ETH-2026-9041</span>
          </div>

          <div className="flex-1 w-full h-full relative min-h-[440px] flex items-center justify-center pt-8">
            <svg className="w-full h-full absolute inset-0 pointer-events-none" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid meet">
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="22"
                  refY="5"
                  markerWidth="8"
                  markerHeight="8"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#06b6d4" />
                </marker>
              </defs>

              {/* Render High-Contrast Connection Lines */}
              {links.map((link, idx) => {
                const x1 = link.from.cx * 10
                const y1 = link.from.cy * 5
                const x2 = link.to.cx * 10
                const y2 = link.to.cy * 5
                return (
                  <g key={idx}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#06b6d4"
                      strokeWidth="2.5"
                      markerEnd="url(#arrow)"
                      strokeDasharray="6 6"
                      className="animated-link opacity-90"
                    />
                    <rect
                      x={(x1 + x2) / 2 - 45}
                      y={(y1 + y2) / 2 - 14}
                      width="90"
                      height="20"
                      fill="#0f172a"
                      rx="4"
                      stroke="#1e293b"
                    />
                    <text
                      x={(x1 + x2) / 2}
                      y={(y1 + y2) / 2}
                      fill="#38bdf8"
                      fontSize="11"
                      fontWeight="bold"
                      fontFamily="monospace"
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {link.label}
                    </text>
                  </g>
                )
              })}
            </svg>

            {/* Interactive Graph Nodes */}
            {nodes.map((node) => {
              const isSelected = selectedNode?.id === node.id
              const isCritical = node.risk === 'CRITICAL'

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  style={{ left: `${node.cx}%`, top: `${node.cy}%`, transform: 'translate(-50%, -50%)' }}
                  className={`absolute cursor-pointer p-3.5 rounded-xl border-2 transition-all duration-200 z-20 w-44 shadow-2xl ${
                    isSelected
                      ? 'bg-slate-900 border-cyan-400 ring-4 ring-cyan-500/50 shadow-cyan-500/20 scale-105'
                      : isCritical
                      ? 'bg-[#1a0c10] border-red-500 hover:border-red-400 glow-danger'
                      : 'bg-[#0f172a] border-slate-700 hover:border-cyan-400'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5">
                    <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider">{node.type}</span>
                    {isCritical && (
                      <span className="flex items-center gap-1 text-[9px] font-bold text-red-400 bg-red-950 px-1.5 py-0.5 rounded border border-red-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                        CRITICAL
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-xs text-white truncate">{node.label}</div>
                  <div className="text-[11px] text-slate-400 font-mono tracking-wide">{node.sub}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Inspector Side Panel */}
        <div className="cyber-card p-5 space-y-5">
          <h2 className="text-xs font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-2">
            <Zap className="h-4 w-4 text-cyan-400" />
            <span>INSPECTOR PANEL</span>
          </h2>

          {selectedNode ? (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">TARGET NODE</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedNode.risk === 'CRITICAL'
                        ? 'bg-red-950 text-red-400 border border-red-800'
                        : 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                    }`}
                  >
                    {selectedNode.risk} RISK
                  </span>
                </div>
                <div className="font-bold text-white text-sm">{selectedNode.label}</div>
                <div className="text-cyan-400 font-mono font-bold text-xs">{selectedNode.sub}</div>
              </div>

              {selectedNode.riskScore && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">ML Threat Rating</span>
                    <span className="font-bold text-red-400">{selectedNode.riskScore} / 100</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="bg-red-500 h-full transition-all duration-500"
                      style={{ width: `${selectedNode.riskScore}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg text-xs tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-950/60"
              >
                <ShieldAlert className="h-4 w-4" />
                <span>DISPATCH HOLD DIRECTIVE</span>
              </button>
            </div>
          ) : (
            <div className="py-16 text-center text-slate-500 space-y-3 text-xs">
              <AlertCircle className="h-8 w-8 mx-auto text-slate-600 animate-pulse" />
              <p className="px-4 leading-relaxed">
                Click any node on the canvas to inspect real-time transaction flows and dispatch hold directives.
              </p>
            </div>
          )}
        </div>

      </div>

      <FreezeRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        targetNode={selectedNode}
      />
    </div>
  )
}
