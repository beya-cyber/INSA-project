import React, { createContext, useContext, useState, useEffect } from 'react'

const IncidentContext = createContext()

const INITIAL_INCIDENTS = [
  {
    id: 'ETH-2026-9041',
    timestamp: '00:41:10 UTC',
    source: 'CBE (0922****19)',
    destination: 'Telebirr (0911****55)',
    value: 145000,
    velocity: '3 hops / 45s',
    riskScore: 94,
    clearance: 'UNASSIGNED',
    status: 'ACTIVE',
  },
  {
    id: 'ETH-2026-9038',
    timestamp: '00:38:02 UTC',
    source: 'Dashen Bank (1000****42)',
    destination: 'BOA (1000****88)',
    value: 320000,
    velocity: '2 hops / 2m',
    riskScore: 88,
    clearance: 'IN_REVIEW',
    status: 'ACTIVE',
  },
  {
    id: 'ETH-2026-9012',
    timestamp: '00:15:30 UTC',
    source: 'Amohara Bank (0933****11)',
    destination: 'CBE (1000****99)',
    value: 500000,
    velocity: '4 hops / 12s',
    riskScore: 97,
    clearance: 'UNASSIGNED',
    status: 'ACTIVE',
  },
]

export function IncidentProvider({ children }) {
  const [incidents, setIncidents] = useState(INITIAL_INCIDENTS)
  const [activeHolds, setActiveHolds] = useState([])

  // Simulated Live Incident Stream (Polls every 15s)
  useEffect(() => {
    const interval = setInterval(() => {
      const newId = `ETH-2026-${Math.floor(1000 + Math.random() * 9000)}`
      const newIncident = {
        id: newId,
        timestamp: new Date().toISOString().substring(11, 19) + ' UTC',
        source: 'CBE (0911****' + Math.floor(10 + Math.random() * 90) + ')',
        destination: 'Telebirr (0922****' + Math.floor(10 + Math.random() * 90) + ')',
        value: Math.floor(50000 + Math.random() * 450000),
        velocity: `${Math.floor(2 + Math.random() * 4)} hops / ${Math.floor(10 + Math.random() * 50)}s`,
        riskScore: Math.floor(85 + Math.random() * 15),
        clearance: 'UNASSIGNED',
        status: 'ACTIVE',
      }
      setIncidents((prev) => [newIncident, ...prev.slice(0, 9)])
    }, 15000)

    return () => clearInterval(interval)
  }, [])

  const dispatchHold = (targetNode, caseId = 'ETH-2026-9041') => {
    const holdRecord = {
      holdId: `HOLD-${Date.now()}`,
      caseId,
      target: targetNode.label,
      accountNumber: targetNode.sub,
      timestamp: new Date().toLocaleString(),
      status: 'DISPATCHED_ETHSWITCH_LOCKED',
    }
    setActiveHolds((prev) => [holdRecord, ...prev])

    // Update incident status
    setIncidents((prev) =>
      prev.map((item) =>
        item.id === caseId ? { ...item, clearance: 'HOLD_ACTIVE' } : item
      )
    )
  }

  return (
    <IncidentContext.Provider value={{ incidents, activeHolds, dispatchHold }}>
      {children}
    </IncidentContext.Provider>
  )
}

export const useIncidents = () => useContext(IncidentContext)
