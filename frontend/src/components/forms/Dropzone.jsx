import { useCallback, useState } from 'react'
import { UploadCloud, FileText, X, AlertCircle, ShieldCheck } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext'
import { computeFileHash } from '../../lib/hashUtils'

export default function Dropzone({ files, onAdd, onRemove, accept = 'image/*,audio/*,.pdf', maxSizeMb = 25 }) {
  const { t } = useLanguage()
  const [dragActive, setDragActive] = useState(false)
  const [rejected, setRejected] = useState([])
  const [hashing, setHashing] = useState(false)

  const handleFiles = useCallback(
    async (fileList) => {
      const tooLarge = []
      setHashing(true)

      for (const file of Array.from(fileList)) {
        if (file.size > maxSizeMb * 1024 * 1024) {
          tooLarge.push(file.name)
          continue
        }
        // Compute cryptographic SHA-256 fingerprint for legal chain of custody
        const sha256 = await computeFileHash(file)

        // Attach hash metadata to the file object before sending to parent state
        const enhancedFile = Object.assign(file, { sha256 })
        onAdd(enhancedFile)
      }

      setHashing(false)

      if (tooLarge.length > 0) {
        setRejected(tooLarge)
        setTimeout(() => setRejected([]), 5000)
      }
    },
    [onAdd, maxSizeMb]
  )

  return (
    <div className="mb-4">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragActive(false)
          handleFiles(e.dataTransfer.files)
        }}
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors
          ${dragActive ? 'border-signal bg-signal-50' : 'border-mist-300 bg-mist-100'}`}
      >
        <UploadCloud className="h-6 w-6 text-fog-500" />
        <p className="text-sm text-ink-950 font-medium">
          {hashing ? 'Hashing evidence for chain of custody...' : t('dropzone.dragText')}
        </p>
        <p className="text-xs text-fog-500">{t('dropzone.or')}</p>
        <label className="btn-ghost-light cursor-pointer">
          {t('dropzone.browse')}
          <input
            type="file"
            multiple
            accept={accept}
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </label>
        <p className="text-xs text-fog-500 mt-1">{t('dropzone.hint', { max: maxSizeMb })}</p>
      </div>

      {rejected.length > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded border border-critical/30 bg-critical-50 px-3 py-2 text-xs text-critical">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            {rejected.length === 1
              ? t('dropzone.rejectedOne', { name: rejected[0], max: maxSizeMb })
              : t('dropzone.rejectedMany', { count: rejected.length, max: maxSizeMb, names: rejected.join(', ') })}
          </span>
        </div>
      )}

      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((file, i) => (
            <li key={`${file.name}-${file.size}-${i}`} className="flex items-center justify-between rounded border border-mist-300 bg-white px-3 py-2 text-sm">
              <div className="flex items-center gap-2 text-ink-950 truncate">
                <FileText className="h-4 w-4 text-fog-500 shrink-0" />
                <span className="truncate">{file.name}</span>
                {file.sha256 && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
                    <ShieldCheck className="w-3 h-3" /> SHA-256 Secured
                  </span>
                )}
              </div>
              <button type="button" onClick={() => onRemove(i)} className="text-fog-500 hover:text-critical shrink-0">
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}