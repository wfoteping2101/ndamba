// "Résumé de la philosophie de jeu": a rules-based narrative from the Indice Njangi.
// Pure function (no React), so Mola and the home page can reuse it:
//   import { buildSummary } from '../analysis/components/summary'
//   const s = buildSummary(computeNjangi(events), 'fr', previousResult, { oppShots: 4 })
import i18n from '../../../i18n'
import type { Intention, Lang } from '../../../lib/types'
import { DRILLS_FOR, NJANGI_TARGETS, SUB_INTENTION, SUB_KEYS, fmtNjangi, njangiLabel, rankSubs, subLevel, type NjangiResult, type SubKey } from '../../../lib/njangi'

export interface SummaryContext {
  /** shots by the opponent (side 'them') */
  oppShots?: number
  /** goals against */
  oppGoals?: number
}

export interface NjangiSummary {
  total: number
  label: string
  headline: string
  /** three short paragraphs: with the ball, where it progressed or stalled, reaction to losses (plus a comparison) */
  paragraphs: string[]
  strengths: string[]
  corrections: string[]
  /** the two weakest sub-indices, weakest first */
  weakest: SubKey[]
  drills: { sub: SubKey; ids: string[] }[]
  objectives: string[]
  /** intention to pass to planWeek (matches the weakest sub-index) */
  intention: Intention
  /** too few tags to say much */
  thin: boolean
  /** everything above as plain text (copy, share, Mola) */
  text: string
}

const pct = (v: number) => Math.round(v * 100)
const ceilTo = (v: number, step: number) => Math.ceil(v / step) * step

export function buildSummary(r: NjangiResult, lang: Lang = 'fr', previous?: NjangiResult | null, ctx: SummaryContext = {}): NjangiSummary {
  const t = i18n.getFixedT(lang, 'analysis')
  const c = r.counts
  const label = njangiLabel(r.total, lang)
  const headline = t('summary.headline', { label, total: fmtNjangi(r.total, lang) })
  const lvl = (k: SubKey) => subLevel(r.sub[k])
  const ranked = rankSubs(r) // weakest first
  const weakest = ranked.slice(0, 2)
  const intention = SUB_INTENTION[weakest[0]]
  const thin = r.tagged < 12
  const subName = (k: SubKey) => t(`sub.${k}.name`)
  const vals = {
    passes: r.passes, acc: pct(r.passAccuracy), k: pct(r.conservation), pct: pct(r.progressionRate), lines: c.LINE, final3: c.FINAL3, box: c.BOX,
    shots: c.SHOT, shotsIn: c.SHOT_IN, poss: r.possessions, fix: c.FIX2, sw: c.SWITCH, losses: r.losses, r5: c.REGAIN5,
  }

  /* ---- paragraph 1: what the team did with the ball ---- */
  const accLvl = r.conservation < 0.65 ? 0 : r.conservation < 0.75 ? 1 : 2
  const p1: string[] = [t(`summary.ball.control${accLvl}`, vals), t(`summary.ball.prog${lvl('progression')}`, vals)]
  const P = r.sub.progression, C = r.sub.controle
  p1.push(t(
    C >= 13 && P < 8 ? 'summary.ball.conclNoPurpose'
      : P >= 13 && C >= 12 ? 'summary.ball.conclPurpose'
        : P >= 12 && C < 8 ? 'summary.ball.conclDirect'
          : C < 8 && P < 8 ? 'summary.ball.conclStruggle'
            : 'summary.ball.conclBalanced',
  ))

  /* ---- paragraph 2: where it progressed or got stuck ---- */
  const final3Rate = c.FINAL3 / r.possessions
  const boxRate = c.FINAL3 ? c.BOX / c.FINAL3 : 0
  const shotRate = c.BOX ? c.SHOT / c.BOX : 0
  const onTarget = c.SHOT ? c.SHOT_IN / c.SHOT : 0
  const zoneKey = final3Rate < 0.35 ? 'beforeFinal' : boxRate < 0.35 ? 'edgeBox' : shotRate < 0.4 ? 'inBox' : onTarget < 0.4 ? 'finishing' : 'fluent'
  const p2 = [t(`summary.zone.${zoneKey}`, vals), t(`summary.zone.fix${lvl('fixation')}`, vals)]

  /* ---- paragraph 3: how it reacted to losses ---- */
  const p3: string[] = []
  if (!r.losses) p3.push(t('summary.loss.none'))
  else p3.push(t('summary.loss.base', { ...vals, pct: pct(r.repriseRate) }), t(`summary.loss.lvl${lvl('reprise')}`))
  if (ctx.oppShots != null && ctx.oppShots > 0) p3.push(t('summary.loss.opp', { n: ctx.oppShots }))

  const paragraphs = [p1.join(' '), p2.join(' '), p3.join(' ')]

  /* ---- comparison with the previous match ---- */
  if (previous && previous.tagged > 0) {
    const d = r.total - previous.total
    const diffs = SUB_KEYS.map((k) => ({ k, d: Math.round((r.sub[k] - previous.sub[k]) * 10) / 10 }))
    const f = (v: number) => fmtNjangi(v, lang)
    if (Math.abs(d) < 3) paragraphs.push(t('summary.compare.flat', { prev: f(previous.total), cur: f(r.total) }))
    else {
      const best = [...diffs].sort((a, b) => (d > 0 ? b.d - a.d : a.d - b.d))[0]
      paragraphs.push(t(d > 0 ? 'summary.compare.up' : 'summary.compare.down', { prev: f(previous.total), cur: f(r.total), d: f(Math.round(d * 10) / 10), sub: subName(best.k), sd: f(best.d) }))
    }
  }

  /* ---- strengths (strongest sub-indices first, then fallbacks) ---- */
  const subVals = (k: SubKey) => ({ ...vals, v: fmtNjangi(r.sub[k], lang), pct: k === 'reprise' ? pct(r.repriseRate) : pct(r.progressionRate) })
  const strengths: string[] = []
  for (const k of [...ranked].reverse()) if (r.sub[k] >= 8 && strengths.length < 3) strengths.push(t(`summary.strength.${k}`, subVals(k)))
  const fillS: [boolean, string][] = [
    [c.GOAL > 0 && c.SHOT_IN > 0, t('summary.strength.goals', { goals: c.GOAL, shotsIn: Math.max(c.SHOT_IN, c.GOAL) })],
    [c.SHOT > 0 && onTarget >= 0.4, t('summary.strength.shotsIn', vals)],
    [c.REGAIN + c.REGAIN5 > 0, t('summary.strength.regains', { n: c.REGAIN + c.REGAIN5 })],
    [true, t('summary.strength.effort', { n: r.tagged })],
  ]
  for (const [ok, s] of fillS) if (ok && strengths.length < 3 && !strengths.includes(s)) strengths.push(s)

  /* ---- corrections (weakest first, then fallbacks) ---- */
  const corrections: string[] = []
  for (const k of ranked) if (r.sub[k] < 13 && corrections.length < 3) corrections.push(t(`summary.correction.${k}`, subVals(k)))
  const fillC: [boolean, string][] = [
    [c.SHOT > 0 && onTarget < 0.5, t('summary.correction.shots', vals)],
    [(ctx.oppShots ?? 0) >= 3, t('summary.correction.oppShots', { n: ctx.oppShots ?? 0 })],
    [true, t('summary.correction.keep')],
  ]
  for (const [ok, s] of fillC) if (ok && corrections.length < 3 && !corrections.includes(s)) corrections.push(s)
  // still short (a very strong match): repeat the weakest as a "keep pushing" item
  for (const k of ranked) if (corrections.length < 3) { const s = t(`summary.correction.${k}`, subVals(k)); if (!corrections.includes(s)) corrections.push(s) }

  /* ---- drills and objectives for the weakest sub-indices ---- */
  const drills = weakest.map((sub) => ({ sub, ids: DRILLS_FOR[sub].slice(0, 2) }))
  const objectives = weakest.map((k) => objective(k, r, t))
  objectives.push(t('summary.objective.intention', { intention: t(`common:intentions.${intention}`) }))

  const finalParagraphs = thin ? [t('summary.empty'), ...paragraphs] : paragraphs
  const text = [
    headline, '',
    ...finalParagraphs.flatMap((p) => [p, '']),
    t('report.strengths'), ...strengths.map((s) => `- ${s}`), '',
    t('report.corrections'), ...corrections.map((s) => `- ${s}`), '',
    t('report.objectives'), ...objectives.map((s) => `- ${s}`),
  ].join('\n')

  return { total: r.total, label, headline, paragraphs: finalParagraphs, strengths, corrections, weakest, drills, objectives, intention, thin, text }
}

type T = ReturnType<typeof i18n.getFixedT>
function objective(k: SubKey, r: NjangiResult, t: T) {
  const c = r.counts
  const T = NJANGI_TARGETS
  switch (k) {
    case 'progression': { const cur = pct(r.progressionRate); return t('summary.objective.progression', { cur, target: Math.min(pct(T.progression), Math.max(cur + 5, ceilTo(cur + 3, 5))) }) }
    case 'penetration': { const cur = c.BOX; return t('summary.objective.penetration', { cur, target: Math.max(cur + 3, Math.ceil(cur * 1.3)) }) }
    case 'fixation': { const cur = c.FIX2 + c.SWITCH; return t('summary.objective.fixation', { cur, target: cur + Math.max(3, Math.ceil(cur * 0.3)) }) }
    case 'reprise': { const cur = pct(r.repriseRate); return t('summary.objective.reprise', { cur, target: Math.min(pct(T.reprise), Math.max(cur + 5, ceilTo(cur + 5, 5))) }) }
    case 'controle': { const cur = pct(r.conservation); return t('summary.objective.controle', { cur, target: Math.min(85, Math.max(cur + 4, ceilTo(cur + 2, 5))) }) }
  }
}
