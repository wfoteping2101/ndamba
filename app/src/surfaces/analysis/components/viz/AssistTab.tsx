// Report tab « Demander à Mola »: questions about the match answered from its codes, on the device.
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Play } from 'lucide-react'
import { useT } from '../../../../i18n'
import { cx, uid } from '../../../../lib/util'
import MolaAvatar from '../../../mola/components/MolaAvatar'
import '../../../mola/components/mola.css'
import { answer, detectIntent, MORE, SUGGESTED, type Answer, type Intent } from './assist'
import { useOpenVideo, useViz } from './context'

interface Turn { id: string; q: string; a: Answer }

export default function AssistTab() {
  const { t, lang } = useT('viz')
  const viz = useViz()
  const open = useOpenVideo()
  const [turns, setTurns] = useState<Turn[]>([])
  const [text, setText] = useState('')
  const end = useRef<HTMLDivElement>(null)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [turns.length])
  const ctx = { match: viz.match, events: viz.events, teamName: viz.teamName, lang, nameOf: (id?: string) => (id ? viz.byId.get(id)?.name ?? '?' : ''), prev: viz.prev }
  const ask = (q: string, intent?: Intent) => {
    const i = intent ?? detectIntent(q)
    setTurns((l) => [...l, { id: uid('q_'), q, a: answer(i, ctx, t) }])
  }
  const submit = (e: FormEvent) => { e.preventDefault(); const q = text.trim(); if (!q) return; ask(q); setText('') }
  const chips = [...SUGGESTED, ...MORE]
  const canPlay = (evs: { videoT?: number }[]) => !!viz.videoId && evs.some((e) => typeof e.videoT === 'number')

  return (
    <section data-tour="report-assist" aria-labelledby="assist-h" className="rounded-panel border border-line bg-paper">
      <header className="flex items-start gap-3 border-b border-line px-4 py-4 sm:px-6">
        <MolaAvatar size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="assist-h" className="text-[18px] leading-tight text-ink sm:text-[20px]">{t('assist.title')}</h2>
            <span className="rounded-full bg-sand px-2.5 py-0.5 text-[12px] font-semibold text-ink-soft">{t('assist.badge')}</span>
          </div>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink-muted">{t('assist.how', { n: viz.events.length })}</p>
        </div>
      </header>

      <div className="px-4 py-5 sm:px-6" aria-live="polite">
        <MolaSays>{t('assist.hello', { opp: viz.match.opponent })}</MolaSays>
        {turns.map((turn) => (
          <div key={turn.id} className="mola-in mt-5">
            <div className="flex justify-end"><div className="max-w-[82%] rounded-[18px] rounded-br-[6px] bg-forest-600 px-4 py-2.5 text-[15px] leading-relaxed text-cream">{turn.q}</div></div>
            <div className="mt-4">
              <MolaSays>
                {turn.a.paragraphs.map((p, i) => <p key={i} className={cx(i > 0 && 'mt-2.5')}>{p}</p>)}
                {turn.a.bullets && <ul className="mt-2.5 space-y-1.5">{turn.a.bullets.map((b, i) => <li key={i} className="border-l-2 border-forest-300 pl-3">{b}</li>)}</ul>}
                {turn.a.clips && turn.a.clips.some((c) => canPlay(c.events)) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {turn.a.clips.filter((c) => canPlay(c.events)).map((c) => (
                      <button key={c.label} type="button" onClick={() => open(c.events)} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-forest-100 bg-forest-50 px-3.5 text-[13px] font-semibold text-forest-700 hover:border-forest-300">
                        <Play size={12} fill="currentColor" strokeWidth={0} aria-hidden="true" />{c.label}
                      </button>
                    ))}
                  </div>
                )}
                {turn.a.intent === 'help' && <p className="mt-2.5 text-[13px] text-ink-muted">{t('assist.helpHint')}</p>}
              </MolaSays>
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>

      <div className="border-t border-line px-4 py-4 sm:px-6">
        <div className="mola-noscroll -mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap" role="group" aria-label={t('assist.suggestions')}>
          {chips.map((i) => (
            <button key={i} type="button" onClick={() => ask(t(`assist.q.${i}`), i)}
              className={cx('inline-flex min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-full border px-3.5 text-[13.5px] font-medium transition sm:min-h-[38px]',
                SUGGESTED.includes(i) ? 'border-forest-100 bg-forest-50 text-forest-700 hover:border-forest-300' : 'border-line bg-paper text-ink-soft hover:border-forest-300 hover:text-ink')}>
              {t(`assist.q.${i}`)}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="flex gap-2">
          <label htmlFor="nj-assist" className="sr-only">{t('assist.placeholder')}</label>
          <input id="nj-assist" value={text} onChange={(e) => setText(e.target.value)} placeholder={t('assist.placeholder')} className="input min-w-0 flex-1" autoComplete="off" />
          <button type="submit" className="btn-primary shrink-0" disabled={!text.trim()}>{t('assist.send')}</button>
        </form>
        <p className="mt-2 text-[12px] text-ink-faint">{t('assist.footer')}</p>
      </div>
    </section>
  )
}

function MolaSays({ children }: { children: React.ReactNode }) {
  const { t } = useT('viz')
  return (
    <div className="flex items-start gap-3">
      <MolaAvatar size={32} ring={false} />
      <div className="min-w-0 max-w-[64ch] flex-1">
        <div className="mb-0.5 text-[13px] font-semibold leading-[22px] text-ink">{t('assist.name')}</div>
        <div className="text-[15.5px] leading-[1.6] text-ink">{children}</div>
      </div>
    </div>
  )
}
