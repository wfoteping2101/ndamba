// « Filmer vos matchs »: where to put the camera, the ways to bring a video into Ndamba, and honest gear
// recommendations (Amazon links carry the Associates tag and the page shows the disclosure; no invented
// prices, ratings or reviews). « Filmer maintenant » opens the phone's camera and creates a file video.
import { useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpFromLine, BatteryCharging, Camera, CloudUpload, ExternalLink, FileVideo, HardDrive, Link2, LoaderCircle, Maximize, Plus, ShoppingBag, Smartphone, Droplets, Video } from 'lucide-react'
import { useT } from '../../i18n'
import { amazonSearch, VIDEO_HOSTING } from '../../lib/config'
import { db } from '../../lib/db'
import { useDocumentTitle } from '../../lib/hooks'
import { useSession } from '../../lib/session'
import type { VideoProject } from '../../lib/types'
import { fmtDate, money, nowISO, todayISO, uid } from '../../lib/util'
import { PageHeader } from '../../ui'
import { PitchSpot } from './components/PitchSpot'
import { readVideoMeta } from './hosting'

const VEO_URL = 'https://www.veo.com/en-us/product/veo-go'

const TIPS: [string, ReactNode][] = [
  ['height', <ArrowUpFromLine key="h" size={19} strokeWidth={1.75} />],
  ['halfway', <Video key="m" size={19} strokeWidth={1.75} />],
  ['whole', <Maximize key="w" size={19} strokeWidth={1.75} />],
  ['landscape', <Smartphone key="l" size={19} strokeWidth={1.75} className="rotate-90" />],
  ['battery', <BatteryCharging key="b" size={19} strokeWidth={1.75} />],
  ['storage', <HardDrive key="s" size={19} strokeWidth={1.75} />],
]

const GEAR: [key: string, query: string, icon: ReactNode][] = [
  ['tripod', 'tripod 20 ft sports camera', <ArrowUpFromLine key="t" size={20} strokeWidth={1.75} />],
  ['mount', 'phone tripod mount', <Smartphone key="m" size={20} strokeWidth={1.75} />],
  ['power', 'power bank 20000mAh', <BatteryCharging key="p" size={20} strokeWidth={1.75} />],
  ['weight', 'tripod water weight bag', <Droplets key="w" size={20} strokeWidth={1.75} />],
]

export default function Filmer() {
  const { t, lang } = useT('gear')
  useDocumentTitle(t('title'))
  const navigate = useNavigate()
  const { team } = useSession()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  // « Filmer maintenant »: the phone's camera records, then a file video is created and the studio opens.
  // The file stays on the device; it is passed to the studio for this visit (router state).
  const recorded = async (file?: File | null) => {
    if (!file) return
    setBusy(true)
    try {
      const meta = await readVideoMeta(file)
      const v: VideoProject = {
        id: uid('vp_'), title: t('now.title', { date: fmtDate(todayISO(), lang, { day: 'numeric', month: 'long' }) }), source: 'file', fileName: file.name,
        duration: meta.duration ?? undefined, teamId: team?.id, kind: 'match', tags: [], createdAt: nowISO(),
      }
      await db.videos.put(v)
      navigate(`/app/analyse/video/${v.id}`, { state: { file } })
    } finally { setBusy(false) }
  }

  const P = VIDEO_HOSTING
  const ways: [string, ReactNode, string, string][] = [
    ['link', <Link2 key="l" size={20} strokeWidth={1.75} />, t('ways.free'), t('ways.link.body')],
    ['file', <FileVideo key="f" size={20} strokeWidth={1.75} />, t('ways.free'), t('ways.file.body')],
    ['hosted', <CloudUpload key="h" size={20} strokeWidth={1.75} />, t('ways.paid'), t('ways.hosted.body', { pass: money(P.pass.usd, lang), club: money(P.club.usdMonth, lang) })],
  ]

  return (
    <div>
      <PageHeader title={t('title')} subtitle={t('subtitle')}
        actions={<>
          <input ref={input} type="file" accept="video/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { recorded(e.target.files?.[0]); e.target.value = '' }} />
          <button type="button" className="btn-primary btn-lg" onClick={() => input.current?.click()} disabled={busy}>
            {busy ? <LoaderCircle size={18} className="motion-safe:animate-spin" /> : <Camera size={18} />}{t('now.button')}
          </button>
        </>} />
      <p className="-mt-3 mb-8 text-[13px] text-ink-muted sm:-mt-6">{t('now.hint')}</p>

      <section aria-labelledby="fm-spot" className="mb-12 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start lg:gap-10">
        <div>
          <h2 id="fm-spot" className="text-[22px] leading-tight text-ink sm:text-[26px]">{t('spot.title')}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{t('spot.lead')}</p>
          <PitchSpot className="mt-5 w-full max-w-[520px]" camera={t('spot.camera')} height={t('spot.heightLabel')} frame={t('spot.frame')} />
        </div>
        <ul className="divide-y divide-line rounded-panel border border-line bg-paper">
          {TIPS.map(([k, icon]) => (
            <li key={k} className="flex gap-4 px-5 py-4 sm:px-6">
              <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-forest-50 text-forest-700" aria-hidden="true">{icon}</span>
              <div className="min-w-0">
                <h3 className="text-[16px] leading-tight text-ink">{t(`tips.${k}.title`)}</h3>
                <p className="mt-1 text-[14.5px] leading-relaxed text-ink-muted">{t(`tips.${k}.body`)}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="fm-ways" className="mb-12">
        <h2 id="fm-ways" className="text-[22px] leading-tight text-ink sm:text-[26px]">{t('ways.title')}</h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-muted">{t('ways.lead')}</p>
        <div className="mt-5 grid gap-px overflow-hidden rounded-panel border border-line bg-line md:grid-cols-3">
          {ways.map(([k, icon, price, body]) => (
            <article key={k} className="flex flex-col bg-paper p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-forest-50 text-forest-700" aria-hidden="true">{icon}</span>
                <span className={k === 'hosted' ? 'rounded-full bg-sand px-2.5 py-[3px] text-[12px] font-semibold text-ink-soft' : 'rounded-full bg-forest-50 px-2.5 py-[3px] text-[12px] font-semibold text-forest-700'}>{price}</span>
              </div>
              <h3 className="mt-4 text-[17px] leading-tight text-ink">{t(`ways.${k}.title`)}</h3>
              <p className="mt-1.5 flex-1 text-[14.5px] leading-relaxed text-ink-muted">{body}</p>
              {k === 'hosted' && <Link to="/app/premium#hebergement" className="link mt-3 self-start text-[14px]">{t('ways.prices')}</Link>}
            </article>
          ))}
        </div>
        <div className="mt-5">
          <Link to="/app/analyse/video?nouveau=" className="btn-outline min-h-[44px]"><Plus size={17} />{t('ways.add')}</Link>
        </div>
      </section>

      <section aria-labelledby="fm-gear" data-tour="filming-gear">
        <h2 id="fm-gear" className="text-[22px] leading-tight text-ink sm:text-[26px]">{t('gear.title')}</h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-muted">{t('gear.lead')}</p>

        <article className="mt-5 grid gap-5 overflow-hidden rounded-panel bg-night-800 p-5 text-cream surface-dark sm:p-7 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-center">
          <div>
            <p className="text-[13px] font-semibold text-sun-300">{t('veo.label')}</p>
            <h3 className="mt-1 text-[24px] leading-tight text-cream sm:text-[28px]">{t('veo.title')}</h3>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-cream/80">{t('veo.body')}</p>
            <ul className="mt-4 space-y-1.5 text-[14px] leading-relaxed text-cream/80">
              {['phones', 'subscription', 'notAffiliated'].map((k) => <li key={k} className="flex gap-2"><span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-sun-500" />{t(`veo.${k}`)}</li>)}
            </ul>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
            <a href={amazonSearch('Veo Go camera')} target="_blank" rel="sponsored noopener" className="btn min-h-[48px] bg-cream text-forest-800 hover:bg-white"><ShoppingBag size={17} />{t('amazon')}</a>
            <a href={VEO_URL} target="_blank" rel="noopener" className="btn-outline-light min-h-[48px]"><ExternalLink size={16} />{t('veo.maker')}</a>
          </div>
        </article>

        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {GEAR.map(([k, q, icon]) => (
            <li key={k} className="flex flex-col rounded-card border border-line bg-paper p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-forest-50 text-forest-700" aria-hidden="true">{icon}</span>
                <div className="min-w-0">
                  <h3 className="text-[16px] leading-tight text-ink">{t(`items.${k}.title`)}</h3>
                  <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">{t(`items.${k}.why`)}</p>
                </div>
              </div>
              <p className="mt-3 flex-1 text-[13.5px] leading-relaxed text-ink-muted"><span className="font-semibold text-ink-soft">{t('check')}</span> {t(`items.${k}.check`)}</p>
              <a href={amazonSearch(q)} target="_blank" rel="sponsored noopener" className="btn-outline mt-4 min-h-[44px] self-start"><ShoppingBag size={16} />{t('amazonSearch')}</a>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[13px] leading-relaxed text-ink-muted">{t('disclosure')}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{t('noPrices')}</p>
      </section>
    </div>
  )
}
