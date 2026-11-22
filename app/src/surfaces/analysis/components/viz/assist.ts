// Coach Assist: Mola reads the codes of one match and answers in plain French or English, with fixed
// templates (viz.json, mola.*) filled from the computations of lib/viz.ts. No network, no model:
// the same codes always give the same answer.
import type { TFunction } from 'i18next'
import { computeNjangi, DRILLS_FOR, fmtNjangi, njangiLabel, rankSubs, subLevel, type NjangiResult } from '../../../../lib/njangi'
import type { Lang, Match, MatchEvent } from '../../../../lib/types'
import {
  byLane, byThird, fieldTilt, indiceBlocks, isPlaced, opponentCoded, passStrings, playerLines, possession, shotList, shotStats,
  theirShotOrigins, territory,
} from '../../../../lib/viz'

export type Intent = 'summary' | 'trends' | 'opponent' | 'efficiency' | 'losses' | 'strengths' | 'players' | 'pressing' | 'possession' | 'help'
export const SUGGESTED: Intent[] = ['summary', 'trends', 'opponent', 'efficiency']
export const MORE: Intent[] = ['losses', 'players', 'pressing', 'strengths']

export interface Answer { intent: Intent; paragraphs: string[]; bullets?: string[]; clips?: { label: string; events: MatchEvent[] }[] }
export interface AssistCtx {
  match: Match; events: MatchEvent[]; teamName: string; lang: Lang
  nameOf: (id?: string) => string
  prev?: { opponent: string; result: NjangiResult } | null
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
const WORDS: Record<Exclude<Intent, 'help'>, string[]> = {
  summary: ['resume', 'resumer', 'synthese', 'bilan', 'summary', 'summarise', 'summarize', 'sum up', 'overview', 'recap', 'comment s est passe', 'how did', 'raconte'],
  trends: ['tendance', 'habitude', 'style', 'trend', 'pattern', 'tend', 'identite', 'identity', 'comment on joue', 'how we play'],
  opponent: ['leur', 'leurs', 'adversaire', 'adverse', 'eux', 'opponent', 'opposition', 'their', 'they', 'them'],
  efficiency: ['efficac', 'finition', 'conversion', 'tir', 'tirs', 'devant le but', 'shot', 'shoot', 'finishing', 'clinical', 'efficien', 'marquer', 'score'],
  losses: ['perte', 'pertes', 'perd', 'perdu', 'perdons', 'lose', 'losing', 'loss', 'losses', 'lost', 'turnover', 'give the ball away', 'giving the ball'],
  strengths: ['force', 'forces', 'faiblesse', 'point fort', 'point faible', 'strength', 'weak', 'ameliorer', 'corriger', 'improve', 'work on', 'travailler'],
  players: ['joueur', 'joueurs', 'meilleur', 'qui a', 'homme du match', 'player', 'players', 'best', 'top', 'who', 'performer', 'standout', 'influent'],
  pressing: ['pressing', 'recup', 'reprise', 'contre pression', 'press', 'regain', 'win back', 'won back', 'win the ball', 'counter press', 'gegen'],
  possession: ['possession', 'conservation', 'gard', 'keep', 'retention', 'retain', 'circul', 'tenir le ballon', 'hold', 'passes'],
}

/** The intent of a free question, from keywords in either language (accents and case ignored). */
export function detectIntent(q: string): Intent {
  const s = ` ${norm(q)} `
  if (!s.trim()) return 'help'
  const score = (Object.keys(WORDS) as Exclude<Intent, 'help'>[]).map((k) => [k, WORDS[k].reduce((a, w) => a + (s.includes(` ${w}`) ? (w.includes(' ') ? 2 : 1) : 0), 0)] as const)
  const opp = score.find(([k]) => k === 'opponent')![1]
  if (opp > 0 && !/ (perd|lose|losing|lost)/.test(s)) return 'opponent'
  const best = [...score].filter(([k]) => k !== 'opponent').sort((a, b) => b[1] - a[1])[0]
  return best && best[1] > 0 ? best[0] : 'help'
}

type T = TFunction
const pc = (v: number | null | undefined, lang: Lang) => (v == null || !Number.isFinite(v) ? '-' : lang === 'fr' ? `${Math.round(v * 100)}\u202f%` : `${Math.round(v * 100)}%`)
const n1 = (v: number, lang: Lang) => v.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 1 })

/** The answer to one intent, built from the codes of the match. */
export function answer(intent: Intent, ctx: AssistCtx, t: T): Answer {
  const { match, events, lang, nameOf } = ctx
  const opp = match.opponent
  const us = events.filter((e) => e.side === 'us')
  const result = computeNjangi(events)
  const subName = (k: string) => t(`analysis:sub.${k}.name`)
  const shots = shotList(events)
  const sUs = shotStats(shots, 'us'), sThem = shotStats(shots, 'them')
  const lines = playerLines(match, events)
  const of = (...codes: string[]) => us.filter((e) => codes.includes(e.code))
  const thirdsText = (v: [number, number, number]) => t('mola.thirds', { def: v[0], mid: v[1], att: v[2] })

  switch (intent) {
    case 'summary': {
      const out = match.scoreUs > match.scoreThem ? 'win' : match.scoreUs < match.scoreThem ? 'loss' : 'draw'
      const ranked = rankSubs(result)
      const best = ranked[ranked.length - 1], worst = ranked[0]
      const blocks = indiceBlocks(events, match.halfMinutes).filter((b) => b.events >= 15)
      const top = [...blocks].sort((a, b) => b.result.total - a.result.total)[0]
      const low = [...blocks].sort((a, b) => a.result.total - b.result.total)[0]
      const p = [
        t(`mola.sum.${out}`, { team: ctx.teamName, opp, us: match.scoreUs, them: match.scoreThem }),
        t('mola.sum.indice', { v: fmtNjangi(result.total, lang), label: njangiLabel(result.total, lang), best: subName(best), bv: fmtNjangi(result.sub[best], lang), worst: subName(worst), wv: fmtNjangi(result.sub[worst], lang) }),
        t('mola.sum.shots', { us: sUs.total, on: sUs.onTarget, them: sThem.total, opp }),
      ]
      if (top && low && top !== low) p.push(t('mola.sum.blocks', { a: top.from, b: top.to, v: fmtNjangi(top.result.total, lang), c: low.from, d: low.to, w: fmtNjangi(low.result.total, lang) }))
      if (lines[0]) p.push(t('mola.sum.top', { name: nameOf(lines[0].id), n: lines[0].events.length, score: n1(lines[0].score, lang) }))
      if (match.potmId) p.push(t('mola.sum.potm', { name: nameOf(match.potmId) }))
      if (ctx.prev) {
        const d = Math.round((result.total - ctx.prev.result.total) * 10) / 10
        p.push(t(d >= 0 ? 'mola.sum.prevUp' : 'mola.sum.prevDown', { opp: ctx.prev.opponent, d: fmtNjangi(Math.abs(d), lang) }))
      }
      const goals = events.filter((e) => e.code === 'GOAL')
      return { intent, paragraphs: p, clips: goals.length ? [{ label: t('mola.clip.goals'), events: goals }] : undefined }
    }
    case 'trends': {
      const tr = territory(events)
      const n = tr.usTotal || 1
      const p: string[] = []
      if (tr.usTotal) p.push(t('mola.trends.where', { def: pc(tr.us[0] / n, lang), mid: pc(tr.us[1] / n, lang), att: pc(tr.us[2] / n, lang) }))
      const entries = of('FINAL3', 'BOX').filter(isPlaced)
      if (entries.length >= 4) {
        const l = byLane(entries)
        const i = l.indexOf(Math.max(...l))
        p.push(t('mola.trends.lane', { lane: t(`mola.lane.${i}`), share: pc(l[i] / entries.length, lang), n: entries.length }))
      }
      const ps = passStrings(events)
      p.push(t('mola.trends.strings', { count: ps.count, max: ps.longest }))
      p.push(t('mola.trends.progress', { rate: pc(result.progressionRate, lang), k: pc(result.conservation, lang) }))
      const h1 = computeNjangi(events.filter((e) => e.half === 1)), h2 = computeNjangi(events.filter((e) => e.half === 2))
      if (h1.tagged && h2.tagged) p.push(t(h2.total >= h1.total + 3 ? 'mola.trends.halvesUp' : h2.total <= h1.total - 3 ? 'mola.trends.halvesDown' : 'mola.trends.halvesFlat', { h1: fmtNjangi(h1.total, lang), h2: fmtNjangi(h2.total, lang) }))
      if (ctx.prev) p.push(t('mola.trends.prev', { opp: ctx.prev.opponent, a: fmtNjangi(ctx.prev.result.total, lang), b: fmtNjangi(result.total, lang) }))
      const longest = ps.strings.sort((a, b) => b.n - a.n)[0]
      return { intent, paragraphs: p, clips: longest ? [{ label: t('mola.clip.string', { n: longest.n }), events: [longest.first] }] : undefined }
    }
    case 'opponent': {
      const p: string[] = []
      const theirs = shots.filter((s) => s.side === 'them')
      p.push(t('mola.opp.shots', { opp, count: sThem.total, goals: sThem.goals }))
      if (sThem.inBox + sThem.outBox > 0) p.push(t('mola.opp.where', { inBox: sThem.inBox, out: sThem.outBox, m: sThem.avgDist != null ? Math.round(sThem.avgDist) : '-' }))
      if (theirs.length) {
        const h1 = theirs.filter((s) => s.e.half === 1).length
        p.push(t('mola.opp.when', { h1, h2: theirs.length - h1 }))
      }
      const origins = theirShotOrigins(events)
      const after = origins.filter((o) => o.before)
      if (after.length) {
        const th = byThird(after.map((o) => o.before!))
        p.push(t('mola.opp.origin', { count: after.length, total: origins.length, where: thirdsText(th) }))
      }
      const poss = possession(events)
      if (poss.share != null) p.push(t(poss.method === 'passes' ? 'mola.opp.possPasses' : 'mola.opp.possTime', { v: pc(1 - poss.share, lang) }))
      if (opponentCoded(events)) {
        const c = computeNjangi(events, 'them')
        p.push(t('mola.opp.coded', { n: c.passes, acc: pc(c.passAccuracy, lang), f3: c.counts.FINAL3 }))
      } else p.push(t('mola.opp.limit'))
      const clips = [] as { label: string; events: MatchEvent[] }[]
      if (theirs.length) clips.push({ label: t('mola.clip.theirShots'), events: theirs.map((s) => s.e) })
      if (after.length) clips.push({ label: t('mola.clip.lossesBefore'), events: after.map((o) => o.before!) })
      return { intent, paragraphs: p, clips }
    }
    case 'efficiency': {
      const ourShots = shots.filter((s) => s.side === 'us')
      const p = [t('mola.eff.main', { shots: sUs.total, on: sUs.onTarget, onPct: pc(sUs.total ? sUs.onTarget / sUs.total : null, lang), goals: sUs.goals, conv: pc(sUs.conversion, lang) })]
      if (sUs.inBox + sUs.outBox > 0) {
        const gIn = ourShots.filter((s) => s.inBox && s.goal).length, gOut = ourShots.filter((s) => s.inBox === false && s.goal).length
        p.push(t('mola.eff.box', { inBox: sUs.inBox, gIn, out: sUs.outBox, gOut }))
        if (sUs.avgDist != null) p.push(t('mola.eff.dist', { m: Math.round(sUs.avgDist) }))
      }
      const c = result.counts
      if (c.FINAL3 > 0) p.push(t('mola.eff.chain', { f3: c.FINAL3, box: c.BOX, shots: sUs.total, per: n1(sUs.total ? c.FINAL3 / sUs.total : 0, lang) }))
      const shooter = [...lines].sort((a, b) => b.shots - a.shots)[0]
      if (shooter && shooter.shots > 0) p.push(t('mola.eff.who', { name: nameOf(shooter.id), n: shooter.shots, on: shooter.onTarget }))
      p.push(t('mola.eff.compare', { opp, n: sThem.total, g: sThem.goals }))
      return { intent, paragraphs: p, clips: ourShots.length ? [{ label: t('mola.clip.ourShots'), events: ourShots.map((s) => s.e) }] : undefined }
    }
    case 'losses': {
      const lost = of('PASS_LOST', 'LOSS')
      const p = [t('mola.loss.main', { n: lost.length, passes: of('PASS_LOST').length, balls: of('LOSS').length })]
      const placed = lost.filter(isPlaced)
      const th = byThird(placed)
      if (placed.length) {
        p.push(t('mola.loss.third', { where: thirdsText(th) }))
        const ln = byLane(placed)
        p.push(t('mola.loss.lane', { l: ln[0], c: ln[1], r: ln[2] }))
        const origins = theirShotOrigins(events).filter((o) => o.before && isPlaced(o.before) && o.before.x! < 100 / 3)
        p.push(th[0] ? t('mola.loss.danger', { count: th[0], shots: origins.length }) : t('mola.loss.dangerNone'))
      }
      const who = [...lines].sort((a, b) => b.losses - a.losses).filter((l) => l.losses > 0).slice(0, 3)
      if (who.length) p.push(t('mola.loss.who', { list: who.map((l) => `${nameOf(l.id)} (${l.losses})`).join(', ') }))
      p.push(t('mola.loss.react', { rate: pc(result.repriseRate, lang), r5: result.counts.REGAIN5, n: result.losses }))
      const clips: { label: string; events: MatchEvent[] }[] = []
      const own = placed.filter((e) => e.x! < 100 / 3), mid = placed.filter((e) => e.x! >= 100 / 3 && e.x! < 200 / 3)
      if (own.length) clips.push({ label: t('mola.clip.lossOwn', { count: own.length }), events: own })
      if (mid.length) clips.push({ label: t('mola.clip.lossMid', { count: mid.length }), events: mid })
      return { intent, paragraphs: p, clips }
    }
    case 'strengths': {
      const ranked = [...rankSubs(result)].reverse()
      const bullets = ranked.map((k) => t('mola.str.row', { name: subName(k), v: fmtNjangi(result.sub[k], lang), level: t(`analysis:level.${subLevel(result.sub[k])}`) }))
      const best = ranked[0], worst = ranked[ranked.length - 1]
      return {
        intent, bullets,
        paragraphs: [
          t('mola.str.lead'),
          t('mola.str.best', { name: subName(best), what: t(`analysis:sub.${best}.what`) }),
          t('mola.str.worst', { name: subName(worst), drills: DRILLS_FOR[worst].join(', ') }),
        ],
      }
    }
    case 'players': {
      const top = lines.slice(0, 3)
      const bullets = top.map((l) => t('mola.pl.row', { name: nameOf(l.id), score: n1(l.score, lang), prog: l.progressive, reg: l.regains, shots: l.shots }))
      const p = [t('mola.pl.lead')]
      const passer = [...lines].sort((a, b) => b.passOk - a.passOk)[0]
      if (passer?.passes) p.push(t('mola.pl.passer', { name: nameOf(passer.id), ok: passer.passOk, n: passer.passes, acc: pc(passer.accuracy, lang) }))
      const reg = [...lines].sort((a, b) => b.regains - a.regains)[0]
      if (reg?.regains) p.push(t('mola.pl.regainer', { name: nameOf(reg.id), n: reg.regains, r5: reg.regain5 }))
      p.push(match.potmId ? t('mola.pl.potm', { name: nameOf(match.potmId) }) : t('mola.pl.noPotm'))
      return { intent, paragraphs: p, bullets, clips: top[0] ? [{ label: t('mola.clip.player', { name: nameOf(top[0].id) }), events: top[0].events.filter((e) => ['PROG', 'LINE', 'BOX', 'SHOT', 'REGAIN5', 'GOAL'].includes(e.code)) }] : undefined }
    }
    case 'pressing': {
      const r5 = of('REGAIN5'), r = of('REGAIN')
      const p = [t('mola.press.main', { r5: r5.length, r: r.length, rate: pc(result.repriseRate, lang) })]
      const placed = [...r5, ...r].filter(isPlaced)
      if (placed.length) { const th = byThird(placed); p.push(t('mola.press.where', { where: thirdsText(th), high: th[2] })) }
      p.push(t(result.repriseRate >= 0.4 ? 'mola.press.good' : 'mola.press.work'))
      return { intent, paragraphs: p, clips: r5.length ? [{ label: t('mola.clip.regain5'), events: r5 }] : undefined }
    }
    case 'possession': {
      const poss = possession(events)
      const ps = passStrings(events)
      const tilt = fieldTilt(events)
      const p = [poss.share != null ? t(poss.method === 'passes' ? 'mola.poss.passes' : 'mola.poss.time', { v: pc(poss.share, lang) }) : t('mola.poss.none')]
      p.push(t('mola.poss.keep', { k: pc(result.conservation, lang), ok: result.counts.PASS_OK, n: result.passes }))
      p.push(t('mola.trends.strings', { count: ps.count, max: ps.longest }))
      p.push(tilt.value != null ? t('mola.poss.tilt', { v: pc(tilt.value, lang) }) : t('mola.poss.noTilt'))
      return { intent, paragraphs: p }
    }
    default:
      return { intent: 'help', paragraphs: [t('mola.help', { n: events.length })] }
  }
}
