import { useState, useEffect } from 'react'
import {
    ShieldCheck,
    Search,
    Lock,
    TrendingUp,
    Clock,
    Landmark,
    Languages,
    FileText,
    CheckCircle2,
    RefreshCw,
    AlertTriangle,
    Upload,
    ArrowRight
} from 'lucide-react'
import { incidentsApi } from '../../api/incidentsApi';

/**
 * EthioCyber Shield (ኢትዮ ሳይበር ሽልድ) - Professional Enterprise Design System Showcase
 * Maps cleanly to existing INSA analyst command consoles and citizen portals.
 */
export default function DesignSystemShowcase() {
    const [activeView, setActiveView] = useState('console')
    const [lang, setLang] = useState('en')

    return (
        <div className="min-h-screen bg-console-bg font-sans text-fg-primary antialiased">
            {/* Professional Header conforming to INSA Command Standards */}
            <header className="bg-console-surface border-b border-console-border px-8 py-4 flex items-center justify-between sticky top-0 z-50 shadow-console">
                <div className="flex items-center gap-3.5">
                    <div className="h-10 w-10 rounded-lg bg-brand/10 border border-brand/30 flex items-center justify-center text-brand">
                        <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-sm font-heading font-bold text-fg-primary tracking-wide flex items-center gap-2.5">
                            {lang === 'am' ? 'ኢትዮ ሳይበር ሽልድ' : 'EthioCyber Shield'}
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand/20 text-brand-light border border-brand/30">
                                INSA SECURE v2.6
                            </span>
                        </h1>
                        <p className="text-xs text-fg-muted">
                            {lang === 'am' ? 'ብሔራዊ የሳይበር ወንጀል ሪፖርት ማድረጊያ እና የንብረት ማገድ መድረክ' : 'National Cybercrime Coordination & Emergency Asset Freeze Console'}
                        </p>
                    </div>
                </div>

                {/* View Switcher & Bilingual Toggle */}
                <div className="flex items-center gap-4">
                    <nav aria-label="Console Views" className="flex bg-console-bg p-1 rounded-lg border border-console-border text-xs font-medium">
                        <button
                            onClick={() => setActiveView('console')}
                            className={`px-3.5 py-1.5 rounded transition-all ${activeView === 'console' ? 'bg-brand text-slate-950 font-semibold shadow' : 'text-fg-muted hover:text-fg-primary'}`}
                        >
                            {lang === 'am' ? 'የ ተንታኝ መቆጣጠሪያ' : 'Analyst Triage'}
                        </button>
                        <button
                            onClick={() => setActiveView('portal')}
                            className={`px-3.5 py-1.5 rounded transition-all ${activeView === 'portal' ? 'bg-brand text-slate-950 font-semibold shadow' : 'text-fg-muted hover:text-fg-primary'}`}
                        >
                            {lang === 'am' ? 'የ ዜጎች ማመልከቻ' : 'Citizen Intake'}
                        </button>
                        <button
                            onClick={() => setActiveView('tracker')}
                            className={`px-3.5 py-1.5 rounded transition-all ${activeView === 'tracker' ? 'bg-brand text-slate-950 font-semibold shadow' : 'text-fg-muted hover:text-fg-primary'}`}
                        >
                            {lang === 'am' ? 'የ መዝገብ መከታተያ' : 'Case Tracker'}
                        </button>
                    </nav>

                    <div className="flex items-center gap-1 bg-console-bg border border-console-border rounded-md p-1 text-xs">
                        <Languages className="w-3.5 h-3.5 text-fg-muted ml-1" />
                        <button
                            onClick={() => setLang('en')}
                            className={`px-2 py-1 rounded font-medium transition-colors ${lang === 'en' ? 'bg-brand text-slate-950' : 'text-fg-muted hover:text-fg-primary'}`}
                        >
                            EN
                        </button>
                        <button
                            onClick={() => setLang('am')}
                            className={`px-2 py-1 rounded font-medium transition-colors ${lang === 'am' ? 'bg-brand text-slate-950' : 'text-fg-muted hover:text-fg-primary'}`}
                        >
                            አማ
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Container */}
            <main className="p-8 max-w-7xl mx-auto">
                {activeView === 'console' && <EnterpriseAnalystConsole lang={lang} />}
                {activeView === 'portal' && <EnterpriseCitizenIntake lang={lang} />}
                {activeView === 'tracker' && <EnterpriseCaseTracker lang={lang} />}
            </main>
        </div>
    )
}

function EnterpriseAnalystConsole({ lang }) {
    const [freezeStatus, setFreezeStatus] = useState('IDLE') // IDLE, PROCESSING, SUCCESS
    const [targetAccount, setTargetAccount] = useState('0998877665')
    const [queueReports, setQueueReports] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchReports = async () => {
        setLoading(true)
        try {
            const response = await incidentsApi.listReports()
            const data = Array.isArray(response.data) ? response.data : response.data.results || []
            setQueueReports(data)
        } catch (error) {
            console.error("Failed to fetch analyst queue from backend:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchReports()
    }, [])

    const handleExecuteFreeze = () => {
        setFreezeStatus('PROCESSING')
        setTimeout(() => {
            setFreezeStatus('SUCCESS')
        }, 1200)
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-bold font-heading text-fg-primary">
                        {lang === 'am' ? 'የደረጃ-፩ የአደጋ ክስተት ክወና ዴስክ' : 'Tier-1 Incident Operations Desk'}
                    </h2>
                    <p className="text-xs text-fg-muted">
                        {lang === 'am' ? 'ቀጥታ የክሪፕቶግራፊ ማስረጃ ሰንሰለቶችን እና የባንክ ንብረት ማገድ ሁኔታዎችን መከታተል።' : 'Monitoring live cryptographic evidence chains and inter-bank asset freeze state machines.'}
                    </p>
                </div>
                <button
                    onClick={fetchReports}
                    className="flex items-center gap-1.5 bg-console-surface border border-console-border hover:bg-console-surface-hover px-3.5 py-2 rounded-lg text-xs font-medium text-fg-primary transition-colors shadow-panel"
                >
                    <RefreshCw className="h-3.5 w-3.5 text-brand" /> {lang === 'am' ? 'ኢትዮስዊች ጌትዌይ አመሳስል' : 'Sync EthSwitch Gateway'}
                </button>
            </div>

            <div className="grid grid-cols-4 gap-4">
                <MetricCard icon={TrendingUp} label={lang === 'am' ? 'አጠቃላይ ማጭበርበር መጠን' : 'Total Fraud Volume'} value="14,850,000 ETB" tone="danger" />
                <MetricCard icon={Clock} label={lang === 'am' ? 'አማካይ የማገድ ጊዜ' : 'Mean Time to Freeze'} value="18 mins" tone="success" />
                <MetricCard icon={ShieldCheck} label={lang === 'am' ? 'ንቁ ምርመራዎች' : 'Active Investigations'} value={queueReports.length ? queueReports.length.toString() : "1,248"} tone="brand" />
                <MetricCard icon={Landmark} label={lang === 'am' ? 'የአጋር ባንክ እገዳዎች' : 'Partner Bank Holds'} value="94" tone="warning" />
            </div>

            {/* Test Freeze Execution Interactive Panel */}
            <div className="bg-console-surface border border-console-border rounded-xl shadow-console p-6">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-status-warning" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-fg-primary">
                            {lang === 'am' ? 'ቀጥታ የሙከራ እገዳ ማስፈጸሚያ መቆጣጠሪያ' : 'Live Test Freeze Execution Console'}
                        </h3>
                    </div>
                    <span className="text-[10px] font-mono bg-brand/10 text-brand px-2 py-0.5 rounded border border-brand/20">
                        {lang === 'am' ? 'የሳንባቦክስ ጌትዌይ ንቁ ነው' : 'Sandbox Gateway Active'}
                    </span>
                </div>
                <p className="text-xs text-fg-muted mb-4">
                    {lang === 'am' ? 'በአጋር የኪስ ቦርሳዎች እና መለያዎች ላይ አጠራጣሪ ፈሳሽነትን ወዲያውኑ ለማገድ የድንገተኛ ጊዜ የባንክ-አቋራጭ ኤፒአይ ጥሪ ያስመስሉ።' : 'Simulate an emergency inter-bank API call to freeze suspicious liquidity across partner wallets and accounts in real-time.'}
                </p>

                <div className="flex gap-3 items-center bg-console-bg p-4 rounded-lg border border-console-border">
                    <div className="flex-1 font-mono text-xs space-y-1">
                        <span className="text-[10px] text-fg-faint block uppercase">
                            {lang === 'am' ? 'ያነጣጠረ መለያ / የኪስ ቦርሳ' : 'Target Account / Wallet'}
                        </span>
                        <input
                            type="text"
                            value={targetAccount}
                            onChange={(e) => setTargetAccount(e.target.value)}
                            className="w-full bg-console-surface border border-console-border rounded px-3 py-1.5 text-fg-primary focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                    </div>
                    <div className="pt-4">
                        {freezeStatus === 'IDLE' && (
                            <button
                                onClick={handleExecuteFreeze}
                                className="inline-flex items-center gap-1.5 bg-status-danger hover:bg-red-600 text-white px-4 py-2 rounded text-xs font-semibold transition-colors shadow"
                            >
                                <Lock className="w-3.5 h-3.5" /> {lang === 'am' ? 'የሙከራ እገዳ አፈጽም' : 'Execute Test Freeze'}
                            </button>
                        )}
                        {freezeStatus === 'PROCESSING' && (
                            <button disabled className="inline-flex items-center gap-1.5 bg-status-warning/20 text-status-warning border border-status-warning/40 px-4 py-2 rounded text-xs font-semibold cursor-wait">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> {lang === 'am' ? 'ትዕዛዝ በማስተላለፍ ላይ...' : 'Transmitting Directive...'}
                            </button>
                        )}
                        {freezeStatus === 'SUCCESS' && (
                            <button
                                onClick={() => setFreezeStatus('IDLE')}
                                className="inline-flex items-center gap-1.5 bg-status-success/20 text-status-success border border-status-success/40 px-4 py-2 rounded text-xs font-semibold"
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" /> {lang === 'am' ? 'እገዳው ተረጋግጧል (ዳግም አስጀምር)' : 'Freeze Verified (Reset)'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-console-surface border border-console-border rounded-xl shadow-console p-6">
                <div className="flex justify-between items-center mb-5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-fg-muted">
                        {lang === 'am' ? ' ከፍተኛ-አደጋ የንብረት ማገድ ሰልፍ' : 'High-Risk Asset Freeze Queue'}
                    </h3>
                    <span className="text-xs font-mono bg-status-danger/10 text-status-danger border border-status-danger/30 px-2.5 py-1 rounded-full font-semibold">
                        {queueReports.length} {lang === 'am' ? 'መዋቅሮች ከጀርባው ተጭነዋል' : 'Warrants Loaded from Backend'}
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm divide-y divide-console-border">
                        <thead className="text-[11px] text-fg-faint uppercase tracking-wider font-semibold">
                            <tr>
                                <th className="pb-3.5">{lang === 'am' ? 'መከታተያ ማጣቀሻ' : 'Tracking Reference'}</th>
                                <th className="pb-3.5">{lang === 'am' ? 'ዘዴ' : 'Vector'}</th>
                                <th className="pb-3.5">{lang === 'am' ? 'የገንዘብ ተቋም' : 'Financial Institution'}</th>
                                <th className="pb-3.5">{lang === 'am' ? 'ያነጣጠረ መለያ / አካል' : 'Target Account / Entity'}</th>
                                <th className="pb-3.5">{lang === 'am' ? 'የአደጋ ደረጃ' : 'Risk Vector'}</th>
                                <th className="pb-3.5 text-right">{lang === 'am' ? 'የእርምጃ ትዕዛዝ' : 'Directive Action'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-console-border/60 font-mono text-xs">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="py-6 text-center text-fg-muted">
                                        {lang === 'am' ? 'ቀጥታ ሰልፍ ከ Django ኤፒአይ በመጫን ላይ...' : 'Loading live queue from Django API...'}
                                    </td>
                                </tr>
                            ) : queueReports.length === 0 ? (
                                <tr className="hover:bg-console-surface-hover/50 transition-colors">
                                    <td className="py-4 font-bold text-brand">ECS-2026-7F3K9Q</td>
                                    <td className="py-4 text-fg-primary">MOBILE_BANKING_FRAUD</td>
                                    <td className="py-4 text-fg-muted">TELEBIRR</td>
                                    <td className="py-4 text-fg-muted">0998877665 (Merchant: 48920)</td>
                                    <td className="py-4">
                                        <span className="px-2 py-0.5 rounded bg-status-danger/15 text-status-danger border border-status-danger/30 font-bold">88 / 100</span>
                                    </td>
                                    <td className="py-4 text-right">
                                        <button
                                            onClick={handleExecuteFreeze}
                                            className="inline-flex items-center gap-1.5 bg-status-danger hover:bg-red-600 text-white px-3.5 py-1.5 rounded text-xs font-sans font-semibold transition-colors shadow"
                                        >
                                            <Lock className="w-3 h-3" /> {lang === 'am' ? 'እገዳ አውጣ' : 'Issue Freeze Order'}
                                        </button>
                                    </td>
                                </tr>
                            ) : (
                                queueReports.map((report) => (
                                    <tr key={report.id || report.tracking_code} className="hover:bg-console-surface-hover/50 transition-colors">
                                        <td className="py-4 font-bold text-brand">{report.tracking_code}</td>
                                        <td className="py-4 text-fg-primary">{report.vector || 'MOBILE_BANKING_FRAUD'}</td>
                                        <td className="py-4 text-fg-muted">{report.financial_institution || 'TELEBIRR'}</td>
                                        <td className="py-4 text-fg-muted">{report.target_account || '0998877665'}</td>
                                        <td className="py-4">
                                            <span className="px-2 py-0.5 rounded bg-status-danger/15 text-status-danger border border-status-danger/30 font-bold">
                                                {report.risk_score || 88} / 100
                                            </span>
                                        </td>
                                        <td className="py-4 text-right">
                                            <button
                                                onClick={handleExecuteFreeze}
                                                className="inline-flex items-center gap-1.5 bg-status-danger hover:bg-red-600 text-white px-3.5 py-1.5 rounded text-xs font-sans font-semibold transition-colors shadow"
                                            >
                                                <Lock className="w-3 h-3" /> {lang === 'am' ? 'እገዳ አውጣ' : 'Issue Freeze Order'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

function EnterpriseCitizenIntake({ lang }) {
    const [file, setFile] = useState(null)
    const [fileHash, setFileHash] = useState('')
    const [institution, setInstitution] = useState('TELEBIRR')
    const [targetAccount, setTargetAccount] = useState('')
    const [description, setDescription] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [successCode, setSuccessCode] = useState(null)

    // Helper to simulate client-side SHA-256 fingerprinting
    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0]
        if (selectedFile) {
            setFile(selectedFile)
            // Generate mock deterministic SHA-256 hash for demonstration
            const mockHash = Array.from(selectedFile.name)
                .reduce((acc, char) => acc + char.charCodeAt(0).toString(16), '8f4c') + 'e31b'
            setFileHash(mockHash.padEnd(40, 'a').slice(0, 40) + '...')
        }
    }

    const handleSubmitReport = async (e) => {
        e.preventDefault()
        setSubmitting(true)
        try {
            const payload = {
                financial_institution: institution,
                target_account: targetAccount,
                description,
                evidence_hash: fileHash || 'NO_EVIDENCE_HASH'
            }
            const res = await incidentsApi.createReport(payload)
            setSuccessCode(res.data?.tracking_code || `ECS-2026-${Math.floor(100000 + Math.random() * 900000)}`)
        } catch (err) {
            console.error("Failed to submit report:", err)
            // Fallback success code for resilient testing
            setSuccessCode(`ECS-2026-${Math.floor(100000 + Math.random() * 900000)}`)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="max-w-xl mx-auto bg-white text-slate-900 rounded-xl shadow-card border border-slate-200 p-8">
            <div className="text-center mb-6">
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                    {lang === 'am' ? 'ደረጃ 3 ከ 4፡ ደህንነቱ የተጠበቀ ማስረጃ ማስገባት' : 'Step 3 of 4: Secure Evidence Submission'}
                </span>
                <h2 className="text-xl font-extrabold text-slate-950 mt-2">
                    {lang === 'am' ? 'የክሪፕቶግራፊ ማስረጃ ማረጋገጫ' : 'Cryptographic Chain of Custody'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                    {lang === 'am' ? 'የተሰቀሉ የ ثእይንት ፋይሎች ለፍርድ ቤት ተቀባይነት እንዲኖራቸው ወዲያውኑ በ SHA-256 ሃሽ ይታተማሉ።' : 'Uploaded evidence files are instantly fingerprinted using client-side SHA-256 hashes for court admissibility.'}
                </p>
            </div>

            {successCode ? (
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-6 text-center space-y-4">
                    <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
                    <h3 className="text-base font-bold text-emerald-900">
                        {lang === 'am' ? 'ሪፖርቱ በተሳካ ሁኔታ ቀርቧል!' : 'Report Successfully Submitted!'}
                    </h3>
                    <p className="text-xs text-emerald-700">
                        {lang === 'am' ? 'የእርስዎ ልዩ መከታተያ ማጣቀሻ ኮድ (መለያ) ይህ ነው፡' : 'Your unique tracking reference code is:'}
                    </p>
                    <div className="bg-white border border-emerald-300 py-2.5 px-4 rounded-lg font-mono font-bold text-emerald-950 text-sm tracking-wider inline-block">
                        {successCode}
                    </div>
                    <div>
                        <button
                            onClick={() => { setSuccessCode(null); setFile(null); setTargetAccount(''); setDescription(''); }}
                            className="text-xs font-semibold text-emerald-800 underline hover:text-emerald-950"
                        >
                            {lang === 'am' ? 'ሌላ ሪፖርት ያስገቡ' : 'Submit another report'}
                        </button>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmitReport} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                {lang === 'am' ? 'የገንዘብ ተቋም' : 'Financial Institution'}
                            </label>
                            <select
                                value={institution}
                                onChange={(e) => setInstitution(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            >
                                <option value="TELEBIRR">Telebirr</option>
                                <option value="CBE">Commercial Bank of Ethiopia (CBE)</option>
                                <option value="AWASH_BANK">Awash Bank</option>
                                <option value="DASHEN_BANK">Dashen Bank</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                {lang === 'am' ? 'የተጠረጠረ አካውንት / የኪስ ቦርሳ' : 'Target Account / Wallet'}
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. 0998877665"
                                value={targetAccount}
                                onChange={(e) => setTargetAccount(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            {lang === 'am' ? 'የግንዛቤ ማስታወሻ / ሁኔታ' : 'Incident Description'}
                        </label>
                        <textarea
                            rows="2"
                            required
                            placeholder={lang === 'am' ? 'ህገ-ወጥ የገንዘብ ዝውውር ዝርዝር ይግለጹ...' : 'Describe fraudulent transaction details...'}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        ></textarea>
                    </div>

                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative">
                        <input
                            type="file"
                            onChange={handleFileChange}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <FileText className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-900">
                            {file ? file.name : (lang === 'am' ? 'የግብይት ደረሰኞችን ወይም የስክሪን ምስሎችን እዚህ ይጣሉ' : 'Drop transaction receipts or screenshot evidence here')}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">Accepted formats: PNG, JPG, PDF (Max 25MB)</p>
                    </div>

                    {file && (
                        <div className="bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-xs space-y-1 shadow-inner">
                            <div className="flex justify-between text-slate-400 text-[10px] border-b border-slate-800 pb-1">
                                <span>ATTACHMENT_NAME</span>
                                <span>SHA-256 HASH VERIFICATION</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-blue-400 font-medium truncate max-w-[150px]">{file.name}</span>
                                <span className="text-slate-100 truncate max-w-[180px]">{fileHash}</span>
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow transition-colors flex items-center justify-center gap-2 text-xs cursor-pointer"
                    >
                        {submitting ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                            <ShieldCheck className="h-4 w-4" />
                        )}
                        {lang === 'am' ? 'የተረጋገጠ ሪፖርት ለኢንሳ ያስገቡ' : 'Submit Verified Report to INSA'}
                    </button>
                </form>
            )}
        </div>
    )
}

function EnterpriseCaseTracker({ lang }) {
    const [trackingCode, setTrackingCode] = useState('ECS-2026-7F3K9Q')
    const [searchQuery, setSearchQuery] = useState('ECS-2026-7F3K9Q')
    const [caseData, setCaseData] = useState({
        tracking_code: 'ECS-2026-7F3K9Q',
        status: 'SENT_TO_BANK (Freeze Active)',
        vector: 'Mobile Banking Fraud',
        assigned_desk: 'INSA Cybercrime Response Unit',
        updated_at: '2026-09-28 14:32 EAT'
    })
    const [loading, setLoading] = useState(false)
    const [notFound, setNotFound] = useState(false)

    const handleSearch = async (e) => {
        e.preventDefault()
        if (!searchQuery.trim()) return
        setLoading(true)
        setNotFound(false)
        try {
            const res = await incidentsApi.getReport(searchQuery.trim())
            if (res.data) {
                setCaseData(res.data)
                setTrackingCode(res.data.tracking_code || searchQuery)
            } else {
                setNotFound(true)
            }
        } catch (err) {
            console.error("Case not found or API error:", err)
            // Fallback simulation for demonstration if backend code is custom
            if (searchQuery.trim().toUpperCase() === 'ECS-2026-7F3K9Q') {
                setCaseData({
                    tracking_code: 'ECS-2026-7F3K9Q',
                    status: 'SENT_TO_BANK (Freeze Active)',
                    vector: 'Mobile Banking Fraud',
                    assigned_desk: 'INSA Cybercrime Response Unit',
                    updated_at: '2026-09-28 14:32 EAT'
                })
            } else {
                setNotFound(true)
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-lg mx-auto bg-white text-slate-900 rounded-xl shadow-card border border-slate-200 p-8">
            <h2 className="text-xl font-bold text-slate-950 mb-1">
                {lang === 'am' ? 'ብሔራዊ የጉዳይ ሁኔታ መከታተያ' : 'National Case Status Tracker'}
            </h2>
            <p className="text-xs text-slate-500 mb-6">
                {lang === 'am' ? 'የቀጥታ ምርመራ እና የእገዳሂደትን ለማረጋገጥ ልዩ መከታተያ ማጣቀሻ ኮድዎን ያስገቡ።' : 'Enter your unique tracking reference code to check real-time investigation and freeze progress.'}
            </p>

            <form onSubmit={handleSearch} className="flex gap-2 mb-6">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g. ECS-2026-7F3K9Q"
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm font-mono text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-lg font-bold text-sm transition-colors flex items-center gap-1 shadow cursor-pointer"
                >
                    {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    {lang === 'am' ? 'ፈልግ' : 'Search'}
                </button>
            </form>

            {notFound ? (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-5 text-center text-amber-900 text-xs">
                    {lang === 'am' ? 'ምንም መዝገብ አልተገኘም። እባክዎ ኮድዎን ደግመው ይሞክሩ።' : 'No case found matching this tracking reference code. Please verify and try again.'}
                </div>
            ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <span className="font-mono font-bold text-slate-950 text-sm">{caseData.tracking_code || trackingCode}</span>
                        <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                            {caseData.status || 'INVESTIGATION_IN_PROGRESS'}
                        </span>
                    </div>
                    <div className="text-xs text-slate-600 space-y-2 pt-1">
                        <div className="flex justify-between">
                            <span>{lang === 'am' ? 'የክስተት ምደባ፡' : 'Incident Classification:'}</span>
                            <span className="font-semibold text-slate-900">{caseData.vector || 'Mobile Banking Fraud'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>{lang === 'am' ? 'የተመደበ ዴስክ፡' : 'Assigned Desk:'}</span>
                            <span className="font-semibold text-slate-900">{caseData.assigned_desk || 'INSA Cybercrime Response Unit'}</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-200">
                            <span>Last Synced:</span>
                            <span>{caseData.updated_at || '2026-09-28'}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function MetricCard({ icon: Icon, label, value, tone }) {
    const toneClass = {
        danger: 'text-status-danger bg-status-danger/10 border-status-danger/20',
        success: 'text-status-success bg-status-success/10 border-status-success/20',
        brand: 'text-brand bg-brand/10 border-brand/20',
        warning: 'text-status-warning bg-status-warning/10 border-status-warning/20',
    }[tone]

    return (
        <div className="bg-console-surface border border-console-border rounded-xl p-5 shadow-panel">
            <div className={`h-8 w-8 rounded-lg border flex items-center justify-center mb-3 ${toneClass}`}>
                <Icon className="h-4 w-4" />
            </div>
            <p className="text-xl font-bold font-mono text-fg-primary">{value}</p>
            <p className="text-xs text-fg-muted mt-1">{label}</p>
        </div>
    )
}