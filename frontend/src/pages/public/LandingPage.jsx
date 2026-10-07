import { Link } from 'react-router-dom'
import { ShieldAlert, PhoneCall, Search, Landmark, Lock, Radio } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext'

export default function LandingPage() {
  const { t } = useLanguage()

  const channels = [
    { icon: ShieldAlert, title: t('landing.channelWebTitle'), desc: t('landing.channelWebDesc') },
    { icon: Radio, title: t('landing.channelTelegramTitle'), desc: t('landing.channelTelegramDesc') },
    { icon: PhoneCall, title: t('landing.channelIvrTitle'), desc: t('landing.channelIvrDesc') },
  ]

  const steps = [
    { title: t('landing.step1Title'), desc: t('landing.step1Desc') },
    { title: t('landing.step2Title'), desc: t('landing.step2Desc') },
    { title: t('landing.step3Title'), desc: t('landing.step3Desc') },
    { title: t('landing.step4Title'), desc: t('landing.step4Desc') },
  ]

  return (
    <div>
      <section className="border-b border-mist-300 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <p className="text-signal-dark text-sm font-medium mb-3">{t('landing.eyebrow')}</p>
          <h1 className="text-4xl sm:text-5xl font-semibold text-ink-950 leading-tight max-w-2xl">
            {t('landing.headline')}
          </h1>
          <p className="mt-5 text-base text-fog-500 max-w-xl leading-relaxed">{t('landing.sub')}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/report" className="btn-primary !px-6 !py-3">{t('landing.ctaReport')}</Link>
            <Link to="/track" className="btn-ghost-light !px-6 !py-3">{t('landing.ctaTrack')}</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-xl font-semibold text-ink-950 mb-1">{t('landing.channelsTitle')}</h2>
        <p className="text-sm text-fog-500 mb-8 max-w-lg">{t('landing.channelsSub')}</p>
        <div className="grid sm:grid-cols-3 gap-6">
          {channels.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="public-card p-6">
              <Icon className="h-5 w-5 text-signal-dark mb-3" />
              <h3 className="font-medium text-ink-950 mb-1.5">{title}</h3>
              <p className="text-sm text-fog-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border-y border-mist-300">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-xl font-semibold text-ink-950 mb-8">{t('landing.stepsTitle')}</h2>
          <div className="space-y-6">
            {steps.map((step, i) => (
              <div key={step.title} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-950 text-white text-sm font-mono">
                    {i + 1}
                  </span>
                  {i < steps.length - 1 && <span className="w-px flex-1 bg-mist-300 my-1" />}
                </div>
                <div className="pb-2">
                  <h3 className="font-medium text-ink-950">{step.title}</h3>
                  <p className="text-sm text-fog-500 mt-1 leading-relaxed max-w-md">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid sm:grid-cols-3 gap-8">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-signal-dark shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-ink-950 text-sm">{t('landing.trustIdentityTitle')}</h3>
              <p className="text-sm text-fog-500 mt-1">{t('landing.trustIdentityDesc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Landmark className="h-5 w-5 text-signal-dark shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-ink-950 text-sm">{t('landing.trustBankTitle')}</h3>
              <p className="text-sm text-fog-500 mt-1">{t('landing.trustBankDesc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Search className="h-5 w-5 text-signal-dark shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-ink-950 text-sm">{t('landing.trustLinkTitle')}</h3>
              <p className="text-sm text-fog-500 mt-1">{t('landing.trustLinkDesc')}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
