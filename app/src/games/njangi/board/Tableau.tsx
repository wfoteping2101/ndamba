// Mode B, Tableau du coach: draw a situation on a 2D board in the books' notation (players,
// ball, numbered passes, runs, dribbles, shots), then watch it play in 3D, against mannequins or
// against defenders who read the lanes. Boards start from any diagram of the two books.
import { useEffect, useMemo, useRef, useState, type PointerEvent as RPE } from 'react'
import { ArrowRight, Camera, CircleDot, Eraser, Footprints, Link2, MousePointer2, Play, RotateCcw, Square, Target, Trash2, Undo2, UserPlus, Waves } from 'lucide-react'
import { useT } from '../../../i18n'
import { useDocumentTitle } from '../../../lib/hooks'
import { cx } from '../../../lib/util'
import type { DiagramSpec } from '../../../lib/types'
import { DRILLS } from '../../../content/drills.gen'
import { LESSONS } from '../../../content/lessons.gen'
import type { Level } from '../../engine/sim/types'
import { GameFrame, NoWebGL, Panel, RoundButton, TopBar, hasWebGL, useMounted, useStore } from '../../shared/ui'
import { getKV, putKV } from '../../shared/save'
import { sfx } from '../../shared/audio'
import { BoardSession, pitchH, pitchW } from './BoardSession'

type Tool = 'move' | 'a' | 'b' | 'n' | 'ball' | 'pass' | 'run' | 'dribble' | 'shot' | 'erase'
type Arrow = NonNullable<DiagramSpec['arrows']>[number]
type DP = NonNullable<DiagramSpec['players']>[number]

const STARTER: DiagramSpec = {
  view: 'grid', w: 40, h: 30,
  players: [
    { id: 'a1', team: 'a', x: 6, y: 15, label: '1' }, { id: 'a2', team: 'a', x: 16, y: 6, label: '2' }, { id: 'a3', team: 'a', x: 16, y: 24, label: '3' }, { id: 'a4', team: 'a', x: 28, y: 15, label: '4' },
    { id: 'b1', team: 'b', x: 20, y: 12 }, { id: 'b2', team: 'b', x: 20, y: 19 },
  ],
  ball: 'a1',
  arrows: [{ from: 'a1', to: 'a2', kind: 'pass', n: 1 }, { from: 'a4', to: [33, 9], kind: 'run', n: 2 }, { from: 'a2', to: [33, 9], kind: 'pass', n: 3 }],
}

const SIZES: { key: string; spec: Pick<DiagramSpec, 'view' | 'w' | 'h'> }[] = [
  { key: 'g20', spec: { view: 'grid', w: 20, h: 15 } },
  { key: 'g40', spec: { view: 'grid', w: 40, h: 30 } },
  { key: 'g60', spec: { view: 'grid', w: 60, h: 40 } },
  { key: 'third', spec: { view: 'third' } },
  { key: 'half', spec: { view: 'half' } },
  { key: 'full', spec: { view: 'full' } },
]

const enc = (s: DiagramSpec) => btoa(unescape(encodeURIComponent(JSON.stringify(s)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const dec = (h: string): DiagramSpec | null => { try { return JSON.parse(decodeURIComponent(escape(atob(h.replace(/-/g, '+').replace(/_/g, '/'))))) } catch { return null } }

export default function Tableau() {
  const { t, lang } = useT('jeux')
  useDocumentTitle(t('tableau.title'))
  const webgl = useMemo(() => hasWebGL(), [])
  const initial = useMemo(() => (location.hash.startsWith('#b=') ? dec(location.hash.slice(3)) : null) ?? STARTER, [])
  const [spec, setSpec] = useState<DiagramSpec>(initial)
  const [history, setHistory] = useState<DiagramSpec[]>([])
  const [tool, setTool] = useState<Tool>('move')
  const [together, setTogether] = useState(false)
  const [tab, setTab] = useState<'board' | '3d'>('board')
  const [copied, setCopied] = useState(false)
  const { ref, inst: s } = useMounted((el) => (webgl ? new BoardSession(el, initial) : null), [webgl])
  const st = useStore(s)

  // restore the last board (unless a shared link brought one)
  useEffect(() => { if (!location.hash.startsWith('#b=')) getKV<DiagramSpec>('tableau.last').then((v) => { if (v?.players) { setSpec(v); s?.show(v) } }) }, [s]) // eslint-disable-line react-hooks/exhaustive-deps
  const commit = (next: DiagramSpec) => {
    setHistory((h) => [...h.slice(-40), spec])
    setSpec(next)
    s?.show(next)
    putKV('tableau.last', next)
  }
  const undo = () => { const prev = history[history.length - 1]; if (!prev) return; setHistory((h) => h.slice(0, -1)); setSpec(prev); s?.show(prev) }

  const templates = useMemo(() => [
    ...DRILLS.map((d) => ({ key: `d:${d.id}`, label: `${d.id} ${lang === 'en' ? d.en.title : d.fr.title}`, spec: d.diagram })),
    ...LESSONS.filter((l) => l.diagram).map((l) => ({ key: `l:${l.no}`, label: t('tableau.lesson', { n: l.no, title: l.title }), spec: l.diagram! })),
  ], [lang, t])

  return (
    <GameFrame className="bg-night-800">
      <TopBar back="/jeux/code-njangi" title={t('tableau.title')} sub={t('tableau.sub')}
        right={st && <RoundButton label={t('shell.camera')} onClick={() => s!.cycleCamera()}><Camera size={19} strokeWidth={1.75} /></RoundButton>} />
      <div className="absolute inset-0 flex flex-col pt-[60px] lg:flex-row">
        {/* mobile tabs */}
        <div className="flex gap-1 px-3 pb-2 lg:hidden" role="tablist">
          {(['board', '3d'] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cx('min-h-[44px] flex-1 rounded-full text-[14px] font-semibold', tab === k ? 'bg-cream text-ink' : 'bg-white/10')}>{t(`tableau.tabs.${k}`)}</button>
          ))}
        </div>
        <section className={cx('flex min-h-0 flex-col gap-2 overflow-y-auto px-3 pb-3 lg:w-[46%] lg:max-w-[640px]', tab !== 'board' && 'hidden lg:flex')} aria-label={t('tableau.tabs.board')}>
          <Toolbar tool={tool} setTool={setTool} together={together} setTogether={setTogether} onUndo={undo} canUndo={history.length > 0} onClear={() => commit({ ...spec, players: [], arrows: [], ball: undefined })} />
          <Board spec={spec} tool={tool} together={together} onChange={commit} />
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-[13px] text-cream/70">{t('tableau.size')}
              <select className="mt-1 block min-h-[44px] w-full rounded-[12px] bg-white/10 px-3 text-[14px] text-cream" value={SIZES.find((z) => z.spec.view === spec.view && (z.spec.view !== 'grid' || z.spec.w === spec.w))?.key ?? ''}
                onChange={(e) => { const z = SIZES.find((x) => x.key === e.target.value); if (z) commit(fitInto({ ...spec, ...z.spec, goals: z.spec.view === 'grid' ? spec.goals : undefined })) }}>
                {SIZES.map((z) => <option key={z.key} value={z.key} className="text-ink">{t(`tableau.sizes.${z.key}`)}</option>)}
              </select>
            </label>
            <label className="block text-[13px] text-cream/70">{t('tableau.template')}
              <select className="mt-1 block min-h-[44px] w-full rounded-[12px] bg-white/10 px-3 text-[14px] text-cream" value="" onChange={(e) => { const tp = templates.find((x) => x.key === e.target.value); if (tp) commit(JSON.parse(JSON.stringify(tp.spec))) }}>
                <option value="" className="text-ink">{t('tableau.pickTemplate')}</option>
                {templates.map((tp) => <option key={tp.key} value={tp.key} className="text-ink">{tp.label}</option>)}
              </select>
            </label>
          </div>
          <button type="button" className="btn-outline-light btn-sm min-h-[44px] self-start" onClick={() => { const url = `${location.origin}${location.pathname}#b=${enc(spec)}`; navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(() => {}); window.history.replaceState(null, '', `#b=${enc(spec)}`) }}>
            <Link2 size={16} strokeWidth={1.75} />{copied ? t('tableau.copied') : t('tableau.share')}
          </button>
        </section>
        <section className={cx('relative min-h-0 flex-1', tab !== '3d' && 'hidden lg:block')} aria-label={t('tableau.tabs.3d')}>
          <div ref={ref} className="absolute inset-0" data-testid="game-canvas" />
          {!webgl && <NoWebGL />}
          {st && s && (
            <div className="absolute inset-x-0 bottom-0 z-10 p-2 sm:p-3">
              <Panel className="mx-auto max-w-xl p-3">
                <div className="flex flex-wrap items-center gap-2">
                  {st.mode === 'edit' || st.mode === 'done'
                    ? <button type="button" className="btn-sun btn-sm min-h-[44px] px-4" onClick={() => { sfx('whistle'); s.play(); setTab('3d') }}><Play size={16} strokeWidth={1.75} />{t('tableau.play')}</button>
                    : <button type="button" className="btn-outline-light btn-sm min-h-[44px]" onClick={() => s.show(spec)}><Square size={15} strokeWidth={1.75} />{t('tableau.stop')}</button>}
                  {st.mode === 'done' && <button type="button" className="btn-outline-light btn-sm min-h-[44px]" onClick={() => s.show(spec)}><RotateCcw size={15} strokeWidth={1.75} />{t('tableau.reset')}</button>}
                  <div className="flex rounded-full bg-white/10 p-0.5" role="radiogroup" aria-label={t('tableau.opposition')}>
                    {(['shadow', 'live'] as const).map((o) => <button key={o} type="button" role="radio" aria-checked={st.opposition === o} onClick={() => s.setOpposition(o)} className={cx('min-h-[40px] rounded-full px-3 text-[13px] font-semibold', st.opposition === o ? 'bg-cream text-ink' : 'text-cream/80')}>{t(`tableau.opp.${o}`)}</button>)}
                  </div>
                  {st.opposition === 'live' && (
                    <select className="min-h-[40px] rounded-full bg-white/10 px-3 text-[13px]" value={st.level} onChange={(e) => s.setLevel(e.target.value as Level)} aria-label={t('lesson.level')}>
                      {(['facile', 'normal', 'difficile'] as const).map((l) => <option key={l} value={l} className="text-ink">{t(`levels.${l}`)}</option>)}
                    </select>
                  )}
                </div>
                {st.mode !== 'edit' && (
                  <div className="mt-2 text-[13.5px]" aria-live="polite">
                    <p className="font-semibold">{st.mode === 'play' ? t('tableau.playing', { n: st.step, total: st.steps }) : st.outcome === 'done' ? t('tableau.done') : t('tableau.failed', { reason: t(`between.ko.${st.reason ?? 'loss'}`, { defaultValue: st.reason ?? '' }) })}</p>
                    <ul className="mt-1 space-y-0.5">
                      {st.passes.map((p, i) => (
                        <li key={i} className={cx(p.outcome === 'lost' ? 'text-clay-100' : 'text-cream/85')}>
                          {t('tableau.passLine', { from: p.from, to: p.to || t('tableau.space') })}{lang === 'fr' ? ' : ' : ': '}{p.margin > 0.35 ? t('tableau.open', { s: p.margin.toFixed(1) }) : p.margin > 0 ? t('tableau.tight', { s: p.margin.toFixed(1) }) : t('tableau.closed', { who: p.interceptor ?? '' })}{p.lines ? `, ${t('tableau.lines', { count: p.lines })}` : ''}{p.outcome === 'lost' ? `, ${t('tableau.lost')}` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Panel>
            </div>
          )}
        </section>
      </div>
    </GameFrame>
  )
}

/** Keep everyone inside the new area when the size changes. */
function fitInto(s: DiagramSpec): DiagramSpec {
  const W = pitchW(s), H = pitchH(s)
  const cl = (v: number, m: number) => Math.max(0.6, Math.min(m - 0.6, v))
  return {
    ...s,
    players: (s.players ?? []).map((p) => ({ ...p, x: cl(p.x, W), y: cl(p.y, H) })),
    arrows: (s.arrows ?? []).map((a) => ({ ...a, to: Array.isArray(a.to) ? [cl(a.to[0], W), cl(a.to[1], H)] as [number, number] : a.to })),
  }
}

function Toolbar({ tool, setTool, together, setTogether, onUndo, canUndo, onClear }: { tool: Tool; setTool: (t: Tool) => void; together: boolean; setTogether: (v: boolean) => void; onUndo: () => void; canUndo: boolean; onClear: () => void }) {
  const { t } = useT('jeux')
  const tools: { k: Tool; icon: JSX.Element; tone?: string }[] = [
    { k: 'move', icon: <MousePointer2 size={18} strokeWidth={1.75} /> },
    { k: 'a', icon: <UserPlus size={18} strokeWidth={1.75} />, tone: 'text-forest-300' },
    { k: 'b', icon: <UserPlus size={18} strokeWidth={1.75} />, tone: 'text-clay-300' },
    { k: 'n', icon: <UserPlus size={18} strokeWidth={1.75} />, tone: 'text-sun-300' },
    { k: 'ball', icon: <CircleDot size={18} strokeWidth={1.75} /> },
    { k: 'pass', icon: <ArrowRight size={18} strokeWidth={1.75} /> },
    { k: 'run', icon: <Footprints size={18} strokeWidth={1.75} /> },
    { k: 'dribble', icon: <Waves size={18} strokeWidth={1.75} /> },
    { k: 'shot', icon: <Target size={18} strokeWidth={1.75} /> },
    { k: 'erase', icon: <Eraser size={18} strokeWidth={1.75} /> },
  ]
  return (
    <div>
      <div className="flex flex-wrap gap-1" role="toolbar" aria-label={t('tableau.tools.label')}>
        {tools.map((x) => (
          <button key={x.k} type="button" onClick={() => setTool(x.k)} aria-pressed={tool === x.k} title={t(`tableau.tools.${x.k}`)} aria-label={t(`tableau.tools.${x.k}`)}
            className={cx('grid h-11 w-11 place-items-center rounded-[12px]', tool === x.k ? 'bg-cream text-ink' : cx('bg-white/10 hover:bg-white/15', x.tone))}>{x.icon}</button>
        ))}
        <button type="button" onClick={onUndo} disabled={!canUndo} className="grid h-11 w-11 place-items-center rounded-[12px] bg-white/10 hover:bg-white/15 disabled:opacity-40" aria-label={t('tableau.undo')} title={t('tableau.undo')}><Undo2 size={18} strokeWidth={1.75} /></button>
        <button type="button" onClick={onClear} className="grid h-11 w-11 place-items-center rounded-[12px] bg-white/10 hover:bg-white/15" aria-label={t('tableau.clear')} title={t('tableau.clear')}><Trash2 size={18} strokeWidth={1.75} /></button>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-cream/70">{t(`tableau.help.${tool}`)}</p>
        {['pass', 'run', 'dribble', 'shot'].includes(tool) && (
          <label className="flex min-h-[40px] items-center gap-2 text-[13px] text-cream/80"><input type="checkbox" checked={together} onChange={(e) => setTogether(e.target.checked)} className="h-4 w-4 accent-[#F5B700]" />{t('tableau.together')}</label>
        )}
      </div>
    </div>
  )
}

function Board({ spec, tool, together, onChange }: { spec: DiagramSpec; tool: Tool; together: boolean; onChange: (s: DiagramSpec) => void }) {
  const { t } = useT('jeux')
  const W = pitchW(spec), H = pitchH(spec)
  const svg = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null)
  const [from, setFrom] = useState<string | null>(null)
  const r = Math.max(0.75, Math.min(W, H) / 26)
  const players = spec.players ?? []
  const arrows = spec.arrows ?? []
  const pt = (e: { clientX: number; clientY: number }) => {
    const el = svg.current!
    const m = el.getScreenCTM()
    if (!m) return { x: 0, y: 0 }
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    return { x: Math.max(0.4, Math.min(W - 0.4, p.x)), y: Math.max(0.4, Math.min(H - 0.4, p.y)) }
  }
  const at = (x: number, y: number) => players.find((p) => Math.hypot(p.x - x, p.y - y) < r * 1.4)
  const nextN = () => { const max = arrows.reduce((m, a) => Math.max(m, a.n ?? 0), 0); return together && max ? max : max + 1 }
  const nextId = (team: string) => { const pre = team === 'gk' ? 'gk' : team; let k = 1; while (players.some((p) => p.id === `${pre}${k}`)) k++; return `${pre}${k}` }
  useEffect(() => { setFrom(null) }, [tool])

  const down = (e: RPE<SVGSVGElement>) => {
    const p = pt(e)
    const hit = at(p.x, p.y)
    if (tool === 'move') { if (hit) { setDrag({ id: hit.id, x: p.x, y: p.y }); (e.target as Element).setPointerCapture?.(e.pointerId) } return }
    if (tool === 'a' || tool === 'b' || tool === 'n') {
      if (hit) return
      const id = nextId(tool)
      const count = players.filter((q) => q.team === tool).length + 1
      onChange({ ...spec, players: [...players, { id, team: tool, x: +p.x.toFixed(1), y: +p.y.toFixed(1), label: tool === 'a' ? String(count) : undefined }] })
      sfx('tap'); return
    }
    if (tool === 'ball') { if (hit) { onChange({ ...spec, ball: hit.id }); sfx('tap') } return }
    if (tool === 'erase') {
      if (hit) { onChange({ ...spec, players: players.filter((q) => q.id !== hit.id), arrows: arrows.filter((a) => a.from !== hit.id && a.to !== hit.id), ball: spec.ball === hit.id ? undefined : spec.ball }); return }
      // nearest arrow
      let best = -1, bd = r * 1.5
      arrows.forEach((a, i) => { const f = typeof a.from === 'string' ? players.find((q) => q.id === a.from) : { x: a.from[0], y: a.from[1] }; const to = typeof a.to === 'string' ? players.find((q) => q.id === a.to) : { x: a.to[0], y: a.to[1] }; if (!f || !to) return; const d = segDist(p, f, to); if (d < bd) { bd = d; best = i } })
      if (best >= 0) onChange({ ...spec, arrows: arrows.filter((_, i) => i !== best) })
      return
    }
    // arrows: first click a player, then a player or a point
    if (!from) { if (hit) setFrom(hit.id); return }
    const kind = tool as Arrow['kind']
    const to: Arrow['to'] = hit && kind === 'pass' && hit.id !== from ? hit.id : [+p.x.toFixed(1), +p.y.toFixed(1)]
    onChange({ ...spec, arrows: [...arrows, { from, to, kind, n: nextN() }] })
    setFrom(null)
    sfx('tap')
  }
  const move = (e: RPE<SVGSVGElement>) => {
    if (!drag) return
    const p = pt(e)
    setDrag({ ...drag, x: p.x, y: p.y })
  }
  const up = () => {
    if (!drag) return
    onChange({ ...spec, players: players.map((q) => (q.id === drag.id ? { ...q, x: +drag.x.toFixed(1), y: +drag.y.toFixed(1) } : q)) })
    setDrag(null)
  }
  const pos = (p: DP) => (drag && drag.id === p.id ? { x: drag.x, y: drag.y } : { x: p.x, y: p.y })
  const pp = (ref: string | [number, number]) => (typeof ref === 'string' ? (() => { const q = players.find((x) => x.id === ref); return q ? pos(q) : null })() : { x: ref[0], y: ref[1] })
  const full = spec.view !== 'grid'
  return (
    <div className="overflow-hidden rounded-[14px] border border-white/10">
      <svg ref={svg} viewBox={`-1 -1 ${W + 2} ${H + 2}`} className="block w-full touch-none select-none" style={{ aspectRatio: `${W + 2} / ${H + 2}`, maxHeight: '58vh' }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} role="img" aria-label={t('tableau.boardLabel', { players: players.length, arrows: arrows.length })}>
        <defs>
          {(['w', 'g', 'r'] as const).map((c) => <marker key={c} id={`ah-${c}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill={c === 'w' ? '#F6F7F2' : c === 'g' ? '#F5B700' : '#D7263D'} /></marker>)}
        </defs>
        <rect x={-1} y={-1} width={W + 2} height={H + 2} fill="#2f7a3c" />
        {Array.from({ length: Math.ceil(W / 5) }, (_, i) => i % 2 ? <rect key={i} x={i * 5} y={0} width={5} height={H} fill="#348543" /> : null)}
        <rect x={0} y={0} width={W} height={H} fill="none" stroke="#F6F7F2" strokeWidth={0.15} strokeDasharray={full ? undefined : '0.8 0.6'} opacity={0.85} />
        {spec.view === 'full' && <><line x1={W / 2} y1={0} x2={W / 2} y2={H} stroke="#F6F7F2" strokeWidth={0.15} opacity={0.8} /><circle cx={W / 2} cy={H / 2} r={9.15} fill="none" stroke="#F6F7F2" strokeWidth={0.15} opacity={0.8} /></>}
        {full && <rect x={W - 16.5} y={H / 2 - 20.16} width={16.5} height={40.32} fill="none" stroke="#F6F7F2" strokeWidth={0.15} opacity={0.8} />}
        {spec.view === 'full' && <rect x={0} y={H / 2 - 20.16} width={16.5} height={40.32} fill="none" stroke="#F6F7F2" strokeWidth={0.15} opacity={0.8} />}
        {(spec.zones ?? []).map((z, i) => <rect key={i} x={z.x} y={z.y} width={z.w} height={z.h} fill={z.tone === 'b' ? '#D7263D' : z.tone === 'n' ? '#F5B700' : '#F6F7F2'} opacity={0.12} />)}
        {arrows.map((a, i) => {
          const f = pp(a.from), to = pp(a.to)
          if (!f || !to) return null
          const color = a.kind === 'shot' ? '#F5B700' : a.kind === 'press' ? '#D7263D' : '#F6F7F2'
          const m = a.kind === 'shot' ? 'g' : a.kind === 'press' ? 'r' : 'w'
          const d = a.kind === 'dribble' ? wavy(f, to, r) : `M${f.x},${f.y} L${shorten(f, to, typeof a.to === 'string' ? r * 1.1 : 0).x},${shorten(f, to, typeof a.to === 'string' ? r * 1.1 : 0).y}`
          const mid = { x: (f.x + to.x) / 2, y: (f.y + to.y) / 2 }
          return (
            <g key={i}>
              <path d={d} fill="none" stroke={color} strokeWidth={a.kind === 'shot' ? r * 0.28 : r * 0.17} strokeDasharray={a.kind === 'run' ? `${r * 0.5} ${r * 0.35}` : undefined} markerEnd={`url(#ah-${m})`} opacity={0.95} />
              {a.n !== undefined && <g transform={`translate(${mid.x},${mid.y})`}><circle r={r * 0.62} fill="#12211A" /><text textAnchor="middle" dominantBaseline="central" fontSize={r * 0.75} fontWeight={700} fill="#F6F7F2">{a.n}</text></g>}
            </g>
          )
        })}
        {players.map((p) => {
          const { x, y } = pos(p)
          const fill = p.team === 'a' ? '#0B5D3B' : p.team === 'b' ? '#D7263D' : p.team === 'n' ? '#F5B700' : p.team === 'gk' ? '#3D4F6B' : '#6B4A7A'
          const sel = from === p.id
          return (
            <g key={p.id} transform={`translate(${x},${y})`}>
              {sel && <circle r={r * 1.45} fill="none" stroke="#F5B700" strokeWidth={r * 0.18} />}
              <circle r={r} fill={fill} stroke="#F6F7F2" strokeWidth={r * 0.12} />
              {p.label && <text textAnchor="middle" dominantBaseline="central" fontSize={r * 0.95} fontWeight={700} fill={p.team === 'n' ? '#12211A' : '#F6F7F2'}>{p.label}</text>}
              {spec.ball === p.id && <circle cx={r * 0.85} cy={r * 0.85} r={r * 0.42} fill="#FFFFFF" stroke="#12211A" strokeWidth={r * 0.08} />}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function shorten(a: { x: number; y: number }, b: { x: number; y: number }, by: number) {
  const d = Math.hypot(b.x - a.x, b.y - a.y) || 1
  const k = Math.max(0, (d - by) / d)
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }
}
function wavy(a: { x: number; y: number }, b: { x: number; y: number }, r: number) {
  const d = Math.hypot(b.x - a.x, b.y - a.y) || 1
  const ux = (b.x - a.x) / d, uy = (b.y - a.y) / d
  const n = Math.max(2, Math.floor(d / (r * 1.4)))
  let path = `M${a.x},${a.y}`
  for (let i = 1; i <= n; i++) {
    const t = i / n
    const off = (i % 2 ? 1 : -1) * r * 0.45 * (i === n ? 0 : 1)
    path += ` L${a.x + ux * d * t - uy * off},${a.y + uy * d * t + ux * off}`
  }
  return path
}
function segDist(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) {
  const L = (b.x - a.x) ** 2 + (b.y - a.y) ** 2 || 1
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / L))
  return Math.hypot(p.x - (a.x + t * (b.x - a.x)), p.y - (a.y + t * (b.y - a.y)))
}
