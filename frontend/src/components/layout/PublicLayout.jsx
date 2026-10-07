import { useState, useEffect } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { ShieldCheck, Languages, Lock, Radio, Sun, Moon } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext'

export default function PublicLayout() {
  const { t, lang, setLang, languages } = useLanguage()
  const [theme, setTheme] = useState(() => localStorage.getItem('insa_theme') || 'dark')

  useEffect(() => {
    localStorage.setItem('insa_theme', theme)
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark')

  return (
    <div className={`public-shell flex flex-col min-h-screen transition-colors duration-200 ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* National-mark hairline: Ethiopian flag order */}
      <div className="h-1.5 w-full flex shadow-sm">
        <div className="flex-1 bg-emerald-500" />
        <div className="flex-1 bg-amber-400" />
        <div className="flex-1 bg-rose-600" />
      </div>

      {/* Security Telemetry Sub-bar */}
      <div className="bg-slate-900 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 px-6 py-1.5 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-mono uppercase tracking-wider text-slate-200">INSA Federal Secure Gateway</span>
          <span className="text-slate-600">|</span>
          <span className="hidden sm:inline font-mono">TLS 1.3 // 256-BIT ENCRYPTED</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-slate-400">
          <Lock className="h-3 w-3 text-emerald-400" />
          <span>AUTHORIZED INCIDENT RESPONSE PORTAL</span>
        </div>
      </div>

      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border border-slate-300 dark:border-slate-700 shadow-inner group-hover:border-slate-400 transition-colors">
              <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </span>
            <span className="leading-tight">
              <span className="block text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                NDSIR
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Federal</span>
              </span>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400">Information Network Security Administration</span>
            </span>
          </Link>

          <nav className="flex items-center gap-5 text-sm">
            <Link to="/report" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium transition-colors">
              {t('nav.report')}
            </Link>
            <Link to="/track" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium transition-colors">
              {t('nav.track')}
            </Link>
            <Link to="/login" className="px-4 py-2 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold uppercase tracking-wider border border-slate-300 dark:border-slate-700 transition-all shadow-sm">
              {t('nav.staffLogin')}
            </Link>

            <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-4">
              <button
                onClick={toggleTheme}
                aria-label="Toggle Theme"
                className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all shadow-inner"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
              </button>
              <LanguageSwitcher lang={lang} setLang={setLang} languages={languages} />
            </div>
          </nav>
        </div>
      </header>

      <main className="flex-1 bg-slate-100/60 dark:bg-slate-900/50">
        <div className="mx-auto max-w-6xl py-8 px-6">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400">
        <div className="mx-auto max-w-6xl px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs">
            <Radio className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
            <span>Official Cyber Incident Reporting & Threat Mitigation System</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span>© {new Date().getFullYear()} INSA. {t('footer.rights')}</span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-slate-400 dark:text-slate-500">{t('footer.strategy')}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

function LanguageSwitcher({ lang, setLang, languages }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 p-0.5 shadow-inner" role="group" aria-label="Language selector">
      <Languages className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 ml-1.5" />
      {Object.entries(languages).map(([code, meta]) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          className={`rounded px-2.5 py-1 text-xs font-medium transition-all ${lang === code
            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm border border-slate-300 dark:border-slate-600'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
        >
          {meta.nativeLabel}
        </button>
      ))}
    </div>
  )
}