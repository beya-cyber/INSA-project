import { useEffect, useState } from 'react'
import { UserPlus, ShieldCheck, ShieldOff, Ban, RotateCcw } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import { adminApi } from '../../api/adminApi'
import { MOCK_USERS } from '../../lib/mockData'
import { ROLE_LABELS, ROLES } from '../../lib/constants'

const ROLE_OPTIONS = Object.entries(ROLE_LABELS)
  .filter(([value]) => value !== ROLES.CITIZEN)
  .map(([value, label]) => ({ value, label }))

const EMPTY_FORM = { username: '', email: '', role: '', organization_code: '', organization_name: '', password: '' }

export default function UserManagementPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [pendingSuspendId, setPendingSuspendId] = useState(null)

  useEffect(() => {
    adminApi
      .listUsers()
      .then(({ data }) => setUsers(data.results || data))
      .catch(() => setUsers(MOCK_USERS))
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async () => {
    setFormError('')
    if (form.password.length < 12) {
      setFormError('Password must be at least 12 characters (matches the platform-wide policy).')
      return
    }
    setSubmitting(true)
    try {
      const { data } = await adminApi.provisionUser(form)
      setUsers((prev) => [data, ...prev])
    } catch (err) {
      if (err.response?.data?.error?.detail) {
        // Surface the backend's validation errors (e.g. duplicate username) rather than failing silently.
        setFormError(JSON.stringify(err.response.data.error.detail))
      } else {
        // Demo mode: no backend reachable - reflect the account locally so the flow is still explorable.
        setUsers((prev) => [
          { id: `u${prev.length + 1}`, ...form, is_active: true, is_suspended: false, is_mfa_enabled: false },
          ...prev,
        ])
      }
    } finally {
      setSubmitting(false)
      setModalOpen(false)
      setForm(EMPTY_FORM)
    }
  }

  const handleToggleSuspend = async (targetUser) => {
    setPendingSuspendId(targetUser.id)
    try {
      const { data } = await adminApi.toggleSuspend(targetUser.id)
      setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? data : u)))
    } catch {
      // Demo mode fallback
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, is_suspended: !u.is_suspended } : u))
      )
    } finally {
      setPendingSuspendId(null)
    }
  }

  return (
    <div>
      <TopBar title="User Management" subtitle="Provision staff, bank, and law enforcement accounts" />

      <div className="px-8 py-6">
        <div className="flex justify-end mb-4">
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            <UserPlus className="h-4 w-4" /> Provision account
          </Button>
        </div>

        <div className="console-panel overflow-hidden">
          <table className="w-full console-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
                <th>Organization</th>
                <th>MFA</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {!loading && users.length === 0 && (
                <tr><td colSpan={6} className="text-center text-fg-faint py-8">No accounts provisioned yet.</td></tr>
              )}
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="text-fg-primary">{u.username}</td>
                  <td className="text-fg-muted">{ROLE_LABELS[u.role]}</td>
                  <td className="mono-data text-fg-faint text-xs">{u.organization_code}</td>
                  <td>
                    {u.is_mfa_enabled ? (
                      <ShieldCheck className="h-4 w-4 text-status-success" />
                    ) : (
                      <ShieldOff className="h-4 w-4 text-fg-faint" />
                    )}
                  </td>
                  <td className={u.is_suspended ? 'text-status-danger text-xs' : 'text-status-success text-xs'}>
                    {u.is_suspended ? 'Suspended' : 'Active'}
                  </td>
                  <td>
                    <Button
                      variant="ghostDark"
                      className="!py-1.5 !px-3 text-xs"
                      loading={pendingSuspendId === u.id}
                      onClick={() => handleToggleSuspend(u)}
                    >
                      {u.is_suspended ? <RotateCcw className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                      {u.is_suspended ? 'Reactivate' : 'Suspend'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Provision a new account"
        footer={
          <>
            <Button variant="ghostDark" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={submitting} onClick={handleCreate} disabled={!form.username || !form.role || !form.password}>
              Create account
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block">
            <span className="block text-sm font-medium text-fg-primary mb-1.5">Username</span>
            <input className="console-input w-full" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-fg-primary mb-1.5">Email (optional)</span>
            <input type="email" className="console-input w-full" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-fg-primary mb-1.5">Role</span>
            <select className="console-input w-full" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="">Select a role</option>
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-fg-primary mb-1.5">Organization code</span>
            <input className="console-input w-full" value={form.organization_code} onChange={(e) => setForm({ ...form, organization_code: e.target.value })} placeholder="e.g. CBE, FEDPOL-CIB" />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-fg-primary mb-1.5">Temporary password</span>
            <input type="password" className="console-input w-full" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <span className="block text-xs text-fg-faint mt-1">At least 12 characters. The account holder should change this on first login.</span>
          </label>
          {formError && <p className="text-xs text-status-danger">{formError}</p>}
        </div>
      </Modal>
    </div>
  )
}
