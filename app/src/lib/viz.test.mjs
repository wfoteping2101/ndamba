// Tests of the visualisation computations. Run: node src/lib/viz.test.mjs   (Node 22+, strips the TypeScript types)
// proMatch.ts imports './util' without an extension (Vite resolves it): teach Node the same before loading
import { register } from 'node:module'
register('data:text/javascript,' + encodeURIComponent('export async function resolve(s, c, next) { try { return await next(s, c) } catch (e) { if (s.startsWith(".") && !/\\.[a-z]+$/.test(s)) return next(s + ".ts", c); throw e } }'))
const {
  shotList, shotStats, passNetwork, passEnds, passStrings, density, byThird, territory, fieldTilt, possession, momentum, indiceBlocks,
  substitutions, playerLines, minuteText, videoHref, digest, seasonAverages, versusValues, inTheirBox, theirShotOrigins,
} = await import('./viz.ts')
const { proDemoEvents, locateProMatch, PRO_PAST_GOALS, PRO_ROSTER } = await import('./proMatch.ts')
const { computeNjangi } = await import('./njangi.ts')

let pass = 0, fail = 0
const ok = (label, cond, info = '') => { if (cond) pass++; else { fail++; console.log('FAIL', label, info) } }
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps
let n = 0
const ev = (half, t, code, side = 'us', extra = {}) => ({ id: `e${++n}`, matchId: 'm', half, t, code, side, createdAt: '', ...extra })

// ---- shots: SHOT_IN and GOAL attach to the closest shot of the same side
{
  const es = [
    ev(1, 100, 'SHOT', 'us', { x: 90, y: 50, playerId: 'a' }), ev(1, 100, 'SHOT_IN', 'us', { playerId: 'a' }), ev(1, 100, 'GOAL', 'us', { playerId: 'a' }),
    ev(1, 400, 'SHOT', 'us', { x: 70, y: 30, playerId: 'b' }),
    ev(2, 50, 'SHOT', 'them', { x: 10, y: 45 }), ev(2, 50, 'GOAL', 'them'),
    ev(2, 300, 'SHOT', 'them'),
  ]
  const s = shotList(es)
  const us = shotStats(s, 'us'), them = shotStats(s, 'them')
  ok('us shots', us.total === 2 && us.onTarget === 1 && us.goals === 1, JSON.stringify(us))
  ok('us box split', us.inBox === 1 && us.outBox === 1 && us.unplaced === 0, JSON.stringify(us))
  ok('them shots', them.total === 2 && them.goals === 1 && them.onTarget === 1 && them.inBox === 1 && them.unplaced === 1, JSON.stringify(them))
  ok('conversion', near(us.conversion, 0.5))
  ok('box geometry', inTheirBox(90, 50) && !inTheirBox(80, 50) && !inTheirBox(90, 10))
  // a goal coded alone still counts as a shot on target
  const lone = shotStats(shotList([ev(1, 10, 'GOAL', 'us')]), 'us')
  ok('lone goal', lone.total === 1 && lone.goals === 1 && lone.onTarget === 1)
}

// ---- passing network, pass ends and strings
{
  const es = [
    ev(1, 10, 'PASS_OK', 'us', { playerId: 'a', toPlayerId: 'b', x: 20, y: 50 }),
    ev(1, 13, 'PASS_OK', 'us', { playerId: 'b', toPlayerId: 'a', x: 40, y: 40 }),
    ev(1, 16, 'PASS_OK', 'us', { playerId: 'a', toPlayerId: 'b', x: 30, y: 50 }),
    ev(1, 19, 'PASS_OK', 'us', { playerId: 'b', toPlayerId: 'c', x: 50, y: 40 }),
    ev(1, 21, 'PROG', 'us', { playerId: 'b', x: 50, y: 40 }),
    ev(1, 24, 'PASS_OK', 'us', { playerId: 'c', x: 60, y: 70 }),
    ev(1, 28, 'PASS_LOST', 'us', { playerId: 'a', x: 62, y: 60 }),
    ev(1, 40, 'REGAIN', 'us', { playerId: 'b', x: 30, y: 30 }),
    ev(1, 42, 'PASS_OK', 'us', { playerId: 'b', x: 30, y: 30 }),
  ]
  const net = passNetwork(es)
  const a = net.nodes.find((x) => x.id === 'a')
  ok('node a average', a && near(a.x, (20 + 30 + 62) / 3) && a.passes === 3 && a.completed === 2, JSON.stringify(a))
  const ab = net.links.find((l) => l.a === 'a' && l.b === 'b')
  ok('link a-b', ab && ab.n === 3 && ab.ab === 2 && ab.ba === 1, JSON.stringify(net.links))
  ok('completed with receiver', net.completed === 4, String(net.completed))
  const ends = passEnds(es)
  ok('pass end is the receiver next action', ends.get(es[0].id)?.x === 40 && ends.get(es[3].id)?.x === 60)
  const st = passStrings(es)
  ok('pass strings', st.count === 1 && st.longest === 5, JSON.stringify(st.strings.map((s) => s.n)))
}

// ---- density and thirds
{
  const g = density([{ x: 10, y: 50 }, { x: 12, y: 52 }], 84, 54, 7)
  let maxAt = 0
  for (let i = 0; i < g.v.length; i++) if (g.v[i] === g.max) maxAt = i
  const col = maxAt % g.cols
  ok('density peaks near the points', col / g.cols < 0.2 && g.max > 1, `col ${col}`)
  const t = byThird([{ x: 10, y: 1 }, { x: 50, y: 1 }, { x: 90, y: 1 }, { x: 95, y: 1 }, { y: 5 }])
  ok('thirds', JSON.stringify(t) === '[1,1,2]', JSON.stringify(t))
}

// ---- territory, tilt and possession
{
  const es = [ev(1, 5, 'PASS_OK', 'us', { x: 80, y: 40 }), ev(1, 9, 'PASS_OK', 'us', { x: 50, y: 40 }), ev(1, 12, 'PASS_OK', 'them', { x: 20, y: 50 }), ev(1, 15, 'PASS_LOST', 'them', { x: 80, y: 50 })]
  const tr = territory(es)
  ok('territory with opponent', tr.them && tr.us[2] === 1 && tr.them[0] === 1)
  const tl = fieldTilt(es)
  ok('field tilt by positions', tl.method === 'positions' && near(tl.value, 0.5), JSON.stringify(tl))
  const p = possession(es)
  ok('possession by passes', p.method === 'passes' && near(p.share, 0.5))
  const onlyShots = [ev(1, 5, 'PASS_OK', 'us', { x: 80, y: 40 }), ev(1, 40, 'SHOT', 'them', { x: 10, y: 50 })]
  ok('no tilt without opponent codes', fieldTilt(onlyShots).value === null && territory(onlyShots).them === null)
  // time estimate: 20 s ours, 40 s theirs, repeated
  const seq = []
  for (let k = 0; k < 20; k++) { const b = k * 60; seq.push(ev(1, b, 'REGAIN', 'us'), ev(1, b + 10, 'PASS_OK', 'us'), ev(1, b + 20, 'LOSS', 'us')) }
  const pt = possession(seq)
  ok('possession by time', pt.method === 'time' && near(pt.share, 1 / 3, 0.02), JSON.stringify(pt))
}

// ---- momentum, blocks, minutes, subs
{
  const es = [ev(1, 60, 'FINAL3'), ev(1, 70, 'BOX'), ev(1, 80, 'SHOT'), ev(1, 80, 'SHOT_IN'), ev(1, 200, 'SHOT', 'them'), ev(2, 30, 'GOAL', 'them'), ev(2, 30, 'SHOT', 'them')]
  const m = momentum(es, 45)
  const at2 = m.find((p) => p.half === 1 && p.minute === 2)
  ok('momentum window', at2 && at2.us === 7 && at2.them === 0, JSON.stringify(at2))
  const at4 = m.find((p) => p.half === 1 && p.minute === 4)
  ok('momentum net', at4 && at4.us === 7 && at4.them === 3 && at4.net === 4, JSON.stringify(at4))
  const at46 = m.find((p) => p.half === 2 && p.minute === 46)
  ok('second half minutes', at46 && at46.them === 5, JSON.stringify(at46))
  ok('length', m.filter((p) => p.half === 1).length === 45)
  const blocks = indiceBlocks(es, 45)
  ok('blocks of 15', blocks.length === 6 && blocks[3].from === 45 && blocks[5].to === 90, JSON.stringify(blocks.map((b) => [b.from, b.to])))
  ok('youth blocks', indiceBlocks(es, 35).filter((b) => b.half === 1).map((b) => b.to - b.from).join() === '15,20')
  ok('minute text', minuteText({ half: 2, t: 0 }, 45) === "46'" && minuteText({ half: 1, t: 2760 }, 45) === "45+2'" && minuteText({ half: 1, t: 59 }, 45) === "1'")
  const match = { lineup: [{ slot: 'a', playerId: 'p1' }, { slot: 'b', playerId: 'p2' }], subs: ['p3', 'p4'], halfMinutes: 45, minutes: { p1: 90, p2: 66, p3: 24, p4: 0 } }
  const subs = substitutions(match)
  ok('substitutions', subs.length === 1 && subs[0].minute === 66 && subs[0].off === 'p2' && subs[0].on === 'p3', JSON.stringify(subs))
  ok('video href', videoHref('v1', [100.26, 130]) === '/app/analyse/video/v1?t=97&list=100.3,130' && videoHref('v1', [2]) === '/app/analyse/video/v1?t=0')
}

// ---- the professional demo match: plausible shapes
{
  const players = PRO_ROSTER.map((r, i) => ({ id: `pl_${i + 1}`, teamId: 't', name: r[0], number: r[1], position: r[2], skills: {}, createdAt: '' }))
  const evs = proDemoEvents('ma_past', players, PRO_PAST_GOALS)
  locateProMatch(evs)
  const placedShare = evs.filter((e) => typeof e.x === 'number').length / evs.length
  ok('demo placed', placedShare > 0.99, String(placedShare))
  const shots = shotList(evs)
  const us = shotStats(shots, 'us'), them = shotStats(shots, 'them')
  ok('demo shots us', us.total === 14 && us.onTarget === 6 && us.goals === 2, JSON.stringify(us))
  ok('demo shots them', them.total === 9 && them.goals === 1, JSON.stringify(them))
  ok('demo our shots mostly in their half', shots.filter((s) => s.side === 'us').every((s) => s.e.x > 60))
  ok('demo their shots near our goal', shots.filter((s) => s.side === 'them' && s.e.x != null).every((s) => s.e.x < 30))
  const net = passNetwork(evs)
  ok('demo network', net.nodes.length >= 11 && net.links.length >= 20 && net.completed > 250, `${net.nodes.length} ${net.links.length} ${net.completed}`)
  const gk = net.nodes.find((x) => x.id === 'pl_1'), st = net.nodes.find((x) => x.id === 'pl_9')
  ok('demo network shape', gk && st && gk.x < 40 && st.x > gk.x + 30, `${gk?.x} ${st?.x}`)
  const p = possession(evs)
  ok('demo possession estimate', p.method === 'time' && p.share > 0.35 && p.share < 0.8, JSON.stringify(p))
  const ps = passStrings(evs)
  ok('demo pass strings', ps.count > 5 && ps.longest >= 8, JSON.stringify({ c: ps.count, l: ps.longest }))
  const match = { id: 'ma_past', lineup: [], subs: [], halfMinutes: 45, scoreUs: 2, scoreThem: 1, status: 'done', minutes: undefined }
  const d = digest(match, evs)
  ok('digest indice equals report', near(d.result.total, computeNjangi(evs).total) && near(d.result.total, 67.9, 0.05), String(d.result.total))
  const avg = seasonAverages([d, d])
  ok('season indice from counts', near(avg.indice.total, d.result.total) && avg.goals.value === 2)
  const vs = versusValues([d])
  ok('versus values', vs.us.goals === 2 && vs.them.goals === 1 && vs.them.passesOk === null && vs.us.winRate === 1 && vs.them.winRate === 0)
  const origins = theirShotOrigins(evs)
  ok('their shot origins', origins.length === 9 && origins.some((o) => o.before), String(origins.filter((o) => o.before).length))
  const lines = playerLines({ lineup: [{ slot: 'GK', playerId: 'pl_1' }], subs: [], halfMinutes: 45 }, evs)
  ok('player lines', lines.length >= 14 && lines[0].score > 0 && lines.some((l) => l.id === 'pl_9' && l.goals === 1), lines.slice(0, 3).map((l) => `${l.id}:${l.score}`).join(' '))
  const blocks = indiceBlocks(evs, 45)
  ok('demo blocks', blocks.length === 6 && blocks.every((b) => b.result.total > 0), blocks.map((b) => b.result.total).join(' '))
  const mom = momentum(evs, 45)
  ok('demo momentum', mom.length >= 90 && Math.max(...mom.map((m) => m.us)) > 5, String(mom.length))
}

// ---- Coach Assist: free questions in French and English find their intent
{
  const { detectIntent } = await import('../surfaces/analysis/components/viz/assist.ts')
  const cases = [
    ['Résume le match', 'summary'], ['Fais-moi un bilan rapide', 'summary'], ['Sum up the match', 'summary'],
    ['Nos tendances', 'trends'], ['what are our trends?', 'trends'],
    ['Leur façon de jouer', 'opponent'], ['How did they play?', 'opponent'], ['leurs tirs venaient d\'où ?', 'opponent'],
    ['Notre efficacité devant le but', 'efficiency'], ['are we clinical enough in front of goal', 'efficiency'],
    ['Où perdons-nous le ballon ?', 'losses'], ['where do we lose the ball', 'losses'],
    ['Qui a le plus pesé ?', 'players'], ['who was our best player', 'players'],
    ['notre pressing après la perte', 'pressing'], ['comment on garde le ballon ?', 'possession'], ['how well do we keep the ball', 'possession'],
    ['forces et faiblesses', 'strengths'], ['bonjour', 'help'], ['', 'help'],
  ]
  for (const [q, want] of cases) { const got = detectIntent(q); ok(`intent "${q}"`, got === want, `got ${got}, want ${want}`) }
}

console.log(`${pass} passed, ${fail} failed (${pass + fail} checks)`)
if (fail) process.exit(1)
