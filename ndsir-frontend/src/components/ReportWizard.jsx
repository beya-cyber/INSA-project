import React, { useState } from 'react';
import {
    ShieldAlert, PhoneCall, MessageSquare, Globe,
    Share2, ArrowRight, ArrowLeft, Upload, CheckCircle2, AlertCircle,
    Activity, ShieldCheck, Lock, FileText, Server
} from 'lucide-react';
import { translations } from '../locales/translations';
import insaLogo from '../assets/insa_logo.png';

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8000';

export default function ReportWizard() {
    const [lang, setLang] = useState('en');
    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [response, setResponse] = useState(null);
    const [error, setError] = useState(null);
    const [logoError, setLogoError] = useState(false);

    const t = translations[lang] || translations.en;

    const [formData, setFormData] = useState({
        scamCategory: 'PHISHING_LINK',
        reporterPhone: '',
        scammerPhone: '',
        targetProvider: 'TELEBIRR',
        transactionReference: '',
        description: '',
        file: null,
    });

    const categories = [
        { id: 'VOICE_SCAM', label: t.voiceScam, icon: PhoneCall, desc: t.voiceDesc },
        { id: 'SMS_IMPERSONATION', label: t.smsScam, icon: MessageSquare, desc: t.smsDesc },
        { id: 'PHISHING_LINK', label: t.phishingLink, icon: Globe, desc: t.phishingDesc },
        { id: 'SOCIAL_MEDIA', label: t.socialFraud, icon: Share2, desc: t.socialDesc },
    ];

    const handleSubmit = async () => {
        setSubmitting(true);
        setError(null);

        // Construct FormData matching FastAPI endpoint parameters
        const payload = new FormData();
        payload.append('scam_category', formData.scamCategory || 'PHISHING_LINK');
        payload.append('reporter_phone', formData.reporterPhone || '');

        if (formData.scammerPhone) {
            payload.append('scammer_phone', formData.scammerPhone);
        }
        if (formData.targetProvider) {
            payload.append('target_provider', formData.targetProvider);
        }
        if (formData.transactionReference) {
            payload.append('transaction_reference', formData.transactionReference);
        }
        if (formData.description) {
            payload.append('description', formData.description);
        }
        if (formData.file) {
            payload.append('file', formData.file);
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/incidents/submit`, {
                method: 'POST',
                body: payload,
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => null);

                // Format FastAPI validation array/object errors into readable text
                let formattedError = `Server error (${res.status})`;
                if (errData?.detail) {
                    if (Array.isArray(errData.detail)) {
                        formattedError = errData.detail
                            .map((err) => {
                                const field = err.loc?.[err.loc.length - 1] || 'Field';
                                return `${field}: ${err.msg}`;
                            })
                            .join(' | ');
                    } else if (typeof errData.detail === 'string') {
                        formattedError = errData.detail;
                    } else {
                        formattedError = JSON.stringify(errData.detail);
                    }
                }
                throw new Error(formattedError);
            }

            const data = await res.json();
            setResponse(data);
            setStep(4);
        } catch (err) {
            setError(err.message || 'Failed to connect to triage gateway.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 lg:p-8 font-sans relative overflow-hidden">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-5xl bg-slate-900/80 backdrop-blur-2xl border border-slate-800 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10">

                {/* Left Sidebar Status Panel */}
                <div className="lg:col-span-4 bg-slate-950/70 p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-slate-800/80 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3.5 mb-6">
                            <div className="p-1.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg">
                                {!logoError ? (
                                    <img
                                        src={insaLogo}
                                        alt="INSA Logo"
                                        className="w-10 h-10 object-contain"
                                        onError={() => setLogoError(true)}
                                    />
                                ) : (
                                    <ShieldAlert className="w-10 h-10 text-blue-500" />
                                )}
                            </div>
                            <div>
                                <h1 className="text-lg font-bold tracking-tight text-white leading-tight">{t.portalTitle}</h1>
                                <p className="text-[11px] font-medium text-slate-400">{t.subtitle}</p>
                            </div>
                        </div>

                        <div className="space-y-3 mb-8">
                            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs text-slate-300">
                                    <Server className="w-4 h-4 text-emerald-400" /> Gateway Status
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md">
                                    Active
                                </span>
                            </div>

                            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs text-slate-300">
                                    <Lock className="w-4 h-4 text-blue-400" /> Encryption
                                </div>
                                <span className="text-[10px] font-bold text-slate-400">256-BIT AES</span>
                            </div>

                            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs text-slate-300">
                                    <Activity className="w-4 h-4 text-indigo-400" /> System Load
                                </div>
                                <span className="text-[10px] font-bold text-indigo-400">Normal</span>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-800/80 pt-4 mt-6 text-[11px] text-slate-500 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-slate-400" />
                        <span>Secure submission protocol v2.4</span>
                    </div>
                </div>

                {/* Right Console */}
                <div className="lg:col-span-8 p-6 lg:p-8 flex flex-col justify-between">

                    <div className="flex items-center justify-between pb-6 border-b border-slate-800/80 mb-6">
                        <div className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
                            {t.consoleHeader}
                        </div>

                        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                            {['am', 'om', 'en'].map((code) => (
                                <button
                                    key={code}
                                    onClick={() => setLang(code)}
                                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${lang === code ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                                        }`}
                                >
                                    {code === 'am' ? 'አማ' : code === 'om' ? 'ORM' : 'EN'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mb-8">
                        {[
                            { idx: 1, label: t.categoryStep },
                            { idx: 2, label: t.detailsStep },
                            { idx: 3, label: t.evidenceStep },
                            { idx: 4, label: t.completeStep },
                        ].map((item) => (
                            <div key={item.idx} className="flex flex-col gap-1.5">
                                <div className={`h-1.5 rounded-full transition-all duration-300 ${step >= item.idx ? 'bg-blue-500 shadow-sm shadow-blue-500/50' : 'bg-slate-800'
                                    }`} />
                                <span className={`text-[10px] font-semibold tracking-wider uppercase ${step === item.idx ? 'text-blue-400' : 'text-slate-500'
                                    }`}>
                                    {item.idx}. {item.label}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="flex-1">
                        {error && (
                            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
                            </div>
                        )}

                        {/* STEP 1 */}
                        {step === 1 && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-xl font-bold text-white tracking-tight">{t.selectCategoryTitle}</h2>
                                    <p className="text-xs text-slate-400 mt-1">{t.selectCategoryDesc}</p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    {categories.map((cat) => {
                                        const Icon = cat.icon;
                                        const isSelected = formData.scamCategory === cat.id;
                                        return (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, scamCategory: cat.id })}
                                                className={`p-4 rounded-2xl border text-left transition-all duration-200 relative overflow-hidden ${isSelected
                                                    ? 'bg-blue-600/10 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                                                    : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
                                                    }`}
                                            >
                                                <Icon className={`w-5 h-5 mb-2.5 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`} />
                                                <div className="font-semibold text-sm">{cat.label}</div>
                                                <div className="text-xs text-slate-400 mt-1">{cat.desc}</div>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="reporterPhone" className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                                            {t.reporterPhoneLabel} *
                                        </label>
                                        <input
                                            id="reporterPhone"
                                            type="text"
                                            placeholder="+251 91 123 4567"
                                            value={formData.reporterPhone}
                                            onChange={(e) => setFormData({ ...formData, reporterPhone: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 2 */}
                        {step === 2 && (
                            <div className="space-y-5">
                                <div>
                                    <h2 className="text-xl font-bold text-white tracking-tight">{t.perpetratorTitle}</h2>
                                    <p className="text-xs text-slate-400 mt-1">{t.perpetratorDesc}</p>
                                </div>

                                <div>
                                    <label htmlFor="scammerPhone" className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                                        {t.scammerPhoneLabel}
                                    </label>
                                    <input
                                        id="scammerPhone"
                                        type="text"
                                        placeholder="+251 90 000 0000"
                                        value={formData.scammerPhone}
                                        onChange={(e) => setFormData({ ...formData, scammerPhone: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="targetProvider" className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                                            {t.providerLabel}
                                        </label>
                                        <select
                                            id="targetProvider"
                                            value={formData.targetProvider}
                                            onChange={(e) => setFormData({ ...formData, targetProvider: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-all"
                                        >
                                            <option value="TELEBIRR">Telebirr</option>
                                            <option value="CBE_BIRR">CBE Birr</option>
                                            <option value="BOA">Bank of Abyssinia</option>
                                            <option value="EBIRR">E-Birr</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="transactionReference" className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                                            {t.txnLabel}
                                        </label>
                                        <input
                                            id="transactionReference"
                                            type="text"
                                            placeholder="TXN987654321"
                                            value={formData.transactionReference}
                                            onChange={(e) => setFormData({ ...formData, transactionReference: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="description" className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                                        {t.descriptionLabel}
                                    </label>
                                    <textarea
                                        id="description"
                                        rows="3"
                                        placeholder="..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-all"
                                    />
                                </div>
                            </div>
                        )}

                        {/* STEP 3 */}
                        {step === 3 && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-xl font-bold text-white tracking-tight">{t.evidenceTitle}</h2>
                                    <p className="text-xs text-slate-400 mt-1">{t.evidenceDesc}</p>
                                </div>

                                <div className="border-2 border-dashed border-slate-800 hover:border-blue-500/50 bg-slate-950/40 rounded-2xl p-8 text-center transition-all">
                                    <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                                    <label className="cursor-pointer text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors">
                                        {t.uploadButton}
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/jpeg,image/png,application/pdf,audio/mpeg,audio/wav"
                                            onChange={(e) => {
                                                const file = e.target.files[0];
                                                if (file && file.size > 10 * 1024 * 1024) {
                                                    setError("File size exceeds maximum 10MB limit.");
                                                    return;
                                                }
                                                setError(null);
                                                setFormData({ ...formData, file });
                                            }}
                                        />
                                    </label>
                                    <p className="text-xs text-slate-500 mt-1">{t.uploadHint}</p>
                                    {formData.file && (
                                        <div className="mt-4 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl inline-flex items-center gap-2 text-xs text-emerald-400 font-medium">
                                            <FileText className="w-4 h-4" /> {formData.file.name}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* STEP 4 */}
                        {step === 4 && (
                            <div className="text-center py-6 space-y-4">
                                <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
                                <h2 className="text-2xl font-bold text-white tracking-tight">{t.successTitle}</h2>
                                <p className="text-xs text-slate-400 max-w-sm mx-auto">{t.successDesc}</p>

                                {response && (
                                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 text-left max-w-md mx-auto space-y-2 text-xs">
                                        <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                                            <span className="text-slate-400">Case ID:</span>
                                            <span className="text-blue-400 font-mono font-bold text-sm">{response.case_number}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-400">Status:</span>
                                            <span className="text-emerald-400 font-bold uppercase">{response.status}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                                            <span className="text-slate-400">Evidence Hash:</span>
                                            <span className="text-slate-300 font-mono text-[10px] truncate max-w-[200px]">{response.evidence_hash}</span>
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={() => {
                                        setStep(1);
                                        setResponse(null);
                                        setError(null);
                                        setFormData({
                                            scamCategory: 'PHISHING_LINK',
                                            reporterPhone: '',
                                            scammerPhone: '',
                                            targetProvider: 'TELEBIRR',
                                            transactionReference: '',
                                            description: '',
                                            file: null,
                                        });
                                    }}
                                    className="mt-6 px-6 py-3 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 transition-all"
                                >
                                    {t.submitAnother}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    {step < 4 && (
                        <div className="mt-8 pt-6 border-t border-slate-800/80 flex justify-between items-center">
                            {step > 1 ? (
                                <button
                                    onClick={() => setStep(step - 1)}
                                    className="px-5 py-2.5 text-xs font-bold text-slate-400 hover:text-white flex items-center gap-2 transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" /> {t.back}
                                </button>
                            ) : <div />}

                            {step < 3 ? (
                                <button
                                    onClick={() => setStep(step + 1)}
                                    disabled={step === 1 && !formData.reporterPhone.trim()}
                                    className="px-6 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all"
                                >
                                    {t.continue} <ArrowRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="px-6 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
                                >
                                    {submitting ? t.transmitting : t.submit} <ArrowRight className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}