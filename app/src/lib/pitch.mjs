// GENERATED from tools/pitch.mjs, do not edit here.
// Njangi pitch diagrams: one JSON spec, one SVG, used by both books and the app.
// No dependencies. Works in Node and in the browser.
//
//   import { renderDiagram, validateDiagram } from './pitch.mjs'
//   const svg = renderDiagram(spec, { width: 640 })
//
// Spec (meters; team "a" attacks to the right):
//   view: "grid" | "half" | "third" | "full"; w, h (grid only)
//   players: [{ id, team: "a"|"b"|"n"|"gk"|"gkb", x, y, label? }]
//   ball: playerId | [x, y]
//   arrows: [{ from: id|[x,y], to: id|[x,y], kind: "pass"|"run"|"dribble"|"shot"|"press", n? }]
//   zones: [{ x, y, w, h, label?, tone: "a"|"b"|"n"|"soft" }]
//   labels: [{ x, y, text }]
//   goals: [{ x, y, side: "left"|"right"|"top"|"bottom", size: "mini"|"full" }]  (grid only)
//   cones: [[x, y], ...]

export const PALETTE = {
  paper: '#FBF7EE',
  turf: '#EDF2E3',
  turfStripe: '#E5ECD9',
  line: '#2E6B4A',
  ink: '#1D2621',
  a: '#1F4D3A',
  aText: '#FFFFFF',
  b: '#B8432F',
  bText: '#FFFFFF',
  n: '#E3A92B',
  nText: '#2A1F05',
  gk: '#3D4F6B',
  gkText: '#FFFFFF',
  gkb: '#6B4A7A',
  gkbText: '#FFFFFF',
  pass: '#1D2621',
  shot: '#C5762F',
  press: '#B8432F',
  cone: '#E07A2E',
  zoneA: 'rgba(31,77,58,0.13)',
  zoneB: 'rgba(184,67,47,0.12)',
  zoneN: 'rgba(227,169,43,0.20)',
  zoneSoft: 'rgba(29,38,33,0.06)',
  zoneLabel: '#2E6B4A',
}

const VIEWS = {
  full: { w: 105, h: 68 },
  half: { w: 52.5, h: 68 },
  third: { w: 35, h: 68 },
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const r2 = (v) => Math.round(v * 100) / 100

export function viewSize(spec) {
  if (spec.view === 'grid') return { w: Number(spec.w) || 30, h: Number(spec.h) || 20 }
  return VIEWS[spec.view] || VIEWS.half
}

export function validateDiagram(spec) {
  const errors = []
  if (!spec || typeof spec !== 'object') return ['schema is not an object']
  if (!['grid', 'half', 'third', 'full'].includes(spec.view)) errors.push(`view must be grid, half, third or full (got ${spec.view})`)
  if (spec.view === 'grid' && (!(spec.w > 0) || !(spec.h > 0))) errors.push('grid view needs positive w and h')
  const { w, h } = viewSize(spec)
  const ids = new Set()
  for (const p of spec.players || []) {
    if (!p.id) errors.push('a player has no id')
    if (ids.has(p.id)) errors.push(`duplicate player id ${p.id}`)
    ids.add(p.id)
    if (!['a', 'b', 'n', 'gk', 'gkb'].includes(p.team)) errors.push(`player ${p.id}: team must be a, b, n, gk or gkb`)
    if (typeof p.x !== 'number' || typeof p.y !== 'number') errors.push(`player ${p.id}: x and y must be numbers`)
    else if (p.x < -2 || p.x > w + 2 || p.y < -2 || p.y > h + 2) errors.push(`player ${p.id} at (${p.x},${p.y}) is outside the ${w}x${h} view`)
  }
  const pt = (v, what) => {
    if (typeof v === 'string') { if (!ids.has(v)) errors.push(`${what}: unknown player id ${v}`) }
    else if (!Array.isArray(v) || v.length !== 2 || typeof v[0] !== 'number' || typeof v[1] !== 'number') errors.push(`${what}: must be a player id or [x, y]`)
  }
  if (spec.ball !== undefined) pt(spec.ball, 'ball')
  for (const [i, a] of (spec.arrows || []).entries()) {
    pt(a.from, `arrow ${i + 1} from`)
    pt(a.to, `arrow ${i + 1} to`)
    if (!['pass', 'run', 'dribble', 'shot', 'press'].includes(a.kind)) errors.push(`arrow ${i + 1}: kind must be pass, run, dribble, shot or press`)
  }
  for (const z of spec.zones || []) {
    if ([z.x, z.y, z.w, z.h].some((v) => typeof v !== 'number')) errors.push('a zone needs numeric x, y, w, h')
  }
  return errors
}

function pitchMarkings(view, s, P) {
  // s = px per meter; returns SVG for the markings of full/half/third views
  const L = (x1, y1, x2, y2) => `<line x1="${r2(x1 * s)}" y1="${r2(y1 * s)}" x2="${r2(x2 * s)}" y2="${r2(y2 * s)}"/>`
  const R = (x, y, w, h) => `<rect x="${r2(x * s)}" y="${r2(y * s)}" width="${r2(w * s)}" height="${r2(h * s)}" fill="none"/>`
  const out = []
  const H = 68
  const box = (gx, dir) => {
    // gx: goal line x; dir: -1 if box extends to the left of the goal line, +1 to the right
    const bx = dir < 0 ? gx - 16.5 : gx
    out.push(R(bx, (H - 40.32) / 2, 16.5, 40.32))
    const sx = dir < 0 ? gx - 5.5 : gx
    out.push(R(sx, (H - 18.32) / 2, 5.5, 18.32))
    const spot = gx + dir * 11
    out.push(`<circle cx="${r2(spot * s)}" cy="${r2((H / 2) * s)}" r="${r2(0.35 * s)}" fill="${P.line}" stroke="none"/>`)
    // arc outside the box: circle radius 9.15 around spot, the part beyond 16.5
    const edge = gx + dir * 16.5
    const dx = Math.abs(edge - spot)
    const dy = Math.sqrt(9.15 * 9.15 - dx * dx)
    const sweep = dir < 0 ? 0 : 1
    out.push(`<path d="M ${r2(edge * s)} ${r2((H / 2 - dy) * s)} A ${r2(9.15 * s)} ${r2(9.15 * s)} 0 0 ${sweep} ${r2(edge * s)} ${r2((H / 2 + dy) * s)}" fill="none"/>`)
    // goal
    const gw = 7.32, gd = 1.6
    const gxx = dir < 0 ? gx : gx - gd
    out.push(`<rect x="${r2(gxx * s)}" y="${r2(((H - gw) / 2) * s)}" width="${r2(gd * s)}" height="${r2(gw * s)}" fill="${P.paper}" stroke-width="2"/>`)
  }
  if (view === 'full') {
    out.push(R(0, 0, 105, H))
    out.push(L(52.5, 0, 52.5, H))
    out.push(`<circle cx="${r2(52.5 * s)}" cy="${r2((H / 2) * s)}" r="${r2(9.15 * s)}" fill="none"/>`)
    out.push(`<circle cx="${r2(52.5 * s)}" cy="${r2((H / 2) * s)}" r="${r2(0.35 * s)}" fill="${P.line}" stroke="none"/>`)
    box(0, 1)
    box(105, -1)
  } else if (view === 'half') {
    out.push(R(0, 0, 52.5, H))
    out.push(`<path d="M ${r2(0)} ${r2((H / 2 - 9.15) * s)} A ${r2(9.15 * s)} ${r2(9.15 * s)} 0 0 1 ${r2(0)} ${r2((H / 2 + 9.15) * s)}" fill="none"/>`)
    box(52.5, -1)
  } else if (view === 'third') {
    out.push(R(0, 0, 35, H))
    box(35, -1)
  }
  return out.join('')
}

function anchor(v, players) {
  if (typeof v === 'string') {
    const p = players.find((q) => q.id === v)
    return p ? { x: p.x, y: p.y, p } : null
  }
  return { x: v[0], y: v[1], p: null }
}

function wavyPath(x1, y1, x2, y2, amp, wave) {
  const dx = x2 - x1, dy = y2 - y1
  const len = Math.hypot(dx, dy)
  if (len < 1) return `M ${r2(x1)} ${r2(y1)} L ${r2(x2)} ${r2(y2)}`
  const ux = dx / len, uy = dy / len
  const nx = -uy, ny = ux
  const straightEnd = Math.min(len * 0.22, 18)
  const waveLen = len - straightEnd
  const n = Math.max(2, Math.round(waveLen / wave))
  const pts = []
  const steps = n * 8
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * waveLen
    const off = Math.sin((i / steps) * n * Math.PI * 2) * amp
    pts.push([x1 + ux * t + nx * off, y1 + uy * t + ny * off])
  }
  pts.push([x2, y2])
  return 'M ' + pts.map(([a, b]) => `${r2(a)} ${r2(b)}`).join(' L ')
}

export function renderDiagram(spec, opts = {}) {
  const P = { ...PALETTE, ...(opts.palette || {}) }
  const { w, h } = viewSize(spec)
  const targetW = opts.width || 640
  let pad = opts.pad ?? 14
  // goals drawn outside an end line need room, or they are clipped at the image edge
  {
    const s0 = (targetW - pad * 2) / w
    let need = 0
    for (const g of spec.goals || []) {
      const gd = Math.max(5, (g.size === 'full' ? 1.6 : 1) * s0)
      const out = (g.side === 'left' && g.x <= 0.01) || (g.side === 'right' && g.x >= w - 0.01) || (g.side === 'top' && g.y <= 0.01) || (g.side === 'bottom' && g.y >= h - 0.01)
      if (out) need = Math.max(need, gd + 4)
    }
    if (need > pad) pad = Math.ceil(need)
  }
  const s = (targetW - pad * 2) / w
  const W = r2(w * s + pad * 2)
  const Hh = r2(h * s + pad * 2)
  const players = spec.players || []
  const pr = Math.max(9, Math.min(15, s * (spec.view === 'grid' ? 0.9 : 1.55)))
  const font = opts.font || "Inter, 'Helvetica Neue', Arial, sans-serif"
  const uid = 'd' + Math.random().toString(36).slice(2, 8)
  const out = []
  const title = opts.title ? `<title>${esc(opts.title)}</title>` : ''
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${Hh}" width="${W}" height="${Hh}" role="img" font-family="${esc(font)}">${title}`)
  out.push(`<defs>
<marker id="${uid}-ah" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${P.pass}"/></marker>
<marker id="${uid}-aha" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${P.a}"/></marker>
<marker id="${uid}-ahb" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${P.b}"/></marker>
<marker id="${uid}-ahs" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${P.shot}"/></marker>
<pattern id="${uid}-turf" width="${r2(Math.max(8, s * (spec.view === 'grid' ? Math.max(2, w / 8) : 7)) * 2)}" height="10" patternUnits="userSpaceOnUse"><rect width="100%" height="10" fill="${P.turf}"/><rect width="50%" height="10" fill="${P.turfStripe}"/></pattern>
</defs>`)
  out.push(`<rect width="${W}" height="${Hh}" fill="${P.paper}" rx="${opts.radius ?? 10}"/>`)
  out.push(`<g transform="translate(${pad},${pad})">`)
  // turf
  out.push(`<rect x="0" y="0" width="${r2(w * s)}" height="${r2(h * s)}" fill="url(#${uid}-turf)"/>`)
  // zones (under markings)
  const toneFill = { a: P.zoneA, b: P.zoneB, n: P.zoneN, soft: P.zoneSoft }
  for (const z of spec.zones || []) {
    out.push(`<rect x="${r2(z.x * s)}" y="${r2(z.y * s)}" width="${r2(z.w * s)}" height="${r2(z.h * s)}" fill="${toneFill[z.tone] || P.zoneSoft}" rx="3"/>`)
  }
  // markings
  out.push(`<g stroke="${P.line}" stroke-width="1.5" fill="none" stroke-linejoin="round">`)
  if (spec.view === 'grid') {
    out.push(`<rect x="0" y="0" width="${r2(w * s)}" height="${r2(h * s)}" fill="none" stroke-dasharray="1 0"/>`)
  } else {
    out.push(pitchMarkings(spec.view, s, P))
  }
  out.push(`</g>`)
  // zone labels
  for (const z of spec.zones || []) {
    if (!z.label) continue
    out.push(`<text x="${r2(z.x * s + 6)}" y="${r2(z.y * s + 14)}" font-size="11" font-weight="700" letter-spacing="0.6" fill="${P.zoneLabel}" style="text-transform:uppercase">${esc(z.label)}</text>`)
  }
  // grid corner cones by default + explicit cones
  const cones = spec.cones || (spec.view === 'grid' ? [[0, 0], [w, 0], [0, h], [w, h]] : [])
  for (const [cx, cy] of cones) {
    const x = cx * s, y = cy * s, c = 5.5
    out.push(`<path d="M ${r2(x)} ${r2(y - c)} L ${r2(x + c)} ${r2(y + c * 0.75)} L ${r2(x - c)} ${r2(y + c * 0.75)} Z" fill="${P.cone}" stroke="#FFFFFF" stroke-width="1"/>`)
  }
  // mini goals in grid view
  for (const g of spec.goals || []) {
    const big = g.size === 'full'
    const gw = (big ? 7.32 : 3) * s, gd = Math.max(5, (big ? 1.6 : 1) * s)
    let x = g.x * s, y = g.y * s, rw, rh
    if (g.side === 'left' || g.side === 'right') { rw = gd; rh = gw; y -= gw / 2; if (g.side === 'right') x = x; else x -= gd }
    else { rw = gw; rh = gd; x -= gw / 2; if (g.side === 'top') y -= gd }
    out.push(`<rect x="${r2(x)}" y="${r2(y)}" width="${r2(rw)}" height="${r2(rh)}" fill="${P.paper}" stroke="${P.line}" stroke-width="2.2"/>`)
  }
  // arrows
  const arrows = spec.arrows || []
  const badges = []
  for (const a of arrows) {
    const A = anchor(a.from, players), B = anchor(a.to, players)
    if (!A || !B) continue
    let x1 = A.x * s, y1 = A.y * s, x2 = B.x * s, y2 = B.y * s
    const len = Math.hypot(x2 - x1, y2 - y1) || 1
    const ux = (x2 - x1) / len, uy = (y2 - y1) / len
    const startGap = A.p ? pr + 2 : 0
    const endGap = B.p ? pr + 4 : 2
    x1 += ux * startGap; y1 += uy * startGap; x2 -= ux * endGap; y2 -= uy * endGap
    const fromTeam = A.p ? A.p.team : 'a'
    const teamColor = fromTeam === 'b' || fromTeam === 'gkb' ? P.b : P.a
    const marker = fromTeam === 'b' || fromTeam === 'gkb' ? `${uid}-ahb` : `${uid}-aha`
    if (a.kind === 'pass') {
      out.push(`<line x1="${r2(x1)}" y1="${r2(y1)}" x2="${r2(x2)}" y2="${r2(y2)}" stroke="${P.pass}" stroke-width="2.2" stroke-linecap="round" marker-end="url(#${uid}-ah)"/>`)
    } else if (a.kind === 'run') {
      out.push(`<line x1="${r2(x1)}" y1="${r2(y1)}" x2="${r2(x2)}" y2="${r2(y2)}" stroke="${teamColor}" stroke-width="2.2" stroke-dasharray="6 5" stroke-linecap="round" marker-end="url(#${marker})"/>`)
    } else if (a.kind === 'dribble') {
      out.push(`<path d="${wavyPath(x1, y1, x2, y2, 3.2, 11)}" stroke="${teamColor}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#${marker})"/>`)
    } else if (a.kind === 'shot') {
      out.push(`<line x1="${r2(x1)}" y1="${r2(y1)}" x2="${r2(x2)}" y2="${r2(y2)}" stroke="${P.shot}" stroke-width="4" stroke-linecap="round" marker-end="url(#${uid}-ahs)"/>`)
    } else if (a.kind === 'press') {
      out.push(`<line x1="${r2(x1)}" y1="${r2(y1)}" x2="${r2(x2)}" y2="${r2(y2)}" stroke="${fromTeam === 'a' || fromTeam === 'gk' ? P.a : P.press}" stroke-width="2.6" stroke-dasharray="2 4" stroke-linecap="round" marker-end="url(#${fromTeam === 'a' || fromTeam === 'gk' ? `${uid}-aha` : `${uid}-ahb`})"/>`)
    }
    if (a.n !== undefined && a.n !== null) {
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
      badges.push(`<g><circle cx="${r2(mx + uy * 10)}" cy="${r2(my - ux * 10)}" r="8" fill="${P.paper}" stroke="${P.ink}" stroke-width="1.3"/><text x="${r2(mx + uy * 10)}" y="${r2(my - ux * 10 + 3.6)}" text-anchor="middle" font-size="10" font-weight="800" fill="${P.ink}">${esc(a.n)}</text></g>`)
    }
  }
  // players
  const teamFill = { a: [P.a, P.aText], b: [P.b, P.bText], n: [P.n, P.nText], gk: [P.gk, P.gkText], gkb: [P.gkb, P.gkbText] }
  for (const p of players) {
    const [fill, text] = teamFill[p.team] || teamFill.a
    const x = p.x * s, y = p.y * s
    out.push(`<g><circle cx="${r2(x)}" cy="${r2(y + 1.6)}" r="${r2(pr)}" fill="rgba(0,0,0,0.14)"/><circle cx="${r2(x)}" cy="${r2(y)}" r="${r2(pr)}" fill="${fill}" stroke="#FFFFFF" stroke-width="2"/>`)
    if (p.label) {
      const fs = String(p.label).length > 2 ? pr * 0.72 : pr * 0.95
      out.push(`<text x="${r2(x)}" y="${r2(y + fs * 0.36)}" text-anchor="middle" font-size="${r2(fs)}" font-weight="800" fill="${text}">${esc(p.label)}</text>`)
    }
    out.push(`</g>`)
  }
  // ball
  if (spec.ball !== undefined) {
    const B = anchor(spec.ball, players)
    if (B) {
      const bx = B.x * s + (B.p ? pr * 0.85 : 0), by = B.y * s - (B.p ? pr * 0.85 : 0)
      const br = Math.max(4.5, pr * 0.42)
      out.push(`<g><circle cx="${r2(bx)}" cy="${r2(by)}" r="${r2(br)}" fill="#FFFFFF" stroke="${P.ink}" stroke-width="1.4"/><path d="M ${r2(bx - br * 0.45)} ${r2(by - br * 0.1)} l ${r2(br * 0.45)} ${r2(-br * 0.35)} l ${r2(br * 0.45)} ${r2(br * 0.35)} l ${r2(-br * 0.17)} ${r2(br * 0.55)} h ${r2(-br * 0.56)} z" fill="${P.ink}"/></g>`)
    }
  }
  out.push(badges.join(''))
  // labels
  for (const l of spec.labels || []) {
    out.push(`<text x="${r2(l.x * s)}" y="${r2(l.y * s)}" text-anchor="middle" font-size="12" font-weight="700" fill="${P.ink}" stroke="${P.paper}" stroke-width="4" paint-order="stroke" stroke-linejoin="round">${esc(l.text)}</text>`)
  }
  out.push(`</g></svg>`)
  return out.join('')
}
