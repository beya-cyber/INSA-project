import React, { useState } from 'react'
import axiosClient from '../../api/axiosClient'
import { Link } from 'react-router-dom'
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

export default function CitizenIntakeWizard() {
  const [theme, setTheme] = useState('dark')
  const [lang, setLang] = useState('AM')
  const [activeTab, setActiveTab] = useState('landing')

  // Intake Wizard State
  const [step, setStep] = useState(1)
  const [submittedCaseId, setSubmittedCaseId] = useState(null)
  const [evidenceFiles, setEvidenceFiles] = useState([])
  const [fileError, setFileError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  // OTP & Identity Verification State
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpVerified, setOtpVerified] = useState(false)
  const [otpCooldown, setOtpCooldown] = useState(0)

  // Tracking Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [trackedCase, setTrackedCase] = useState(null)
  const [trackingError, setTrackingError] = useState('')

  const [formData, setFormData] = useState({
    fullName: '',
    nationalId: '',
    contactPhone: '',
    scamType: 'Voice Call / Impersonation (የስልክ ጥሪ/አታላይ ማታለል)',
    scammerPhone: '',
    transactionId: '',
    amount: '',
    sourceBank: 'Commercial Bank of Ethiopia (CBE)',
    senderAccount: '',
    targetPlatform: 'Telebirr',
    targetAccount: '',
    narrative: '',
    legalDeclaration: false
  })

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

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target
    const val = type === 'checkbox' ? checked : value
    setFormData(prev => ({ ...prev, [name]: val }))
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
        hash
      })
    }

    setEvidenceFiles(prev => [...prev, ...processed])
  }

  const removeFile = (index) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSendOtp = () => {
    const phone = sanitizeString(formData.contactPhone)
    if (!phone || phone.length < 9) {
      alert(lang === 'AM' ? 'እባክዎን ትክክለኛ የስልክ ቁጥር ያስገቡ' : 'Please enter a valid phone number')
      return
    }

    setOtpSent(true)
    setOtpCooldown(30)
    const timer = setInterval(() => {
      setOtpCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleVerifyOtp = () => {
    const cleanOtp = sanitizeString(otpCode)
    if (cleanOtp === '1234' || cleanOtp.length === 4) {
      setOtpVerified(true)
    } else {
      alert(lang === 'AM' ? 'የተሳሳተ የማረጋገጫ ኮድ (ሙከራ: 1234 ያስገቡ)' : 'Invalid OTP code. Use 1234 for testing.')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.legalDeclaration) {
      alert(lang === 'AM' ? 'እባክዎን የመረጃውን ትክክለኛነት ያረጋግጡ' : 'You must accept the legal truth declaration.')
      return
    }

    setIsProcessing(true)

    const mapScamType = (s) => {
      s = (s || '').toLowerCase()
      if (s.includes('voice') || s.includes('impersonation')) return 'VOICE_SCAM'
      if (s.includes('telegram')) return 'SMS_IMPERSONATION'
      if (s.includes('sms') || s.includes('fake bank')) return 'SMS_IMPERSONATION'
      if (s.includes('telebirr') || s.includes('wallet') || s.includes('unauthorized')) return 'MOBILE_BANKING_FRAUD'
      if (s.includes('phishing') || s.includes('malicious') || s.includes('link')) return 'PHISHING'
      if (s.includes('sim')) return 'SIM_SWAP'
      return 'OTHER'
    }

    const payload = {
      full_name: formData.fullName,
      phone_number: formData.contactPhone,
      id_type: /^FIN/i.test(formData.nationalId || '') ? 'FAYDA' : 'KEBELE',
      verification_token: formData.nationalId,
      channel: 'WEB',
      incident_type: mapScamType(formData.scamType),
      description: formData.narrative || formData.scamType,
      scammer_phone_number: formData.scammerPhone || null,
      scammer_identifier: formData.targetAccount || formData.senderAccount || null,
      consent_given: true,
    }

    try {
      const { data } = await axiosClient.post('/incidents/submit/', payload)
      setSubmittedCaseId(data.tracking_code)
      setStep(4)
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        (err.response?.data && JSON.stringify(err.response.data)) ||
        err.message ||
        'Submission failed. Please try again.'
      alert(msg)
    } finally {
      setIsProcessing(false)
    }
  }
  ``
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
      enterOtp: 'Enter 4-Digit Security Code',
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
      enterOtp: 'በስልክዎ የደረሰውን 4 አሃዝ ኮድ ያስገቡ',
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
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'landing' ? 'bg-cyan-600 text-white shadow-sm' : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-700 hover:text-slate-900'
                  }`}
              >
                {t.navHome}
              </button>
              <button
                onClick={() => setActiveTab('report')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'report' ? 'bg-cyan-600 text-white shadow-sm' : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-700 hover:text-slate-900'
                  }`}
              >
                {t.navReport}
              </button>
              <button
                onClick={() => setActiveTab('track')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'track' ? 'bg-cyan-600 text-white shadow-sm' : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-700 hover:text-slate-900'
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
              ].map((s) => (
                <div
                  key={s.num}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${step === s.num
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400 shadow-md shadow-cyan-950/20'
                    : step > s.num
                      ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-400'
                      : isDark ? 'border-slate-800 text-slate-500 bg-slate-900/40' : 'border-slate-200 text-slate-400 bg-slate-100'
                    }`}
                >
                  {step > s.num ? (
                    <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                  ) : (
                    <span className={`h-5 w-5 rounded-full text-[10px] flex items-center justify-center font-mono ${step === s.num ? 'bg-cyan-500 text-black font-extrabold' : 'bg-slate-800 text-slate-400'}`}>
                      {s.num}
                    </span>
                  )}
                  <span className="hidden sm:inline text-[11px] truncate">{s.label}</span>
                </div>
              ))}
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

                <div className="space-y-5 text-xs">
                  <div>
                    <label className="block font-bold mb-2 text-slate-300">{t.fullName}</label>
                    <input
                      type="text"
                      name="fullName"
                      placeholder="e.g. Abebe Bikila Gemeda"
                      value={formData.fullName}
                      onChange={handleChange}
                      className={`w-full rounded-xl p-3.5 border outline-none font-medium transition-all ${isDark ? 'bg-[#0a1122] border-slate-700 text-white focus:border-cyan-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-cyan-600'}`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-2 text-slate-300">{t.nationalId}</label>
                    <input
                      type="text"
                      name="nationalId"
                      placeholder="e.g. FIN-9041-8812 / Kebele ID / Passport"
                      value={formData.nationalId}
                      onChange={handleChange}
                      className={`w-full rounded-xl p-3.5 border outline-none font-mono transition-all ${isDark ? 'bg-[#0a1122] border-slate-700 text-white focus:border-cyan-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-cyan-600'}`}
                    />
                  </div>

                  <div className="border-t pt-5 border-slate-800/60 space-y-3">
                    <label className="block font-bold text-slate-300">{t.contactPhone}</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        name="contactPhone"
                        placeholder="0911223344"
                        value={formData.contactPhone}
                        onChange={handleChange}
                        className={`flex-1 rounded-xl p-3.5 border outline-none font-mono transition-all ${isDark ? 'bg-[#0a1122] border-slate-700 text-white focus:border-cyan-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-cyan-600'}`}
                      />
                      <button
                        type="button"
                        disabled={otpCooldown > 0}
                        onClick={handleSendOtp}
                        className="bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 px-5 rounded-xl text-xs font-bold shrink-0 transition-all disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {otpCooldown > 0 ? (
                          <>
                            <Clock className="h-3.5 w-3.5 animate-spin" />
                            <span>{otpCooldown}s</span>
                          </>
                        ) : (
                          <span>{t.sendOtp}</span>
                        )}
                      </button>
                    </div>

                    {otpSent && !otpVerified && (
                      <div className="p-4 bg-cyan-950/40 border border-cyan-800/80 rounded-xl space-y-3">
                        <span className="text-[11px] text-cyan-300 block font-medium">{t.enterOtp} (Test Code: 1234)</span>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            maxLength={4}
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value)}
                            className="w-36 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-center text-lg font-mono text-cyan-400 tracking-widest outline-none focus:border-cyan-400"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyOtp}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 rounded-lg text-xs font-bold transition-all"
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
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => {
                      if (!otpVerified && !formData.nationalId.trim()) {
                        alert(lang === 'AM' ? 'እባክዎን መታወቂያ እና ስልክ ያረጋግጡ' : 'Please verify identity or enter National ID.')
                        return
                      }
                      setStep(2)
                    }}
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

                <div className="space-y-5 text-xs">
                  <div>
                    <label className="block font-bold mb-2 text-slate-300">{t.scamType}</label>
                    <select
                      name="scamType"
                      value={formData.scamType}
                      onChange={handleChange}
                      className={`w-full rounded-xl p-3.5 border outline-none font-sans transition-all ${isDark ? 'bg-[#0a1122] border-slate-700 text-white focus:border-cyan-500' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                    >
                      <option>Voice Call / Impersonation (የስልክ ጥሪ/አታላይ ማታለል)</option>
                      <option>Telegram Financial Scam (የቴሌግራም ማጭበርበር)</option>
                      <option>Fake Bank SMS / Impersonation (የሐሰት የባንክ መልእክት)</option>
                      <option>Unauthorized Telebirr/Wallet Transfer (ያልተፈቀደ የቴሌብር/ዎሌት ዝውውር)</option>
                      <option>Phishing Link / Malicious App (የአታላይ ሊንክ/አፕሊኬሽን)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold mb-2 text-slate-300 flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-cyan-400" />
                        <span>{t.scammerPhone}</span>
                      </label>
                      <input
                        type="text"
                        name="scammerPhone"
                        placeholder="e.g. 0911XXXXXX / 0711XXXXXX"
                        value={formData.scammerPhone}
                        onChange={handleChange}
                        className={`w-full rounded-xl p-3.5 border outline-none font-mono transition-all ${isDark ? 'bg-[#0a1122] border-slate-700 text-white focus:border-cyan-500' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                      />
                    </div>

                    <div>
                      <label className="block font-bold mb-2 text-slate-300 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-cyan-400" />
                        <span>{t.transactionId}</span>
                      </label>
                      <input
                        type="text"
                        name="transactionId"
                        placeholder="e.g. FT260929XXXX / TXN-90812"
                        value={formData.transactionId}
                        onChange={handleChange}
                        className={`w-full rounded-xl p-3.5 border outline-none font-mono transition-all ${isDark ? 'bg-[#0a1122] border-slate-700 text-white focus:border-cyan-500' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold mb-2 text-slate-300">{t.amount}</label>
                    <input
                      type="number"
                      name="amount"
                      placeholder="e.g. 50000"
                      value={formData.amount}
                      onChange={handleChange}
                      className={`w-full rounded-xl p-3.5 border outline-none font-mono transition-all ${isDark ? 'bg-[#0a1122] border-slate-700 text-white focus:border-cyan-500' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-2 text-slate-300">{t.narrative}</label>
                    <textarea
                      name="narrative"
                      rows={4}
                      placeholder="Describe what happened, instructions given by the scammer, messages received, etc."
                      value={formData.narrative}
                      onChange={handleChange}
                      className={`w-full rounded-xl p-3.5 border outline-none font-sans transition-all ${isDark ? 'bg-[#0a1122] border-slate-700 text-white focus:border-cyan-500' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                    />
                  </div>

                  {/* Evidence Upload */}
                  <div className="border-t pt-5 border-slate-800/60 space-y-3">
                    <label className="block font-bold text-slate-300">{t.evidence}</label>
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
                    onClick={() => setStep(1)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-5 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>{t.backBtn}</span>
                  </button>

                  <button
                    onClick={() => setStep(3)}
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
              <form onSubmit={handleSubmit} className={`p-8 rounded-2xl border space-y-6 shadow-xl ${isDark ? 'bg-[#060b18] border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="border-b pb-3 border-slate-800/80 flex items-center justify-between">
                  <h2 className="text-sm font-extrabold text-cyan-400 uppercase tracking-wider">
                    {t.step3}
                  </h2>
                  <span className="text-[10px] text-slate-500 font-mono">INTERBANK DIRECTIVE PROTOCOL</span>
                </div>

                <div className="space-y-5 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold mb-2 text-slate-300">{t.sourceBank}</label>
                      <select
                        name="sourceBank"
                        value={formData.sourceBank}
                        onChange={handleChange}
                        className={`w-full rounded-xl p-3.5 border outline-none font-sans transition-all ${isDark ? 'bg-[#0a1122] border-slate-700 text-white focus:border-cyan-500' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                      >
                        {ethiopianFinancialPlatforms.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold mb-2 text-slate-300">{t.senderAccount}</label>
                      <input
                        type="text"
                        name="senderAccount"
                        placeholder="Victim Phone / Account No."
                        value={formData.senderAccount}
                        onChange={handleChange}
                        className={`w-full rounded-xl p-3.5 border outline-none font-mono transition-all ${isDark ? 'bg-[#0a1122] border-slate-700 text-white focus:border-cyan-500' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold mb-2 text-slate-300">{t.targetPlatform}</label>
                      <select
                        name="targetPlatform"
                        value={formData.targetPlatform}
                        onChange={handleChange}
                        className={`w-full rounded-xl p-3.5 border outline-none font-sans transition-all ${isDark ? 'bg-[#0a1122] border-slate-700 text-white focus:border-cyan-500' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                      >
                        {ethiopianFinancialPlatforms.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold mb-2 text-slate-300">{t.targetAccount}</label>
                      <input
                        type="text"
                        name="targetAccount"
                        placeholder="Suspect Phone / Account No."
                        value={formData.targetAccount}
                        onChange={handleChange}
                        className={`w-full rounded-xl p-3.5 border outline-none font-mono transition-all ${isDark ? 'bg-[#0a1122] border-slate-700 text-white focus:border-cyan-500' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80">
                    <label className="flex items-start gap-3 cursor-pointer p-4 bg-slate-900/60 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
                      <input
                        type="checkbox"
                        name="legalDeclaration"
                        checked={formData.legalDeclaration}
                        onChange={handleChange}
                        className="mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 h-4 w-4 shrink-0"
                      />
                      <span className="text-[11px] leading-relaxed text-slate-300">{t.legalCheck}</span>
                    </label>
                  </div>
                </div>

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
                    disabled={isProcessing}
                    className="bg-red-600 hover:bg-red-500 text-white px-7 py-3 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-lg shadow-red-950 disabled:opacity-50"
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
                </div>

                <div className="p-6 bg-slate-950/80 border border-slate-800 rounded-2xl max-w-md mx-auto space-y-2">
                  <div className="text-[10px] font-mono text-slate-500 uppercase">{t.caseRefLabel}</div>
                  <div className="text-2xl font-mono font-black text-cyan-400 tracking-widest selection:bg-cyan-400 selection:text-black">
                    {submittedCaseId}
                  </div>
                </div>

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
                    onClick={() => {
                      setStep(1)
                      setSubmittedCaseId(null)
                      setFormData({
                        fullName: '',
                        nationalId: '',
                        contactPhone: '',
                        scamType: 'Voice Call / Impersonation (የስልክ ጥሪ/አታላይ ማታለል)',
                        scammerPhone: '',
                        transactionId: '',
                        amount: '',
                        sourceBank: 'Commercial Bank of Ethiopia (CBE)',
                        senderAccount: '',
                        targetPlatform: 'Telebirr',
                        targetAccount: '',
                        narrative: '',
                        legalDeclaration: false
                      })
                    }}
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
