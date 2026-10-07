import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import { partnersApi } from '../../api/partnersApi'
import { MOCK_AUDIT_LOGS } from '../../lib/mockData'

const ACTION_TONE = {
  APPROVE_FREEZE: 'text-status-danger',
  PROPOSE_FREEZE: 'text-status-warning',
  PROPOSE_TELECOM_ESCALATION: 'text-status-warning',
  EXPORT_COURT_PACKAGE: 'text-brand-light',
  DOWNLOAD_COURT_PACKAGE: 'text-fg-muted',
}

export default function ActionAuditLogsPage() {
  const [logs, setLogs] = useState([])

  useEffect(() => {
    partnersApi
      .listAuditLogs()
      .then(({ data }) => setLogs(data.results || data))
      .catch(() => setLogs(MOCK_AUDIT_LOGS))
  }, [])

  return (
    <div>
      <TopBar title="Immutable Audit Trail" subtitle="Append-only compliance ledger of every privileged action" />

      <div className="px-8 py-6">
        <div className="flex items-center gap-2 text-xs text-fg-faint mb-4">
          <ShieldCheck className="h-3.5 w-3.5 text-status-success" />
          These records cannot be edited or deleted, including by System Administrators.
        </div>

        <div className="console-panel overflow-hidden">
          <table className="w-full console-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target case</th>
                <th>IP address</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.action_id}>
                  <td className="mono-data text-fg-faint text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="text-fg-primary">{log.actor_username}</td>
                  <td className={`text-xs font-medium ${ACTION_TONE[log.action_type] || 'text-fg-muted'}`}>
                    {log.action_type.replaceAll('_', ' ')}
                  </td>
                  <td className="mono-data text-fg-muted">{log.target_report_id}</td>
                  <td className="mono-data text-fg-faint text-xs">{log.ip_address}</td>
                  <td className="text-status-success text-xs">{log.status_code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
