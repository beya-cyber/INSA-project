import React, { createContext, useContext, useState } from 'react'

const AuditLogContext = createContext()

export function AuditLogProvider({ children }) {
  const [logs, setLogs] = useState([
    {
      id: 'AUD-9021',
      timestamp: '2026-09-29 08:14:02 EAT',
      operator: 'Operator 042 (INSA Ethio-CERT)',
      action: 'INSPECT_GRAPH_NODE',
      target: 'Telebirr Cashout (0911****55)',
      hash: '9a8f3b...e12',
    },
    {
      id: 'AUD-9020',
      timestamp: '2026-09-29 08:10:15 EAT',
      operator: 'Lead Officer (EthSwitch Directives)',
      action: 'DISPATCH_INTERBANK_HOLD',
      target: 'CBE Source Acct (0922****19)',
      hash: '4c7d1e...b90',
    },
  ])

  const logAction = (action, target, operatorName = 'Operator 042') => {
    const newLog = {
      id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toLocaleString() + ' EAT',
      operator: operatorName,
      action,
      target,
      hash: Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 6),
    }
    setLogs((prev) => [newLog, ...prev])
  }

  return (
    <AuditLogContext.Provider value={{ logs, logAction }}>
      {children}
    </AuditLogContext.Provider>
  )
}

export const useAuditLogs = () => useContext(AuditLogContext)
