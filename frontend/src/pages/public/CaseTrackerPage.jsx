import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, FileSearch } from 'lucide-react'
import TextField from '../../components/forms/TextField'
import Button from '../../components/common/Button'
import StatusBadge from '../../components/common/StatusBadge'
import EmptyState from '../../components/common/EmptyState'
import { incidentsApi } from '../../api/incidentsApi'
import { useLanguage } from '../../i18n/LanguageContext'
import { INCIDENT_STATUS_META_AM } from '../../lib/constants'

const DEMO_CASE = {
  tracking_code: 'NDSIR-2026-7F3K9Q',
  status: 'IN_REVIEW',
  incident_type: 'MOBILE_BANKING_FRAUD',
  created_at: '2026-09-10T08:12:00Z',
  updated_at: '2026-09-14T10:03:00Z',
}

export default function CaseTrackerPage() {
  const { t, lang } = useLanguage()
  const [searchParams] = useSearchParams()
  const [code, setCode] = useState(searchParams.get('code') || '')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const handleTrack = async () => {
    setLoading(true)
    setNotFound(false)
    setResult(null)
    try {
      const { data } = await incidentsApi.trackCase(code)
      setResult(data)
    } catch {
      if (code.trim().toUpperCase() === DEMO_CASE.tracking_code) {
        setResult(DEMO_CASE)
      } else {
        setNotFound(true)
      }
    } finally {
      setLoading(false)
    }
  }

  const locale = lang === 'am' ? 'am-ET' : 'en-US'

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-xl font-semibold text-ink-950 mb-1">{t('tracker.title')}</h1>
      <p className="text-sm text-fog-500 mb-6">{t('tracker.sub')}</p>

      <div className="flex gap-2 mb-8">
        <TextField
          className="!mb-0 flex-1"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={t('tracker.placeholder')}
        />
        <Button variant="primary" loading={loading} onClick={handleTrack} disabled={!code}>
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {result && (
        <div className="public-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-ink-950">{result.tracking_code}</span>
            <StatusBadge status={result.status} metaMap={lang === 'am' ? INCIDENT_STATUS_META_AM : undefined} />
          </div>
          <div className="text-sm text-fog-500 space-y-1">
            <p>{t('tracker.reported')}: {new Date(result.created_at).toLocaleDateString(locale)}</p>
            <p>{t('tracker.lastUpdated')}: {new Date(result.updated_at).toLocaleDateString(locale)}</p>
          </div>
        </div>
      )}

      {notFound && (
        <EmptyState
          icon={FileSearch}
          title={t('tracker.notFoundTitle')}
          description={t('tracker.notFoundDesc')}
        />
      )}
    </div>
  )
}
