import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, ShieldAlert, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { ROLES } from '../../constants/roles'

// Mock incoming triage data
const INITIAL_CASES = [
    {
        id: 'ETH-2026-9041',
        timestamp: '2026-09-29 00:42:10',
        reporter: 'Citizen #8812',
        victimBank: 'CBE',
        suspectBank: 'Telebirr',
        suspectAccount: '0911****82',
        amount: 'ETB 145,000',
        severity: 'CRITICAL',
        status: 'UNASSIGNED',
        riskScore: 94,
    },
    {
        id: 'ETH-2026-9038',
        timestamp: '2026-09-29 00:15:33',
        reporter: 'Citizen #7420',
        victimBank: 'Awash Bank',
        suspectBank: 'CBE',
        suspectAccount: '1000****4921',
        amount: 'ETB 82,500',
        severity: 'HIGH',
        status: 'IN_ANALYSIS',
        riskScore: 78,
    },
    {
        id: 'ETH-2026-9035',
        timestamp: '2026-09-28 23:50:02',
        reporter: 'Citizen #9102',
        victimBank: 'Bank of Abyssinia',
        suspectBank: 'Telebirr',
        suspectAccount: '0922****19',
        amount: 'ETB 22,000',
        severity: 'MEDIUM',
        status: 'IN_ANALYSIS',
        riskScore: 52,
    },
    {
        id: 'ETH-2026-9029',
        timestamp: '2026-09-28 22:11:45',
        reporter: 'Citizen #6119',
        victimBank: 'Dashen Bank',
        suspectBank: 'Coop Bank',
        suspectAccount: '1092****3811',
        amount: 'ETB 500,000',
        severity: 'CRITICAL',
        status: 'FREEZE_ORDER_SENT',
        riskScore: 98,
    },
]

export default function CaseTriageTable({ onSelectCase, onSelectionChange }) {
    const { user } = useAuth()
    const [cases, setCases] = useState(INITIAL_CASES)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCaseId, setSelectedCaseId] = useState(null)
    const [filterSeverity, setFilterSeverity] = useState('ALL')

    // NEW: Bulk selection state
    const [selectedRowIds, setSelectedRowIds] = useState([])

    // Clearance Check
    const isSupervisor = user?.role === ROLES.INSA_SUPERVISOR || user?.role === 'INSA Operations Supervisor'
    const isAnalyst = user?.role === ROLES.INSA_ANALYST || user?.role === 'INSA Forensic Analyst' || isSupervisor

    // Filtered dataset
    const filteredCases = cases.filter((item) => {
        const matchesSearch =
            item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.suspectAccount.includes(searchQuery) ||
            item.victimBank.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.suspectBank.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesSeverity = filterSeverity === 'ALL' || item.severity === filterSeverity

        return matchesSearch && matchesSeverity
    })

    // Handle master select-all toggle
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const allIds = filteredCases.map(c => c.id)
            setSelectedRowIds(allIds)
            if (onSelectionChange) onSelectionChange(allIds)
        } else {
            setSelectedRowIds([])
            if (onSelectionChange) onSelectionChange([])
        }
    }

    // Handle individual row checkbox toggle
    const handleToggleRow = (id, e) => {
        e.stopPropagation() // Prevent row click trigger
        setSelectedRowIds(prev => {
            const updated = prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
            if (onSelectionChange) onSelectionChange(updated)
            return updated
        })
    }

    const handleRowClick = (caseItem) => {
        setSelectedCaseId(caseItem.id)
        if (onSelectCase) onSelectCase(caseItem)
    }

    const getSeverityBadge = (severity) => {
        switch (severity) {
            case 'CRITICAL':
                return 'pill-danger'
            case 'HIGH':
                return 'pill-warning'
            case 'MEDIUM':
                return 'pill-brand'
            default:
                return 'pill-neutral'
        }
    }

    return (
        <div className="console-panel p-4 space-y-4 font-sans">
            {/* HEADER & CONTROLS TOOLBAR */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-console-border pb-3">
                <div>
                    <div className="flex items-center gap-2 font-mono text-[11px] text-brand uppercase tracking-widest">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse"></span>
                        Triage Queue {selectedRowIds.length > 0 && `(${selectedRowIds.length} Selected)`}
                    </div>
                    <h2 className="heading text-lg font-bold text-fg-primary">ACTIVE INCIDENT FEED</h2>
                </div>

                {/* SEARCH & FILTERS */}
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search Case ID, Bank, Node..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="console-input w-full sm:w-64 text-xs font-mono pl-8"
                        />
                        <Search className="h-3.5 w-3.5 absolute left-2.5 top-3 text-fg-faint" />
                    </div>

                    <select
                        value={filterSeverity}
                        onChange={(e) => setFilterSeverity(e.target.value)}
                        className="console-input text-xs font-mono py-2"
                    >
                        <option value="ALL">ALL SEVERITIES</option>
                        <option value="CRITICAL">CRITICAL ONLY</option>
                        <option value="HIGH">HIGH SEVERITY</option>
                        <option value="MEDIUM">MEDIUM SEVERITY</option>
                    </select>
                </div>
            </div>

            {/* TACTICAL HIGH-DENSITY TABLE */}
            <div className="overflow-x-auto rounded-lg border border-console-border">
                <table className="w-full console-table text-left border-collapse">
                    <thead>
                        <tr>
                            <th className="w-10 text-center">
                                <input
                                    type="checkbox"
                                    onChange={handleSelectAll}
                                    checked={filteredCases.length > 0 && selectedRowIds.length === filteredCases.length}
                                    className="rounded bg-console-bg border-console-border text-brand focus:ring-0 cursor-pointer"
                                />
                            </th>
                            <th>CASE IDENTIFIER</th>
                            <th>TIMESTAMP (UTC)</th>
                            <th>VICTIM BANK</th>
                            <th>SUSPECT NODE</th>
                            <th>LOSS VALUE</th>
                            <th>RISK INDEX</th>
                            <th>SEVERITY</th>
                            <th>STATUS</th>
                            <th className="text-right">ACTION</th>
                        </tr>
                    </thead>
                    <tbody>
                        <AnimatePresence>
                            {filteredCases.map((item) => {
                                const isSelected = selectedCaseId === item.id
                                const isRowChecked = selectedRowIds.includes(item.id)
                                return (
                                    <motion.tr
                                        key={item.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        onClick={() => handleRowClick(item)}
                                        className={`cursor-pointer transition-colors ${isSelected ? 'bg-brand/15 border-l-2 border-l-brand' : 'hover:bg-console-surface/50'}`}
                                    >
                                        {/* Checkbox Column */}
                                        <td className="text-center" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={isRowChecked}
                                                onChange={(e) => handleToggleRow(item.id, e)}
                                                className="rounded bg-console-bg border-console-border text-brand focus:ring-0 cursor-pointer"
                                            />
                                        </td>

                                        {/* Case ID */}
                                        <td className="font-mono font-bold text-fg-primary flex items-center gap-1.5">
                                            <span className="text-brand">#</span>
                                            {item.id}
                                        </td>

                                        {/* Timestamp */}
                                        <td className="font-mono text-xs text-fg-faint">{item.timestamp}</td>

                                        {/* Victim Bank */}
                                        <td className="font-semibold text-fg-muted">{item.victimBank}</td>

                                        {/* Suspect Bank & Account */}
                                        <td>
                                            <div className="flex items-center gap-1.5 font-mono text-xs">
                                                <span className="text-status-warning font-semibold">{item.suspectBank}</span>
                                                <span className="text-fg-faint">({item.suspectAccount})</span>
                                            </div>
                                        </td>

                                        {/* Amount */}
                                        <td className="font-mono font-bold text-fg-primary">{item.amount}</td>

                                        {/* Risk Index Meter */}
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <div className="w-12 bg-console-bg h-1.5 rounded-full overflow-hidden border border-console-border">
                                                    <div
                                                        className={`h-full ${item.riskScore > 90
                                                            ? 'bg-status-danger'
                                                            : item.riskScore > 70
                                                                ? 'bg-status-warning'
                                                                : 'bg-brand'
                                                            }`}
                                                        style={{ width: `${item.riskScore}%` }}
                                                    />
                                                </div>
                                                <span className="font-mono text-xs text-fg-muted">{item.riskScore}</span>
                                            </div>
                                        </td>

                                        {/* Severity */}
                                        <td>
                                            <span className={getSeverityBadge(item.severity)}>
                                                <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                                                {item.severity}
                                            </span>
                                        </td>

                                        {/* Status */}
                                        <td className="font-mono text-xs text-fg-faint">{item.status}</td>

                                        {/* Action Button */}
                                        <td className="text-right" onClick={(e) => e.stopPropagation()}>
                                            {isAnalyst ? (
                                                <button
                                                    onClick={() => handleRowClick(item)}
                                                    className="btn-ghost-dark py-1 px-2.5 text-xs font-mono"
                                                >
                                                    INVESTIGATE
                                                </button>
                                            ) : (
                                                <span className="text-[10px] font-mono text-fg-faint">READ ONLY</span>
                                            )}
                                        </td>
                                    </motion.tr>
                                )
                            })}
                        </AnimatePresence>
                    </tbody>
                </table>

                {filteredCases.length === 0 && (
                    <div className="p-8 text-center font-mono text-xs text-fg-faint">
                        NO INCIDENT TELEMETRY MATCHES CURRENT FILTER CRITERIA.
                    </div>
                )}
            </div>

            {/* FOOTER STATS */}
            <div className="flex justify-between items-center font-mono text-[11px] text-fg-faint pt-2">
                <span>
                    DISPLAYING {filteredCases.length} OF {cases.length} QUEUED INCIDENTS
                </span>
                <span className="text-brand">REALTIME INGESTION ACTIVE</span>
            </div>
        </div>
    )
}