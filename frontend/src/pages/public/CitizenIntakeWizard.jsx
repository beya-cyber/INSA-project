import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import axiosClient from '../../api/axiosClient'
import { incidentsApi, inferEvidenceFileType } from '../../api/incidentsApi'
import { 
  Shield, ShieldCheck, Sun, Moon, Lock, 
  Send, Search, Upload, FileText, CheckCircle2, 
  ArrowRight, ArrowLeft, AlertTriangle,
  PhoneCall, UserCheck, Mic, Phone,
  Activity, Building2, CheckCircle, Radio,
  Clock, AlertCircle, Trash2
} from 'lucide-react'

// --- SECURITY UTILITIES ---
const sanitizeString = (str) => {
  if (typeof str !== 'string') return ''
  return str.replace(/[<>]/g, '').trim()
}

const generateFileHash = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  } catch (err) {
    return 'HASH_GEN_FAILED'
  }
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp',
  'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/ogg',
  'application/pdf'
]
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

// --- FORM RULES (the backend enforces the same rules in apps/incidents/serializers.py) ---
const INITIAL_FORM = {
  fullName: '',
  idType: 'FAYDA',
  nationalId: '',
  contactPhone: '',
  scamType: 'Voice Call / Impersonation (የስልክ ጥሪ/አታላይ ማታለል)',
  scammerPhone: '',
  transactionId: '',
  amount: '',
  sourceBank: 'Commercial Bank of Ethiopia (CBE)',
  senderAccount: '',
  targetPlatform: 'Telebirr (Ethio Telecom)',
  targetAccount: '',
  narrative: '',
  legalDeclaration: false
}

const MAX_AMOUNT_ETB = 10000000
const cleanPhone = (v) => String(v || '').replace(/[\s\-()]/g, '')
const phoneCore = (v) => cleanPhone(v).replace(/^(\+?251|0)/, '')
const isEtPhone = (v) => /^(\+?251|0)?9\d{8}$/.test(cleanPhone(v)) || /^(\+?251|0)?7\d{8}$/.test(cleanPhone(v))
const ID_RULES = {
  FAYDA: { re: /^FIN-\d{4}-\d{4}$/, upper: true, placeholder: 'FIN-1234-5678' },
  KEBELE: { re: /^\d{6,}$/, upper: false, placeholder: '123456789' },
  PASSPORT: { re: /^[A-Z]{2}\d{7}$/, upper: true, placeholder: 'EP1234567' },
}

// Which form fields live on which step (drives the red step indicators and "Next" gating)
const STEP_FIELDS = {
  1: ['fullName', 'nationalId', 'contactPhone', 'otp'],
  2: ['scammerPhone', 'amount', 'narrative'],
  3: ['legalDeclaration'],
}
const FIELD_STEP = Object.fromEntries(Object.entries(STEP_FIELDS).flatMap(([s, fs]) => fs.map((f) => [f, Number(s)])))

// backend field -> form field (for mapping HTTP 400 responses onto inputs)
const SERVER_FIELD_MAP = {
  full_name: 'fullName', phone_number: 'contactPhone', national_id: 'nationalId', id_type: 'nationalId',
  consent_given: 'legalDeclaration', amount: 'amount', scammer_phone_number: 'scammerPhone',
  description: 'narrative', incident_type: 'scamType', transaction_id: 'transactionId',
  source_account: 'senderAccount', scammer_identifier: 'targetAccount', verification_token: 'otp',
}

const SCAM_TYPE_CODES = [
  ['Voice Call', 'VOICE_SCAM'],
  ['Telegram', 'OTHER'],
  ['Fake Bank SMS', 'SMS_IMPERSONATION'],
  ['Unauthorized Telebirr', 'MOBILE_BANKING_FRAUD'],
  ['Phishing', 'PHISHING'],
]
const incidentTypeFor = (label) => (SCAM_TYPE_CODES.find(([prefix]) => label.startsWith(prefix)) || [null, 'OTHER'])[1]

function validateForm(f, otpVerified, lang) {
  const m = (en, am) => (lang === 'AM' ? am : en)
  const e = {}
  const name = f.fullName.trim().replace(/\s+/g, ' ')
  if (!name) e.fullName = m('Full name is required.', 'ሙሉ ስም ያስፈልጋል።')
  else if (name.length < 2 || !name.includes(' ')) e.fullName = m('Enter your first and last name (at least two words).', 'ስምና የአባት ስም ያስገቡ (ቢያንስ ሁለት ቃላት)።')

  if (!f.contactPhone.trim()) e.contactPhone = m('Mobile number is required.', 'የሞባይል ቁጥር ያስፈልጋል።')
  else if (!isEtPhone(f.contactPhone)) e.contactPhone = m('Enter a valid Ethiopian mobile number, e.g. 0911223344 or 0711223344.', 'ትክክለኛ የኢትዮጵያ ሞባይል ቁጥር ያስገቡ (ለምሳሌ 0911223344)።')
  else if (!otpVerified) e.otp = m('Verify this phone number with the SMS code to continue.', 'ለመቀጠል የስልክ ቁጥርዎን በኤስኤምኤስ ኮድ ያረጋግጡ።')

  const nid = f.nationalId.trim()
  if (nid) {
    const rule = ID_RULES[f.idType]
    const candidate = rule.upper ? nid.toUpperCase() : nid
    if (!rule.re.test(candidate)) {
      e.nationalId = {
        FAYDA: m('Fayda FIN must look like FIN-1234-5678.', 'የፋይዳ ቁጥር ቅርጽ FIN-1234-5678 መሆን አለበት።'),
        KEBELE: m('Kebele ID must be at least 6 digits.', 'የቀበሌ መታወቂያ ቢያንስ 6 አሃዞች መሆን አለበት።'),
        PASSPORT: m('Passport must be 2 capital letters + 7 digits, e.g. EP1234567.', 'ፓስፖርት 2 ትልልቅ ፊደላት እና 7 አሃዞች መሆን አለበት (ለምሳሌ EP1234567)።'),
      }[f.idType]
    }
  }

  const sp = cleanPhone(f.scammerPhone)
  if (sp && !/^\+?\d{7,15}$/.test(sp)) e.scammerPhone = m('Use digits only (7–15 digits, optional leading +).', 'በአሃዞች ብቻ ያስገቡ (7–15 አሃዞች)።')

  if (String(f.amount).trim() !== '') {
    const n = Number(f.amount)
    if (!Number.isFinite(n) || n <= 0 || n > MAX_AMOUNT_ETB) e.amount = m('Amount must be greater than 0 and at most 10,000,000 ETB.', 'መጠኑ ከ0 በላይ እና ከ10,000,000 ብር ያልበለጠ መሆን አለበት።')
    else if (!/^\d+(\.\d{1,2})?$/.test(String(f.amount).trim())) e.amount = m('Use at most 2 decimal places.', 'ቢበዛ 2 የአስርዮሽ አሃዞች ይጠቀሙ።')
  }

  if (!f.legalDeclaration) e.legalDeclaration = m('You must accept the legal declaration to submit.', 'ለመላክ የሕግ መግለጫውን መቀበል አለብዎት።')
  return e
}

// --- small presentational helpers ---
const Req = () => <span className="text-red-400 ml-0.5" aria-hidden="true"> *</span>
const Opt = ({ lang }) => <span className="ml-1.5 text-[10px] font-normal text-slate-500">{lang === 'AM' ? '(አማራጭ)' : '(optional)'}</span>
const FieldError = ({ msg, id }) => (msg ? (
  <p id={id} role="alert" className="mt-1.5 text-[11px] font-semibold text-red-400 flex items-start gap-1.5">
    <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" /><span>{msg}</span>
  </p>
) : null)
const FieldWarn = ({ msg }) => (msg ? (
  <p className="mt-1.5 text-[11px] font-medium text-amber-400 flex items-start gap-1.5">
    <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" /><span>{msg}</span>
  </p>
) : null)

// Pulls the first human-readable message out of the API's error envelope:
// { success:false, error:{ code, detail: { field: ["msg"] } | "msg" | {detail:"msg"} } }
const apiDetail = (err) => err?.response?.data?.error?.detail ?? err?.response?.data?.detail ?? null
const firstMsg = (v) => (Array.isArray(v) ? firstMsg(v[0]) : typeof v === 'string' ? v : null)
const apiMessage = (err, field) => {
  const d = apiDetail(err)
  if (!d) return null
  if (typeof d === 'string') return d
  if (field && d[field]) return firstMsg(d[field])
  return firstMsg(Object.values(d)[0])
}

export default function CitizenIntakeWizard() {
  const [theme, setTheme] = useState('dark')
  const [lang, setLang] = useState('AM')
  const [activeTab, setActiveTab] = useState('landing')
  const m = (en, am) => (lang === 'AM' ? am : en)
  
  // Intake Wizard State
  const [step, setStep] = useState(1)
  const [submittedCaseId, setSubmittedCaseId] = useState(null)
  const [submitMessage, setSubmitMessage] = useState('')
  const [uploadFailures, setUploadFailures] = useState([])
  const [evidenceFiles, setEvidenceFiles] = useState([])
  const [fileError, setFileError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Validation UI state
  const [touched, setTouched] = useState({})
  const [attempted, setAttempted] = useState({})
  const [serverErrors, setServerErrors] = useState({})
  
  // OTP & Identity Verification State (real backend OTP: /incidents/otp/request/ + /incidents/otp/verify/)
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpVerified, setOtpVerified] = useState(false)
  const [otpToken, setOtpToken] = useState(null)
  const [otpPhone, setOtpPhone] = useState('')
  const [otpExpiresAt, setOtpExpiresAt] = useState(null)
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(0)
  const [otpBusy, setOtpBusy] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [devCode, setDevCode] = useState(null)

  // Tracking Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [trackedCase, setTrackedCase] = useState(null)
  const [trackingError, setTrackingError] = useState('')

  const [formData, setFormData] = useState(INITIAL_FORM)

  const ethiopianFinancialPlatforms = [
    'Telebirr (Ethio Telecom)',
    'M-PESA (Safaricom Ethiopia)',
    'CBE Birr',
    'Commercial Bank of Ethiopia (CBE)',
    'Bank of Abyssinia (BoA Mobile / Apollo)',
    'Awash Bank (AwashBirr)',
    'Dashen Bank (Amole)',
    'Cooperative Bank of Oromia (Coopay / CoopApp)',
    'Hibret Bank (Hibir Mobile)',
    'Nib International Bank (NIBterra)',
    'Wegagen Bank (Efoyta)',
    'E-Birr (Joint MMO)',
    'Kacha Digital Financial Services',
    'Amhara Bank',
    'Zemen Bank',
    'Bunna Bank',
    'Berhan Bank',
    'Abay Bank',
    'Ahadu Bank',
    'Global Bank Ethiopia',
    'Siinqee Bank',
    'ZamZam Bank (Interest-Free)',
    'Hijra Bank (Interest-Free)',
    'Enat Bank',
    'Lion International Bank',
    'Gadaa Bank',
    'Tsehay Bank'
  ]

  // ---- derived validation state
  const errors = useMemo(() => validateForm(formData, otpVerified, lang), [formData, otpVerified, lang])
  const narrativeWarning = formData.narrative.trim().length < 20
    ? m('A narrative of 20+ characters helps analysts act faster (optional).', 'ከ20 ፊደላት በላይ የሆነ ማብራሪያ ተንታኞች በፍጥነት እንዲሰሩ ይረዳል (አማራጭ)።')
    : ''
  // an error is shown once the field was touched, its step was attempted, or the server rejected it
  const fieldError = (field) => serverErrors[field] || ((touched[field] || attempted[FIELD_STEP[field]]) ? errors[field] : undefined)
  const stepInvalid = (n) => STEP_FIELDS[n].some((f) => fieldError(f))
  const stepBlocked = (n) => STEP_FIELDS[n].some((f) => errors[f] || serverErrors[f])
  const allValid = Object.keys(errors).length === 0 && !!otpToken
  const touch = (e) => setTouched((prev) => ({ ...prev, [e.target.name]: true }))

  const goNext = (n) => {
    setAttempted((prev) => ({ ...prev, [n]: true }))
    if (stepBlocked(n)) return
    setStep(n + 1)
  }

  // ---- OTP countdown (real clock, derived from the server's expires_in)
  useEffect(() => {
    if (!otpExpiresAt) return undefined
    const tick = () => setOtpSecondsLeft(Math.max(0, Math.ceil((otpExpiresAt - Date.now()) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [otpExpiresAt])
  const mmss = `${String(Math.floor(otpSecondsLeft / 60)).padStart(2, '0')}:${String(otpSecondsLeft % 60).padStart(2, '0')}`

  const resetOtp = () => {
    setOtpSent(false); setOtpVerified(false); setOtpToken(null); setOtpPhone(''); setOtpCode('')
    setOtpExpiresAt(null); setOtpSecondsLeft(0); setDevCode(null); setOtpError('')
  }

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target
    const val = type === 'checkbox' ? checked : value
    setFormData(prev => ({ ...prev, [name]: val }))
    setServerErrors(prev => { if (!prev[name]) return prev; const next = { ...prev }; delete next[name]; return next })
    // the verification token is bound to one phone number: changing the number invalidates it
    if (name === 'contactPhone' && (otpSent || otpVerified) && phoneCore(value) !== phoneCore(otpPhone)) resetOtp()
  }

  const handleFileUpload = async (e) => {
    setFileError('')
    const files = Array.from(e.target.files)
    if (!files.length) return

    const processed = []
    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        setFileError(lang === 'AM' ? `የማይፈቀድ የፋይል አይነት: ${file.name}` : `Unsupported file format: ${file.name}`)
        continue
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setFileError(lang === 'AM' ? `ፋይሉ ከ10MB ይበልጣል: ${file.name}` : `File exceeds 10MB limit: ${file.name}`)
        continue
      }

      const hash = await generateFileHash(file)
      processed.push({
        name: sanitizeString(file.name),
        size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        hash,
        file
      })
    }

    setEvidenceFiles(prev => [...prev, ...processed])
    e.target.value = '' // allow re-selecting the same file after removing it
  }

  const removeFile = (index) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSendOtp = async () => {
    setTouched(prev => ({ ...prev, contactPhone: true }))
    if (!isEtPhone(formData.contactPhone)) return // inline phone error is already showing
    setOtpBusy(true)
    setOtpError('')
    try {
      const phone = cleanPhone(formData.contactPhone)
      const { data } = await axiosClient.post('/incidents/otp/request/', { phone })
      setOtpSent(true)
      setOtpPhone(phone)
      setOtpCode('')
      setDevCode(data.dev_code || null) // only present when the backend runs in DEBUG / OTP_DEV_MODE
      setOtpExpiresAt(Date.now() + (data.expires_in || 300) * 1000)
    } catch (err) {
      setOtpError(
        err.response?.status === 429
          ? m('Too many code requests for this number. Please wait about 15 minutes.', 'ለዚህ ቁጥር ብዙ ጥያቄ ቀርቧል። እባክዎ ወደ 15 ደቂቃ ይጠብቁ።')
          : apiMessage(err, 'phone') || apiMessage(err) || m('Could not send the code. Check your connection and try again.', 'ኮዱን መላክ አልተቻለም። ግንኙነትዎን ያረጋግጡ እና እንደገና ይሞክሩ።')
      )
    } finally {
      setOtpBusy(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!/^\d{6}$/.test(otpCode)) {
      setOtpError(m('Enter the 6-digit code from the SMS.', 'ከኤስኤምኤስ የደረሰዎትን ባለ 6 አሃዝ ኮድ ያስገቡ።'))
      return
    }
    setOtpBusy(true)
    setOtpError('')
    try {
      const { data } = await axiosClient.post('/incidents/otp/verify/', { phone: cleanPhone(formData.contactPhone), code: otpCode })
      setOtpVerified(true)
      setOtpToken(data.verification_token)
      setOtpExpiresAt(null)
      setDevCode(null)
    } catch (err) {
      setOtpError(apiMessage(err, 'code') || apiMessage(err) || m('Verification failed. Please try again.', 'ማረጋገጫው አልተሳካም። እንደገና ይሞክሩ።'))
    } finally {
      setOtpBusy(false)
    }
  }

  const buildPayload = () => {
    const optional = {
      national_id: formData.nationalId.trim() ? (ID_RULES[formData.idType].upper ? formData.nationalId.trim().toUpperCase() : formData.nationalId.trim()) : undefined,
      scammer_phone_number: cleanPhone(formData.scammerPhone) || undefined,
      scammer_identifier: sanitizeString(formData.targetAccount) || undefined,
      amount: String(formData.amount).trim() !== '' ? String(formData.amount).trim() : undefined,
      transaction_id: sanitizeString(formData.transactionId) || undefined,
      source_account: sanitizeString(formData.senderAccount) || undefined,
      description: sanitizeString(formData.narrative) || undefined,
    }
    Object.keys(optional).forEach((k) => optional[k] === undefined && delete optional[k])
    return {
      full_name: sanitizeString(formData.fullName),
      phone_number: cleanPhone(formData.contactPhone),
      id_type: formData.idType,
      verification_token: otpToken,
      consent_given: formData.legalDeclaration,
      channel: 'WEB',
      incident_type: incidentTypeFor(formData.scamType),
      source_bank: formData.sourceBank,
      target_platform: formData.targetPlatform,
      ...optional,
    }
  }

  // Map an HTTP 400 {error:{detail:{field:[msg]}}} onto the inputs and jump to the earliest affected step.
  const applyServerErrors = (detail) => {
    const mapped = {}
    Object.entries(detail || {}).forEach(([k, v]) => {
      const field = SERVER_FIELD_MAP[k]
      const msg = firstMsg(v)
      if (field && msg && !mapped[field]) mapped[field] = msg
      if (k === 'verification_token') resetOtp() // expired / already used: verify again
    })
    if (!Object.keys(mapped).length) return false
    setServerErrors(mapped)
    const target = Math.min(...Object.keys(mapped).map((f) => FIELD_STEP[f] || 3))
    setStep(target)
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setAttempted({ 1: true, 2: true, 3: true })
    setSubmitError('')
    if (!allValid) return

    setIsProcessing(true)
    try {
      const { data } = await incidentsApi.submitCitizenReport(buildPayload())

      // evidence is optional and uploaded after the report exists (keyed by tracking code)
      const failed = []
      for (const item of evidenceFiles) {
        try {
          await incidentsApi.uploadEvidence(data.tracking_code, item.file, inferEvidenceFileType(item.file))
        } catch {
          failed.push(item.name)
        }
      }

      setSubmittedCaseId(data.tracking_code)
      setSubmitMessage(data.message || '')
      setUploadFailures(failed)
      setStep(4)
    } catch (err) {
      const status = err.response?.status
      const detail = apiDetail(err)
      if (status === 400 && detail && typeof detail === 'object' && applyServerErrors(detail)) {
        setSubmitError(m('Some details were rejected by the server. Please correct the highlighted fields.', 'አንዳንድ መረጃዎች በአገልጋዩ ተቀባይነት አላገኙም። እባክዎ ምልክት የተደረገባቸውን መስኮች ያስተካክሉ።'))
      } else if (status === 429) {
        setSubmitError(m('Too many submissions. Please wait a while and try again.', 'ብዙ ጥያቄ ቀርቧል። እባክዎ ጥቂት ቆይተው እንደገና ይሞክሩ።'))
      } else if (!err.response) {
        setSubmitError(m('Cannot reach the server. Your details are kept — check your connection and press submit again.', 'አገልጋዩን ማግኘት አልተቻለም። መረጃዎ ተይዟል — ግንኙነትዎን ያረጋግጡ እና እንደገና ይላኩ።'))
      } else {
        setSubmitError(apiMessage(err) || m('Submission failed. Please try again.', 'መላክ አልተሳካም። እንደገና ይሞክሩ።'))
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const resetWizard = () => {
    setStep(1)
    setSubmittedCaseId(null)
    setSubmitMessage('')
    setUploadFailures([])
    setSubmitError('')
    setFormData(INITIAL_FORM)
    setEvidenceFiles([])
    setTouched({}); setAttempted({}); setServerErrors({})
    resetOtp()
  }

  const handleTrackSearch = (e) => {
    e.preventDefault()
    setTrackingError('')
    const query = sanitizeString(searchQuery).toUpperCase()
    if (!query) {
      setTrackingError(lang === 'AM' ? 'እባክዎን የጉዳይ መለያ ያስገቡ' : 'Please enter a valid Case Reference Code.')
      return
    }

    setTrackedCase({
      id: query,
      status: 'INTERBANK HOLD ACTIVE',
      timestamp: '2026-09-29 08:30:12 EAT',
      source: sanitizeString(formData.sourceBank) || 'Commercial Bank of Ethiopia (CBE)',
      target: sanitizeString(formData.targetPlatform) || 'Telebirr Endpoint',
      amount: formData.amount ? `${sanitizeString(formData.amount)} ETB` : '145,000 ETB',
      ethswitchGateway: 'HOLD_DIRECTIVE_CONFIRMED',
    })
  }

  const isDark = theme === 'dark'

  const inputCls = (hasErr, mono = false) =>
    `w-full rounded-xl p-3.5 border outline-none transition-all ${mono ? 'font-mono' : 'font-medium'} ${
      hasErr
        ? `border-red-500 focus:border-red-400 ${isDark ? 'bg-[#0a1122] text-white' : 'bg-red-50 text-slate-900'}`
        : isDark ? 'bg-[#0a1122] border-slate-700 text-white focus:border-cyan-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-cyan-600'
    }`

  const t = {
    EN: {
      agency: 'FEDERAL DEMOCRATIC REPUBLIC OF ETHIOPIA',
      subAgency: 'Information Network Security Administration (INSA)',
      portalTitle: 'National Digital Incident & Fraud Interception Portal',
      navHome: 'Portal Overview',
      navReport: 'File Fraud Incident',
      navTrack: 'Track Case Status',
      staffLogin: 'Staff Secure Login',
      
      trustHeader: 'Official Federal Platform for Rapid Fraud Interception',
      trustSub: 'INSA Ethio-CERT coordinates in real time with EthSwitch, Commercial Banks, Ethio Telecom, and Safaricom M-PESA to trace and freeze fraudulent transactions.',
      startReportBtn: 'FILE OFFICIAL INCIDENT REPORT',
      emergencyBtn: '24/7 Hotline: 933',
      legalWarningTitle: 'LEGAL NOTICE & ANTI-FRAUD WARNING',
      legalWarningText: 'Submitting false, fabricated, or malicious reports is a severe offense under Article 385 of the FDRE Criminal Code and Computer Crime Proclamation No. 958/2016.',
      
      step1: '1. Identity & OTP',
      step2: '2. Incident & Evidence',
      step3: '3. Financial Endpoints',
      step4: '4. Case ID Transmitted',

      fullName: 'Full Legal Name (as registered in Fayda / Kebele)',
      nationalId: 'National ID (Fayda FAN Number / Passport / Kebele ID)',
      contactPhone: 'Contact Mobile Number',
      sendOtp: 'Request OTP (SMS)',
      enterOtp: 'Enter 6-Digit Security Code',
      verifyOtpBtn: 'Verify Reporter Identity',
      verifiedBadge: 'REPORTER IDENTITY VERIFIED BY Ethio-CERT',
      
      scamType: 'Primary Fraud Vector',
      scammerPhone: "Attacker / Scammer's Phone Number",
      amount: 'Financial Loss Amount (ETB)',
      transactionId: 'Transaction ID / Reference Code (CBE, Telebirr, M-PESA)',
      narrative: 'Detailed Sequence of Events',
      evidence: 'Attach Voice Recordings / Call Logs / Transaction Receipts',
      
      sourceBank: 'Victim Sending Bank / Wallet',
      senderAccount: 'Victim Account / Wallet Number',
      targetPlatform: 'Suspect Receiving Bank / Wallet',
      targetAccount: 'Suspect Account / Wallet Number',
      legalCheck: 'I hereby declare under law that all provided details are true and correct. I acknowledge that fraudulent filing is subject to prosecution under FDRE Proclamation No. 958/2016.',

      nextBtn: 'Proceed to Next Step',
      backBtn: 'Previous Step',
      submitBtn: 'Transmit Direct Interception Order to INSA Ops',
      
      caseRefHeader: 'INCIDENT REPORT TRANSMITTED TO INSA CYBER OPS COMMAND',
      caseRefLabel: 'OFFICIAL INSA CASE REFERENCE CODE',
      trackMsg: 'Retain this Case ID for legal inquiries and interbank status tracking.',
      
      trackTitle: 'Interbank Rapid Response & Case Tracking',
      trackPlaceholder: 'Enter Case ID (e.g. ETH-2026-9041)',
      trackBtn: 'Execute Status Search'
    },
    AM: {
      agency: 'የኢትዮጵያ ፌዴራላዊ ዲሞክራሲያዊ ሪፐብሊክ',
      subAgency: 'የኢንፎርሜሽን መረብ ደህንነት አስተዳደር (ኢንሳ)',
      portalTitle: 'ብሔራዊ የዲጂታል ማጭበርበር መከላከያ እና አጣዳፊ ምላሽ ፖርታል',
      navHome: 'መግቢያ ገጽ',
      navReport: 'አዲስ ሪፖርት አቅርብ',
      navTrack: 'የጉዳይ ሁኔታ ተከታተል',
      staffLogin: 'የሰራተኞች መግቢያ',

      trustHeader: 'የተሰረቀ ገንዘብን ለማስቆም የተዘጋጀ ይፋዊ የፌዴራል ፖርታል',
      trustSub: 'የኢንፎርሜሽን መረብ ደህንነት አስተዳደር (ኢንሳ) ከኢትስዊች፣ ከባንኮች፣ ከኢትዮ ቴሌኮም እና ከሰፋሪኮም ኤም-ፔሳ ጋር በመቀናጀት የተሰረቀ ገንዘብን ወዲያውኑ ለማገድ ይሰራል።',
      startReportBtn: 'ሕጋዊ የሳይበር ማጭበርበር ሪፖርት አቅርብ',
      emergencyBtn: 'በ24 ሰአት ስልክ መስመር፡ 933',
      legalWarningTitle: 'ሕጋዊ ማሳሰቢያ እና የሐሰት ሪፖርት ማስጠንቀቂያ',
      legalWarningText: 'የሐሰት ወይም የፈጠራ ሪፖርት ማቅረብ በኢ.ፌ.ዴ.ሪ የወንጀል ሕግ አንቀጽ 385 እና በኮምፒዩተር ወንጀል አዋጅ ቁጥር 958/2008 መሠረት በሕግ ያስቀጣል።',

      step1: '፩. የማንነት ማረጋገጫ',
      step2: '፪. የማጭበርበሩ ዝርዝር',
      step3: '፫. የባንክ ሂሳብ መረጃ',
      step4: '፬. የጉዳይ መከታተያ መለያ',

      fullName: 'ሙሉ ስም (በፋይዳ/ቀበሌ መታወቂያ መሠረት)',
      nationalId: 'የፋይዳ ቁጥር (Fayda FAN) / የቀበሌ መታወቂያ / ፓስፖርት',
      contactPhone: 'የስልክ ቁጥር',
      sendOtp: 'የማረጋገጫ ኮድ ላክ',
      enterOtp: 'በስልክዎ የደረሰውን 6 አሃዝ ኮድ ያስገቡ',
      verifyOtpBtn: 'ማንነትን አረጋግጥ',
      verifiedBadge: 'የሪፖርት አቅራቢው ማንነት ተረጋግጧል',

      scamType: 'የማጭበርበሩ አይነት / ዘዴ',
      scammerPhone: 'የአታላዩ/አስመሳይ የስልክ ቁጥር (በጥሪ ወይም በኤስኤምኤስ ከሆነ)',
      amount: 'የተወሰደው ገንዘብ መጠን (በብር)',
      transactionId: 'የትራንዛክሽን ማረጋገጫ ቁጥር / Transaction ID / Ref No.',
      narrative: 'የሁኔታው ዝርዝር ማብራሪያ',
      evidence: 'ማስረጃ ያያይዙ (የድምፅ የተቀዳ ጥሪ / ስክሪንሾት / የባንክ ደረሰኝ / ኤስኤምኤስ)',

      sourceBank: 'የእርስዎ ባንክ / የክፍያ አማራጭ (የወጣበት)',
      senderAccount: 'የእርስዎ ስልክ / የሂሳብ ቁጥር',
      targetPlatform: 'የአታላዩ ባንክ / የክፍያ አማራጭ (የገባበት)',
      targetAccount: 'የአታላዩ ስልክ / የሂሳብ ቁጥር',
      legalCheck: 'እዚህ የቀረበው መረጃ ሙሉ በሙሉ እውነት መሆኑን አረጋግጣለሁ። የሐሰት ሪፖርት ማቅረብ በሕግ የሚያስጠይቅ መሆኑን ተረድቻለሁ።',

      nextBtn: 'ቀጣይ ደረጃ',
      backBtn: 'ተመለስ',
      submitBtn: 'ሪፖርቱን ለኢንሳ ላክ',

      caseRefHeader: 'ሪፖርትዎ በተሳካ ሁኔታ ለኢንሳ የሳይበር ኦፕሬሽን ደርሷል',
      caseRefLabel: 'ብሔራዊ የጉዳይ መከታተያ መለያ (CASE ID)',
      trackMsg: 'ይህንን መለያ በጥንቃቄ ይያዙ። የቀረበውን የባንክ እግድ ሂደት በቀጥታ መከታተል ይችላሉ።',

      trackTitle: 'የቀረበውን ሪፖርት እና የባንክ እግድ ሁኔታ ይከታተሉ',
      trackPlaceholder: 'የመከታተያ መለያ ያስገቡ (ምሳሌ፡ ETH-2026-9041)',
      trackBtn: 'ፈልግ'
    }
  }[lang]

  return (
    <div className={`min-h-screen font-sans transition-colors duration-200 selection:bg-cyan-500 selection:text-black ${isDark ? 'bg-[#030712] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Telemetry Bar */}
      <div className={`border-b text-[11px] py-1.5 px-6 transition-colors ${isDark ? 'bg-[#02050e] border-slate-800/80 text-slate-400' : 'bg-slate-900 text-slate-300 border-slate-800'}`}>
        <div className="max-w-6xl mx-auto flex justify-between items-center font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
              <Radio className="h-3 w-3 animate-pulse" />
              ETHIO-CERT LIVE TELEMETRY
            </span>
            <span className="hidden md:inline text-slate-600">|</span>
            <span className="hidden md:inline">SYSTEM STATUS: <span className="text-emerald-400 font-bold">OPERATIONAL</span></span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline">FDRE CYBER CRIME PROCLAMATION NO. 958/2016</span>
            <button
              onClick={() => setLang(lang === 'AM' ? 'EN' : 'AM')}
              className="hover:text-cyan-400 font-bold tracking-wider transition-colors"
            >
              [{lang === 'AM' ? 'English' : 'አማርኛ'}]
            </button>
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="hover:text-cyan-400 transition-colors ml-2"
            >
              {isDark ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className={`border-b sticky top-0 z-50 backdrop-blur-md transition-colors ${isDark ? 'bg-[#070d1e]/90 border-slate-800' : 'bg-white/90 border-slate-200 shadow-sm'}`}>
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3.5 cursor-pointer" onClick={() => setActiveTab('landing')}>
            <div className={`p-2.5 rounded-xl border shadow-inner ${isDark ? 'bg-gradient-to-br from-cyan-950 to-slate-950 border-cyan-500/40 text-cyan-400' : 'bg-slate-900 border-slate-700 text-white'}`}>
              <Shield className="h-8 w-8" />
            </div>
            <div>
              <div className="text-[10px] font-black tracking-widest text-cyan-500 uppercase">{t.agency}</div>
              <div className={`text-xs font-bold tracking-wide ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.subAgency}</div>
              <h1 className="text-sm font-extrabold tracking-tight mt-0.5">{t.portalTitle}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <nav className={`flex p-1 rounded-xl border ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-200/80 border-slate-300'}`}>
              <button
                onClick={() => setActiveTab('landing')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'landing' ? 'bg-cyan-600 text-white shadow-sm' : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                {t.navHome}
              </button>
              <button
                onClick={() => setActiveTab('report')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'report' ? 'bg-cyan-600 text-white shadow-sm' : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                {t.navReport}
              </button>
              <button
                onClick={() => setActiveTab('track')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'track' ? 'bg-cyan-600 text-white shadow-sm' : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                {t.navTrack}
              </button>
            </nav>

            <Link
              to="/login"
              className="ml-2 bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Lock className="h-3.5 w-3.5 text-cyan-400" />
              <span>{t.staffLogin}</span>
            </Link>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* LANDING VIEW */}
        {activeTab === 'landing' && (
          <div className="space-y-8">
            <div className={`p-10 rounded-2xl border text-center space-y-6 relative overflow-hidden shadow-2xl ${isDark ? 'bg-gradient-to-b from-[#0a132c] via-[#050b18] to-[#030712] border-slate-800' : 'bg-white border-slate-200 shadow-xl'}`}>
              <div className="inline-flex p-3.5 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-cyan-400 mb-2 shadow-inner">
                <ShieldCheck className="h-12 w-12" />
              </div>

              <div className="max-w-2xl mx-auto space-y-3">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight">{t.trustHeader}</h1>
                <p className={`text-xs md:text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {t.trustSub}
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-4 pt-4">
                <button
                  onClick={() => setActiveTab('report')}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-7 py-3.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shadow-lg shadow-cyan-950/50 hover:scale-[1.02]"
                >
                  <span>{t.startReportBtn}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <a
                  href="tel:933"
                  className={`px-7 py-3.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${isDark ? 'bg-slate-900 border-slate-700 text-amber-400 hover:bg-slate-800' : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'}`}
                >
                  <PhoneCall className="h-4 w-4 text-amber-500" />
                  <span>{t.emergencyBtn}</span>
                </a>
              </div>
            </div>

            <div className={`p-6 rounded-xl border flex items-start gap-4 ${isDark ? 'bg-amber-950/20 border-amber-800/50 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
              <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <h2 className="font-extrabold uppercase tracking-wider">{t.legalWarningTitle}</h2>
                <p className="leading-relaxed opacity-90">{t.legalWarningText}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-xs font-bold">
              <div className={`p-5 rounded-xl border space-y-2 ${isDark ? 'bg-[#070e20] border-slate-800 text-slate-300' : 'bg-white border-slate-200 shadow-sm'}`}>
                <ShieldCheck className="h-6 w-6 text-cyan-400 mx-auto" />
                <div className="font-extrabold">INSA ETHIO-CERT</div>
                <div className="text-[10px] text-slate-500">24/7 Security Operations</div>
              </div>
              <div className={`p-5 rounded-xl border space-y-2 ${isDark ? 'bg-[#070e20] border-slate-800 text-slate-300' : 'bg-white border-slate-200 shadow-sm'}`}>
                <Activity className="h-6 w-6 text-cyan-400 mx-auto" />
                <div className="font-extrabold">ETHSWITCH GATEWAY</div>
                <div className="text-[10px] text-slate-500">Automated Fund Freeze</div>
              </div>
              <div className={`p-5 rounded-xl border space-y-2 ${isDark ? 'bg-[#070e20] border-slate-800 text-slate-300' : 'bg-white border-slate-200 shadow-sm'}`}>
                <Building2 className="h-6 w-6 text-cyan-400 mx-auto" />
                <div className="font-extrabold">BANKS & WALLETS</div>
                <div className="text-[10px] text-slate-500">27 Integrated Financials</div>
              </div>
              <div className={`p-5 rounded-xl border space-y-2 ${isDark ? 'bg-[#070e20] border-slate-800 text-slate-300' : 'bg-white border-slate-200 shadow-sm'}`}>
                <Lock className="h-6 w-6 text-cyan-400 mx-auto" />
                <div className="font-extrabold">FEDERAL POLICE</div>
                <div className="text-[10px] text-slate-500">Legal Evidence Vault</div>
              </div>
            </div>
          </div>
        )}

        {/* WIZARD VIEW */}
        {activeTab === 'report' && (
          <div className="space-y-6">
            
            <div className="grid grid-cols-4 gap-3 text-center text-xs font-bold">
              {[
                { num: 1, label: t.step1 },
                { num: 2, label: t.step2 },
                { num: 3, label: t.step3 },
                { num: 4, label: t.step4 },
              ].map((s) => {
                const invalid = s.num < 4 && stepInvalid(s.num)
                return (
                <div 
                  key={s.num}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${
                    invalid
                      ? 'border-red-500/70 bg-red-950/30 text-red-400 shadow-md shadow-red-950/20'
                      : step === s.num 
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400 shadow-md shadow-cyan-950/20' 
                      : step > s.num
                      ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-400'
                      : isDark ? 'border-slate-800 text-slate-500 bg-slate-900/40' : 'border-slate-200 text-slate-400 bg-slate-100'
                  }`}
                >
                  {invalid ? (
                    <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                  ) : step > s.num ? (
                    <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                  ) : (
                    <span className={`h-5 w-5 rounded-full text-[10px] flex items-center justify-center font-mono ${step === s.num ? 'bg-cyan-500 text-black font-extrabold' : 'bg-slate-800 text-slate-400'}`}>
                      {s.num}
                    </span>
                  )}
                  <span className="hidden sm:inline text-[11px] truncate">{s.label}</span>
                </div>
                )
              })}
            </div>

            {/* STEP 1 */}
            {step === 1 && (
              <div className={`p-8 rounded-2xl border space-y-6 shadow-xl ${isDark ? 'bg-[#060b18] border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="border-b pb-3 border-slate-800/80 flex items-center justify-between">
                  <h2 className="text-sm font-extrabold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    <span>{t.step1}</span>
                  </h2>
                  <span className="text-[10px] text-slate-500 font-mono">FAYDA / KEBELE INTEGRATED</span>
                </div>

                <p className="text-[11px] text-slate-500"><span className="text-red-400">*</span> {m('required', 'ያስፈልጋል')}</p>

                <div className="space-y-5 text-xs">
                  <div>
                    <label htmlFor="fullName" className="block font-bold mb-2 text-slate-300">{t.fullName}<Req /></label>
                    <input
                      id="fullName"
                      type="text"
                      name="fullName"
                      autoComplete="name"
                      placeholder="e.g. Abebe Bikila Gemeda"
                      value={formData.fullName}
                      onChange={handleChange}
                      onBlur={touch}
                      aria-invalid={!!fieldError('fullName')}
                      className={inputCls(fieldError('fullName'))}
                    />
                    <FieldError msg={fieldError('fullName')} />
                  </div>

                  <div>
                    <label htmlFor="nationalId" className="block font-bold mb-2 text-slate-300">{t.nationalId}<Opt lang={lang} /></label>
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        name="idType"
                        value={formData.idType}
                        onChange={handleChange}
                        aria-label={m('ID type', 'የመታወቂያ አይነት')}
                        className={`${inputCls(false)} col-span-1`}
                      >
                        <option value="FAYDA">Fayda (FIN)</option>
                        <option value="KEBELE">Kebele ID</option>
                        <option value="PASSPORT">Passport</option>
                      </select>
                      <input
                        id="nationalId"
                        type="text"
                        name="nationalId"
                        placeholder={ID_RULES[formData.idType].placeholder}
                        value={formData.nationalId}
                        onChange={handleChange}
                        onBlur={touch}
                        aria-invalid={!!fieldError('nationalId')}
                        className={`${inputCls(fieldError('nationalId'), true)} col-span-2`}
                      />
                    </div>
                    <FieldError msg={fieldError('nationalId')} />
                    {!fieldError('nationalId') && (
                      <p className="mt-1.5 text-[10px] text-slate-500">{m('Not needed if you verify your phone below. Stored only as a one-way hash.', 'ስልክዎን ከታች ካረጋገጡ አያስፈልግም። የሚቀመጠው በአንድ አቅጣጫ ሃሽ ብቻ ነው።')}</p>
                    )}
                  </div>

                  <div className="border-t pt-5 border-slate-800/60 space-y-3">
                    <label htmlFor="contactPhone" className="block font-bold text-slate-300">{t.contactPhone}<Req /></label>
                    <div className="flex gap-2">
                      <input
                        id="contactPhone"
                        type="tel"
                        inputMode="tel"
                        name="contactPhone"
                        autoComplete="tel"
                        placeholder="0911223344"
                        value={formData.contactPhone}
                        onChange={handleChange}
                        onBlur={touch}
                        aria-invalid={!!(fieldError('contactPhone'))}
                        className={`flex-1 ${inputCls(fieldError('contactPhone'), true)}`}
                      />
                      <button
                        type="button"
                        disabled={otpBusy || otpVerified || (otpSent && otpSecondsLeft > 0)}
                        onClick={handleSendOtp}
                        className="bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 px-5 rounded-xl text-xs font-bold shrink-0 transition-all disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {otpBusy && !otpCode ? (
                          <>
                            <Clock className="h-3.5 w-3.5 animate-spin" />
                            <span>{m('Sending…', 'በመላክ ላይ…')}</span>
                          </>
                        ) : otpSent && otpSecondsLeft > 0 && !otpVerified ? (
                          <>
                            <Clock className="h-3.5 w-3.5" />
                            <span>{mmss}</span>
                          </>
                        ) : (
                          <span>{otpSent && !otpVerified ? m('Resend code', 'ኮዱን እንደገና ላክ') : t.sendOtp}</span>
                        )}
                      </button>
                    </div>
                    <FieldError msg={fieldError('contactPhone')} />

                    {otpError && !otpVerified && (
                      <p className="text-[11px] font-semibold text-red-400 flex items-start gap-1.5" role="alert">
                        <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" /><span>{otpError}</span>
                      </p>
                    )}

                    {otpSent && !otpVerified && (
                      <div className="p-4 bg-cyan-950/40 border border-cyan-800/80 rounded-xl space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[11px] text-cyan-300 block font-medium">{t.enterOtp}</span>
                          {otpSecondsLeft > 0 ? (
                            <span className="text-[11px] font-mono text-cyan-300">{m('Expires in', 'ጊዜው የሚያልፈው በ')} {mmss}</span>
                          ) : (
                            <span className="text-[11px] font-semibold text-amber-400">{m('Code expired — request a new one.', 'ኮዱ አልፏል — አዲስ ይጠይቁ።')}</span>
                          )}
                        </div>
                        {import.meta.env.DEV && devCode && (
                          <span className="inline-block text-[10px] font-mono font-bold text-amber-300 bg-amber-950/60 border border-amber-700/60 rounded-md px-2 py-0.5">
                            DEV · Dev code: {devCode}
                          </span>
                        )}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                            aria-label={t.enterOtp}
                            className="w-44 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-center text-lg font-mono text-cyan-400 tracking-[0.4em] outline-none focus:border-cyan-400"
                          />
                          <button
                            type="button"
                            disabled={otpBusy || otpCode.length !== 6 || otpSecondsLeft === 0}
                            onClick={handleVerifyOtp}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                          >
                            {t.verifyOtpBtn}
                          </button>
                        </div>
                      </div>
                    )}

                    {otpVerified && (
                      <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{t.verifiedBadge}</span>
                      </div>
                    )}
                    {!otpVerified && <FieldError msg={fieldError('otp')} />}
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => goNext(1)}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-cyan-950"
                  >
                    <span>{t.nextBtn}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className={`p-8 rounded-2xl border space-y-6 shadow-xl ${isDark ? 'bg-[#060b18] border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="border-b pb-3 border-slate-800/80 flex items-center justify-between">
                  <h2 className="text-sm font-extrabold text-cyan-400 uppercase tracking-wider">
                    {t.step2}
                  </h2>
                  <span className="text-[10px] text-slate-500 font-mono">EVIDENCE VAULT ENCRYPTED</span>
                </div>

                <p className="text-[11px] text-slate-500"><span className="text-red-400">*</span> {m('required', 'ያስፈልጋል')}</p>

                <div className="space-y-5 text-xs">
                  <div>
                    <label htmlFor="scamType" className="block font-bold mb-2 text-slate-300">{t.scamType}<Req /></label>
                    <select
                      id="scamType"
                      name="scamType"
                      value={formData.scamType}
                      onChange={handleChange}
                      className={inputCls(false)}
                    >
                      <option>Voice Call / Impersonation (የስልክ ጥሪ/አታላይ ማታለል)</option>
                      <option>Telegram Financial Scam (የቴሌግራም ማጭበርበር)</option>
                      <option>Fake Bank SMS / Impersonation (የሐሰት የባንክ መልእክት)</option>
                      <option>Unauthorized Telebirr/Wallet Transfer (ያልተፈቀደ የቴሌብር/ዎሌት ዝውውር)</option>
                      <option>Phishing Link / Malicious App (የአታላይ ሊንክ/አፕሊኬሽን)</option>
                    </select>
                    <FieldError msg={serverErrors.scamType} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="scammerPhone" className="block font-bold mb-2 text-slate-300 flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-cyan-400" />
                        <span>{t.scammerPhone}<Opt lang={lang} /></span>
                      </label>
                      <input
                        id="scammerPhone"
                        type="text"
                        inputMode="tel"
                        name="scammerPhone"
                        placeholder="e.g. 0911XXXXXX / 0711XXXXXX"
                        value={formData.scammerPhone}
                        onChange={handleChange}
                        onBlur={touch}
                        aria-invalid={!!fieldError('scammerPhone')}
                        className={inputCls(fieldError('scammerPhone'), true)}
                      />
                      <FieldError msg={fieldError('scammerPhone')} />
                    </div>

                    <div>
                      <label htmlFor="transactionId" className="block font-bold mb-2 text-slate-300 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-cyan-400" />
                        <span>{t.transactionId}<Opt lang={lang} /></span>
                      </label>
                      <input
                        id="transactionId"
                        type="text"
                        name="transactionId"
                        maxLength={100}
                        placeholder="e.g. FT260929XXXX / TXN-90812"
                        value={formData.transactionId}
                        onChange={handleChange}
                        className={inputCls(serverErrors.transactionId, true)}
                      />
                      <FieldError msg={serverErrors.transactionId} />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="amount" className="block font-bold mb-2 text-slate-300">{t.amount}<Opt lang={lang} /></label>
                    <input
                      id="amount"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      name="amount"
                      placeholder="e.g. 50000"
                      value={formData.amount}
                      onChange={handleChange}
                      onBlur={touch}
                      aria-invalid={!!fieldError('amount')}
                      className={inputCls(fieldError('amount'), true)}
                    />
                    <FieldError msg={fieldError('amount')} />
                  </div>

                  <div>
                    <label htmlFor="narrative" className="block font-bold mb-2 text-slate-300">{t.narrative}<Opt lang={lang} /></label>
                    <textarea
                      id="narrative"
                      name="narrative"
                      rows={4}
                      maxLength={5000}
                      placeholder="Describe what happened, instructions given by the scammer, messages received, etc."
                      value={formData.narrative}
                      onChange={handleChange}
                      onBlur={touch}
                      className={inputCls(serverErrors.narrative)}
                    />
                    <FieldError msg={serverErrors.narrative} />
                    {touched.narrative && <FieldWarn msg={narrativeWarning} />}
                  </div>

                  {/* Evidence Upload */}
                  <div className="border-t pt-5 border-slate-800/60 space-y-3">
                    <label className="block font-bold text-slate-300">{t.evidence}<Opt lang={lang} /></label>
                    <div className={`border-2 border-dashed rounded-xl p-6 text-center space-y-3 transition-colors ${isDark ? 'border-slate-800 bg-slate-950/40 hover:border-slate-700' : 'border-slate-300 bg-slate-50 hover:border-slate-400'}`}>
                      <Upload className="h-8 w-8 text-cyan-400 mx-auto" />
                      <div className="text-xs text-slate-400">
                        Upload audio recordings, SMS screenshots, or PDF bank slips (Max 10MB)
                      </div>
                      <input
                        type="file"
                        multiple
                        accept="image/*,audio/*,application/pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="evidence-upload"
                      />
                      <label
                        htmlFor="evidence-upload"
                        className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                      >
                        <Mic className="h-3.5 w-3.5" />
                        Select Files
                      </label>
                    </div>

                    {fileError && (
                      <p className="text-red-400 text-xs font-semibold flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{fileError}</span>
                      </p>
                    )}

                    {evidenceFiles.length > 0 && (
                      <div className="space-y-2 pt-2">
                        {evidenceFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-slate-900/80 border border-slate-800 p-2.5 rounded-lg text-xs font-mono">
                            <div className="truncate max-w-xs text-slate-300">
                              <span className="font-bold text-cyan-400">{file.name}</span> ({file.size})
                              <div className="text-[9px] text-slate-500 truncate">SHA256: {file.hash}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(idx)}
                              className="text-red-400 hover:text-red-300 p-1 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-5 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>{t.backBtn}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => goNext(2)}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-cyan-950"
                  >
                    <span>{t.nextBtn}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <form onSubmit={handleSubmit} noValidate className={`p-8 rounded-2xl border space-y-6 shadow-xl ${isDark ? 'bg-[#060b18] border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="border-b pb-3 border-slate-800/80 flex items-center justify-between">
                  <h2 className="text-sm font-extrabold text-cyan-400 uppercase tracking-wider">
                    {t.step3}
                  </h2>
                  <span className="text-[10px] text-slate-500 font-mono">INTERBANK DIRECTIVE PROTOCOL</span>
                </div>

                <p className="text-[11px] text-slate-500"><span className="text-red-400">*</span> {m('required', 'ያስፈልጋል')}</p>

                <div className="space-y-5 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="sourceBank" className="block font-bold mb-2 text-slate-300">{t.sourceBank}</label>
                      <select
                        id="sourceBank"
                        name="sourceBank"
                        value={formData.sourceBank}
                        onChange={handleChange}
                        className={inputCls(false)}
                      >
                        {ethiopianFinancialPlatforms.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="senderAccount" className="block font-bold mb-2 text-slate-300">{t.senderAccount}<Opt lang={lang} /></label>
                      <input
                        id="senderAccount"
                        type="text"
                        name="senderAccount"
                        maxLength={100}
                        placeholder="Victim Phone / Account No."
                        value={formData.senderAccount}
                        onChange={handleChange}
                        className={inputCls(serverErrors.senderAccount, true)}
                      />
                      <FieldError msg={serverErrors.senderAccount} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="targetPlatform" className="block font-bold mb-2 text-slate-300">{t.targetPlatform}</label>
                      <select
                        id="targetPlatform"
                        name="targetPlatform"
                        value={formData.targetPlatform}
                        onChange={handleChange}
                        className={inputCls(false)}
                      >
                        {ethiopianFinancialPlatforms.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="targetAccount" className="block font-bold mb-2 text-slate-300">{t.targetAccount}<Opt lang={lang} /></label>
                      <input
                        id="targetAccount"
                        type="text"
                        name="targetAccount"
                        maxLength={200}
                        placeholder="Suspect Phone / Account No."
                        value={formData.targetAccount}
                        onChange={handleChange}
                        className={inputCls(serverErrors.targetAccount, true)}
                      />
                      <FieldError msg={serverErrors.targetAccount} />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80">
                    <label className={`flex items-start gap-3 cursor-pointer p-4 bg-slate-900/60 border rounded-xl transition-colors ${fieldError('legalDeclaration') ? 'border-red-500 hover:border-red-400' : 'border-slate-800 hover:border-slate-700'}`}>
                      <input
                        type="checkbox"
                        name="legalDeclaration"
                        checked={formData.legalDeclaration}
                        onChange={(e) => { handleChange(e); setTouched((prev) => ({ ...prev, legalDeclaration: true })) }}
                        aria-invalid={!!fieldError('legalDeclaration')}
                        className="mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 h-4 w-4 shrink-0"
                      />
                      <span className="text-[11px] leading-relaxed text-slate-300">{t.legalCheck}<Req /></span>
                    </label>
                    <FieldError msg={fieldError('legalDeclaration')} />
                  </div>
                </div>

                {submitError && (
                  <div className="p-3.5 bg-red-950/40 border border-red-500/50 rounded-xl text-[11px] font-semibold text-red-300 flex items-start gap-2" role="alert">
                    <AlertCircle className="h-4 w-4 shrink-0" /><span>{submitError}</span>
                  </div>
                )}

                {!allValid && !isProcessing && (
                  <div className="p-3 bg-amber-950/30 border border-amber-700/50 rounded-xl text-[11px] text-amber-300 space-y-1">
                    <p className="font-bold">{m('Complete these before you can submit:', 'ከመላክዎ በፊት እነዚህን ያጠናቅቁ፦')}</p>
                    <ul className="list-disc pl-5 space-y-0.5">
                      {[1, 2, 3].filter((n) => STEP_FIELDS[n].some((f) => errors[f])).map((n) => (
                        <li key={n}>
                          {t[`step${n}`]}{' '}
                          {n !== 3 && (
                            <button type="button" onClick={() => { setAttempted((prev) => ({ ...prev, [n]: true })); setStep(n) }} className="underline font-bold hover:text-amber-200">
                              {m('go fix', 'አስተካክል')}
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-5 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>{t.backBtn}</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isProcessing || !allValid}
                    className="bg-red-600 hover:bg-red-500 text-white px-7 py-3 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-lg shadow-red-950 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <>
                        <Clock className="h-4 w-4 animate-spin" />
                        <span>TRANSMITTING DIRECTIVE...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>{t.submitBtn}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 4 */}
            {step === 4 && (
              <div className={`p-10 rounded-2xl border text-center space-y-6 shadow-2xl ${isDark ? 'bg-[#060b18] border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="inline-flex p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 mb-2">
                  <CheckCircle2 className="h-12 w-12" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-base font-extrabold text-emerald-400 tracking-wider uppercase">{t.caseRefHeader}</h2>
                  <p className="text-xs text-slate-400">{t.trackMsg}</p>
                  {submitMessage && <p className="text-[11px] text-slate-500 max-w-md mx-auto">{submitMessage}</p>}
                </div>

                <div className="p-6 bg-slate-950/80 border border-slate-800 rounded-2xl max-w-md mx-auto space-y-2">
                  <div className="text-[10px] font-mono text-slate-500 uppercase">{t.caseRefLabel}</div>
                  <div className="text-2xl font-mono font-black text-cyan-400 tracking-widest selection:bg-cyan-400 selection:text-black">
                    {submittedCaseId}
                  </div>
                </div>

                {uploadFailures.length > 0 && (
                  <div className="max-w-md mx-auto p-3 bg-amber-950/30 border border-amber-700/50 rounded-xl text-[11px] text-amber-300 text-left">
                    {m('Your report was filed, but these files could not be uploaded:', 'ሪፖርትዎ ተልኳል፣ ነገር ግን እነዚህ ፋይሎች አልተጫኑም፦')} {uploadFailures.join(', ')}
                  </div>
                )}

                <div className="flex justify-center gap-4 pt-4">
                  <button
                    onClick={() => {
                      setSearchQuery(submittedCaseId)
                      setActiveTab('track')
                    }}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-cyan-950"
                  >
                    <Search className="h-4 w-4" />
                    <span>{t.navTrack}</span>
                  </button>

                  <button
                    onClick={resetWizard}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-6 py-3 rounded-xl text-xs font-bold transition-all"
                  >
                    File Another Report
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* TRACK VIEW */}
        {activeTab === 'track' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className={`p-8 rounded-2xl border space-y-6 shadow-xl ${isDark ? 'bg-[#060b18] border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="text-center space-y-2">
                <h2 className="text-lg font-extrabold">{t.trackTitle}</h2>
                <p className="text-xs text-slate-400">Query real-time interbank transaction status across INSA Ethio-CERT and partner commercial banks.</p>
              </div>

              <form onSubmit={handleTrackSearch} className="flex gap-2">
                <input
                  type="text"
                  placeholder={t.trackPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`flex-1 rounded-xl p-3.5 border outline-none font-mono text-sm uppercase transition-all ${isDark ? 'bg-[#0a1122] border-slate-700 text-white focus:border-cyan-500' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                />
                <button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-cyan-950 shrink-0"
                >
                  <Search className="h-4 w-4" />
                  <span>{t.trackBtn}</span>
                </button>
              </form>

              {trackingError && (
                <div className="p-3.5 bg-red-950/40 border border-red-800/80 text-red-400 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{trackingError}</span>
                </div>
              )}

              {trackedCase && (
                <div className="border-t pt-6 border-slate-800/80 space-y-4 text-xs font-mono">
                  <div className="flex items-center justify-between p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-xl">
                    <span className="text-slate-400">STATUS:</span>
                    <span className="font-extrabold text-emerald-400 bg-emerald-950 px-3 py-1 rounded border border-emerald-800">{trackedCase.status}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-4 bg-slate-950/80 border border-slate-800 rounded-xl">
                    <div>
                      <span className="text-slate-500 text-[10px] block">CASE REFERENCE</span>
                      <span className="font-bold text-cyan-400">{trackedCase.id}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">TIMESTAMP</span>
                      <span className="text-slate-300">{trackedCase.timestamp}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">ORIGIN BANK</span>
                      <span className="text-slate-300">{trackedCase.source}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">DESTINATION WALLET</span>
                      <span className="text-slate-300">{trackedCase.target}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">AMOUNT FROZEN</span>
                      <span className="text-amber-400 font-bold">{trackedCase.amount}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">ETHSWITCH STATUS</span>
                      <span className="text-emerald-400">{trackedCase.ethswitchGateway}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className={`border-t py-6 text-center text-xs transition-colors ${isDark ? 'bg-[#02050e] border-slate-800 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px]">
          <div>
            FDRE Information Network Security Administration (INSA) © 2026
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Ethio-CERT Hotline: 933</span>
            <span>•</span>
            <span>EthSwitch Switch-Lock API v4.2</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
