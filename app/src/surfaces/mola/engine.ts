// Mola language engine: a rules-based bilingual parser (French first, English second).
// Pure functions with no runtime imports, so it also runs in Node for the tests (engine.test.mjs).
// Accents, case and small typos are tolerated (normalisation + Damerau distance on keywords).
import type { Intention, MD, Role, SkillKey } from '../../lib/types'

export type Lang = 'fr' | 'en'
export type IntentId =
  | 'plan_week' | 'create_session' | 'setup_match' | 'add_player' | 'create_team' | 'send_convocation' | 'export_calendar'
  | 'analyze_last_match' | 'recommend_drills' | 'open_lesson' | 'open_book'
  | 'help' | 'small_talk' | 'confirm' | 'deny' | 'unknown'

export const ACTION_INTENTS: IntentId[] = ['plan_week', 'create_session', 'setup_match', 'add_player', 'create_team', 'send_convocation', 'export_calendar', 'analyze_last_match', 'recommend_drills', 'open_lesson', 'open_book']
export const ALL_INTENTS: IntentId[] = [...ACTION_INTENTS, 'help', 'small_talk', 'confirm', 'deny', 'unknown']

export type Channel = 'whatsapp' | 'sms' | 'email' | 'copy'
export type Talk = 'greet' | 'thanks' | 'how' | 'who' | 'bye' | 'praise'

export interface Slots {
  md?: MD
  intention?: Intention
  skill?: SkillKey
  minutes?: number
  date?: string // YYYY-MM-DD
  time?: string // HH:MM
  opponent?: string
  venue?: string
  home?: boolean
  name?: string
  names?: string[]
  number?: number
  position?: string
  birthYear?: number
  channel?: Channel
  to?: string
  ageGroup?: string
  format?: 5 | 7 | 8 | 9 | 11
  lessonNo?: number
  chapterNo?: number
  book?: 'tome1' | 'methode'
  talk?: Talk
}

export interface Parsed { intent: IntentId; slots: Slots; score: number; source: 'rules' | 'llm' }

/* ------------------------------------------------------------------ */
/* Normalisation                                                       */
/* ------------------------------------------------------------------ */

const SPECIAL: Record<string, string> = { 'œ': 'oe', 'æ': 'ae', '’': "'", '‘': "'", '`': "'", '´': "'", '«': '"', '»': '"', '“': '"', '”': '"', '°': 'o', '–': '-', '—': '-' }

/** Lower case, no accents, same punctuation. Returns the normalised text and, for each of its characters, the index in the original. */
export function normMap(s: string): { n: string; map: number[] } {
  let n = ''
  const map: number[] = []
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    let out = SPECIAL[c] ?? SPECIAL[c.toLowerCase()]
    if (out === undefined) out = c.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    for (const o of out) { n += o; map.push(i) }
  }
  return { n, map }
}

/** Normalised text for keyword scoring: no accents, no punctuation except - + : / ' #, single spaces. */
export function norm(s: string) {
  return normMap(s).n
    .replace(/n\s?o\s?(?=\d)/g, 'numero ') // n°9 -> numero 9
    .replace(/#\s?(?=\d)/g, 'numero ')
    .replace(/[!?;,.()[\]{}"*_~<>|\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export const tokens = (n: string) => n.split(/[\s']+/).filter(Boolean)

/** Optimal string alignment distance (Damerau), bounded. */
export function dist(a: string, b: string, max = 2) {
  if (a === b) return 0
  if (Math.abs(a.length - b.length) > max) return max + 1
  const d: number[][] = []
  for (let i = 0; i <= a.length; i++) { d.push([i]); for (let j = 1; j <= b.length; j++) d[i].push(i === 0 ? j : 0) }
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let v = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2][j - 2] + 1)
      d[i][j] = v
      rowMin = Math.min(rowMin, v)
    }
    if (rowMin > max) return max + 1
  }
  return d[a.length][b.length]
}

const tol = (w: string) => (w.length >= 9 ? 2 : w.length >= 5 ? 1 : 0)
/** Word equality with typo tolerance. A keyword starting with "=" is matched exactly; ending with "*" is a prefix. */
export function wordEq(tok: string, kw: string) {
  if (kw.startsWith('=')) return tok === kw.slice(1)
  if (kw.endsWith('*')) return tok.startsWith(kw.slice(0, -1))
  if (tok === kw) return true
  const t = tol(kw)
  return t > 0 && tok.length >= 4 && dist(tok, kw, t) <= t
}

/** Does the token list contain this (possibly multi-word) phrase? */
export function hasPhrase(toks: string[], phrase: string) {
  const p = tokens(phrase)
  if (!p.length) return false
  outer: for (let i = 0; i + p.length <= toks.length; i++) {
    for (let j = 0; j < p.length; j++) if (!wordEq(toks[i + j], p[j])) continue outer
    return true
  }
  return false
}
const any = (toks: string[], list: string[]) => list.some((k) => hasPhrase(toks, k))

/* ------------------------------------------------------------------ */
/* Dates and times                                                     */
/* ------------------------------------------------------------------ */

const pISO = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1) }
const tISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const plusDays = (iso: string, n: number) => { const d = pISO(iso); d.setDate(d.getDate() + n); return tISO(d) }

const WEEKDAYS: [string, number][] = [
  ['dimanche', 0], ['lundi', 1], ['mardi', 2], ['mercredi', 3], ['jeudi', 4], ['vendredi', 5], ['samedi', 6],
  ['sunday', 0], ['monday', 1], ['tuesday', 2], ['wednesday', 3], ['thursday', 4], ['friday', 5], ['saturday', 6],
  // short forms that are also ordinary words ("mon", "jeu", "mer", "sam") are left out on purpose
  ['=dim', 0], ['=lun', 1], ['=ven', 5],
  ['=sun', 0], ['=tue', 2], ['=tues', 2], ['=wed', 3], ['=thu', 4], ['=thurs', 4], ['=fri', 5], ['=sat', 6],
]
const MONTHS: [string, number][] = [
  ['janvier', 1], ['fevrier', 2], ['mars', 3], ['avril', 4], ['mai', 5], ['juin', 6], ['juillet', 7], ['aout', 8], ['septembre', 9], ['octobre', 10], ['novembre', 11], ['decembre', 12],
  ['january', 1], ['february', 2], ['march', 3], ['april', 4], ['may', 5], ['june', 6], ['july', 7], ['august', 8], ['september', 9], ['october', 10], ['november', 11], ['december', 12],
  ['janv', 1], ['jan', 1], ['fev', 2], ['fevr', 2], ['feb', 2], ['mar', 3], ['avr', 4], ['apr', 4], ['juil', 7], ['jul', 7], ['jun', 6], ['aug', 8], ['sep', 9], ['sept', 9], ['oct', 10], ['nov', 11], ['dec', 12],
]
const monthOf = (w: string) => {
  const exact = MONTHS.find(([m]) => m === w)
  if (exact) return exact[1]
  if (w.length < 5) return undefined
  return MONTHS.find(([m]) => m.length >= 5 && dist(w, m, 1) <= 1)?.[1]
}
const MONTH_RE = MONTHS.map(([m]) => m).sort((a, b) => b.length - a.length).join('|')

function upcoming(today: string, wd: number, allowToday = false) {
  const d = pISO(today)
  let diff = (wd - d.getDay() + 7) % 7
  if (diff === 0 && !allowToday) diff = 7
  return plusDays(today, diff)
}
function absDate(today: string, day: number, month: number, year?: number) {
  if (!(month >= 1 && month <= 12 && day >= 1 && day <= 31)) return undefined
  let y = year ?? pISO(today).getFullYear()
  if (y < 100) y += 2000
  let iso = tISO(new Date(y, month - 1, day))
  if (!year && iso < today) iso = tISO(new Date(y + 1, month - 1, day))
  return iso
}

const NUM_WORDS: Record<string, number> = {
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16,
  'dix-sept': 17, 'dix-huit': 18, 'dix-neuf': 19, vingt: 20, trente: 30, quarante: 40,
  one: 1, two: 2, three: 3, four: 4, five: 5, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40,
}
const numOf = (w: string) => (/^\d+$/.test(w) ? Number(w) : NUM_WORDS[w])
const NUM_RE = `(\\d{1,2}|${Object.keys(NUM_WORDS).sort((a, b) => b.length - a.length).join('|')})`

/** Date in the text, relative to today (YYYY-MM-DD). */
export function parseDate(text: string, today: string, lang: Lang = 'fr'): string | undefined {
  const n = norm(text)
  const toks = tokens(n)
  let m: RegExpMatchArray | null
  if ((m = n.match(/\b(20\d\d)-(\d\d)-(\d\d)\b/))) return absDate(today, +m[3], +m[2], +m[1])
  if (/\bapres[- ]demain\b|\bday after tomorrow\b/.test(n)) return plusDays(today, 2)
  if (/\baujourd'?hui\b|\btoday\b|\bce soir\b|\btonight\b|\bthis evening\b/.test(n) || toks.includes('aujourd')) return today
  if (toks.some((t) => wordEq(t, 'demain') || wordEq(t, 'tomorrow'))) return plusDays(today, 1)
  if ((m = n.match(new RegExp(`\\b(?:dans|in)\\s+${NUM_RE}\\s+(?:jours?|days?)\\b`)))) { const k = numOf(m[1]); if (k) return plusDays(today, k) }
  // 12 novembre, 1er décembre 2026, le 3 mars
  if ((m = n.match(new RegExp(`\\b(\\d{1,2})(?:er|st|nd|rd|th)?\\s+(?:of\\s+)?(${MONTH_RE}|[a-z]{4,10})\\b(?:\\s+(\\d{4}))?`)))) {
    const mo = monthOf(m[2])
    if (mo) return absDate(today, +m[1], mo, m[3] ? +m[3] : undefined)
  }
  // November 12, nov 12th 2026
  if ((m = n.match(new RegExp(`\\b(${MONTH_RE}|[a-z]{4,10})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:\\s+(\\d{4}))?`)))) {
    const mo = monthOf(m[1])
    if (mo && !/^\d{1,2}\s*(h|:)/.test(n.slice((m.index ?? 0) + m[0].length - m[2].length))) return absDate(today, +m[2], mo, m[3] ? +m[3] : undefined)
  }
  // 12/11 or 12/11/2026 (day first in French, month first in English)
  if ((m = n.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))) {
    const [a, b] = [+m[1], +m[2]]
    const [day, month] = lang === 'en' && a <= 12 ? [b, a] : [a, b]
    return absDate(today, day, month, m[3] ? +m[3] : undefined)
  }
  // weekdays: samedi, ce samedi, samedi prochain, next friday, this saturday
  for (let i = 0; i < toks.length; i++) {
    const w = WEEKDAYS.find(([k]) => wordEq(toks[i], k))
    if (w) {
      const prev = toks[i - 1]
      return upcoming(today, w[1], prev === 'ce' || prev === 'this')
    }
  }
  if (/\b(?:ce|this)\s+(?:week-?end|we)\b/.test(n)) return upcoming(today, 6, true)
  if (/\b(?:la semaine prochaine|next week)\b/.test(n)) return plusDays(today, 7)
  // le 12 (French, day of this month or next)
  if ((m = n.match(/\b(?:le|on the)\s+(\d{1,2})(?:er|st|nd|rd|th)?\b(?!\s*(?:h\b|heures?|:|min|joueurs?|players?|ans\b|years?))/))) {
    const day = +m[1]
    const t = pISO(today)
    if (day >= 1 && day <= 31) {
      let iso = tISO(new Date(t.getFullYear(), t.getMonth(), day))
      if (iso < today) iso = tISO(new Date(t.getFullYear(), t.getMonth() + 1, day))
      return iso
    }
  }
  return undefined
}

const hm = (h: number, m = 0) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`

/** Clock time in the text (HH:MM). */
export function parseTime(text: string): string | undefined {
  const n = norm(text)
  const pm = /\b(?:de l'apres-midi|de l'apres midi|apres-midi|du soir|in the afternoon|in the evening|afternoon|evening|ce soir|tonight)\b/.test(n)
  let m: RegExpMatchArray | null
  if ((m = n.match(/\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(am|pm|a\.m|p\.m)\b/))) {
    let h = +m[1] % 12
    if (m[3].startsWith('p')) h += 12
    return hm(h, m[2] ? +m[2] : 0)
  }
  if ((m = n.match(/\b([01]?\d|2[0-3])\s*(?:h|heures?)\s*([0-5]\d)?\b/))) {
    let h = +m[1]
    if (pm && h < 12) h += 12
    return hm(h, m[2] ? +m[2] : 0)
  }
  if ((m = n.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/))) {
    let h = +m[1]
    if (pm && h < 12) h += 12
    return hm(h, +m[2])
  }
  if (/\bmidi\b|\bnoon\b/.test(n)) return '12:00'
  if ((m = n.match(/\b(?:at|a)\s+(1[0-2]|[1-9])\b(?!\s*(?:jours?|days?|joueurs?|players?|contre|v\b|vs\b))/)) && pm) return hm(+m[1] + 12)
  return undefined
}

/** Duration in minutes (for sessions). */
export function parseMinutes(text: string): number | undefined {
  const n = norm(text)
  let m: RegExpMatchArray | null
  if ((m = n.match(/\b(\d{2,3})\s*(?:min|mn|mins|minutes?|')\b/)) || (m = n.match(/\b(\d{2,3})\s*(?:min|mn|minutes?)/))) return +m[1]
  if ((m = n.match(/\b([1-3])\s*h\s*([0-5]\d)?\b/))) return +m[1] * 60 + (m[2] ? +m[2] : 0)
  if (/\bheure et demie\b|\bhour and a half\b|\bone and a half hours?\b/.test(n)) return 90
  if (/\b(?:une|1) heure\b|\b(?:an|one|1) hour\b/.test(n)) return 60
  if (/\bdeux heures\b|\btwo hours\b/.test(n)) return 120
  return undefined
}

/* ------------------------------------------------------------------ */
/* Football vocabulary                                                 */
/* ------------------------------------------------------------------ */

export function parseMD(text: string): MD | undefined {
  const n = norm(text)
  const toks = tokens(n)
  let m: RegExpMatchArray | null
  if ((m = n.match(/\b(?:md|j|jour|match day|matchday)\s*([+-])\s*([1-4])\b/))) {
    if (m[1] === '+') return m[2] === '1' ? 'MD+1' : undefined
    return `MD-${m[2]}` as MD
  }
  if ((m = n.match(/\bmd\s*(?:moins|minus)\s*([1-4])\b/))) return `MD-${m[1]}` as MD
  if (/\bmd\s*(?:plus)\s*1\b/.test(n)) return 'MD+1'
  if ((m = n.match(/\bmd\s?([1-4])\b/))) return `MD-${m[1]}` as MD
  if (any(toks, ['tension'])) return 'MD-4'
  if (any(toks, ['duree', 'duration', 'endurance']) && !/\bduree (?:de |d')?\d/.test(n)) return 'MD-3'
  if (any(toks, ['vitesse', 'speed', 'rapidite', 'velocite'])) return 'MD-2'
  if (any(toks, ['activation', 'veille du match', 'veille de match', 'day before the match', 'day before the game', 'pre-match', 'avant-match', 'prematch'])) return 'MD-1'
  if (any(toks, ['recuperation', 'recovery', 'recup', 'regeneration', 'lendemain de match', 'lendemain du match', 'day after the match', 'day after the game'])) return 'MD+1'
  if (any(toks, ['jeunes', 'youth', 'enfants', 'kids', 'ecole de foot', 'petits'])) return 'youth'
  return undefined
}

const INTENTION_KW: [Intention, string[]][] = [
  ['regarder-devant', ['regarder devant', 'look forward', 'looking forward', 'contre-attaque', 'contre attaque', 'contre-attaquer', 'counter attack', 'counter-attack', 'counterattack', 'counter attacking', 'transition offensive', 'attacking transition', 'profondeur', 'in behind', 'jouer vite vers l avant']],
  ['reprendre', ['reprendre le ballon', 'reprendre', 'reprise', 'contre-pression', 'contre pression', 'contre-presser', 'gegenpress', 'gegenpressing', 'counter-press', 'counter press', 'counterpress', 'counter-pressing', 'counter pressing', 'win it back', 'win the ball back', 'winning the ball back', 'win back', 'recuperer le ballon', 'recuperer vite', 'apres la perte', 'after losing', 'after we lose', 'cinq secondes', '5 secondes', 'five seconds', '5 seconds']],
  ['sortir', ['sortir', 'sortie de balle', 'sortir le ballon', 'relance', 'relancer', 'build out', 'build-out', 'build up', 'build-up', 'buildup', 'building up', 'construire depuis l arriere', 'depuis l arriere', 'from the back', 'play out']],
  ['fixer', ['fixer', 'fixation', 'pin', 'pinning', 'attirer', 'draw', 'drawing', 'surcharge', 'overload', 'renverser', 'renversement', 'switch', 'switch play', 'switching']],
  ['finir', ['finir', 'finition', 'finishing', 'finish', 'marquer', 'score', 'scoring', 'tirer', 'shooting', 'conclure', 'devant le but', 'in front of goal', 'dernier geste']],
  ['progresser', ['progresser', 'progression', 'progress', 'traverser les lignes', 'casser les lignes', 'break lines', 'break the lines', 'breaking lines', 'entre les lignes', 'between the lines', 'jouer vers l avant', 'play forward', 'avancer']],
  ['respirer', ['respirer', 'breathe', 'breathing', 'garder le ballon', 'keep the ball', 'conservation', 'conserver', 'keep possession', 'possession']],
]
export function parseIntention(text: string): Intention | undefined {
  const toks = tokens(norm(text))
  for (const [id, kws] of INTENTION_KW) if (any(toks, kws)) return id
  return undefined
}

const SKILL_KW: [SkillKey, string[]][] = [
  ['scan', ['scan', 'scanner', 'scanning', 'regarder avant de recevoir', 'voir le jeu', 'vision', 'look before receiving', 'lever la tete', 'head up']],
  ['controle', ['controle oriente', 'premier controle', 'first touch', 'controle', 'reception']],
  ['dribble-njangi', ['dribble', 'dribbler', 'dribbling', 'un contre un', '1 contre 1', 'one v one', '1v1']],
  ['conduite', ['conduite', 'conduire le ballon', 'carrying', 'carry the ball', 'running with the ball']],
  ['appels', ['appels', 'appel de balle', 'courses', 'runs', 'movement off the ball', 'demarquage', 'se demarquer']],
  ['communication', ['communication', 'communiquer', 'parler', 'talk', 'talking']],
  ['protection', ['proteger le ballon', 'protection', 'shielding', 'shield the ball', 'dos au but']],
  ['decision', ['decision', 'decisions', 'prise de decision', 'decision making', 'choix', 'choices']],
  ['passe', ['passe', 'passes', 'passing', 'passer']],
]
export function parseSkill(text: string): SkillKey | undefined {
  const toks = tokens(norm(text))
  for (const [id, kws] of SKILL_KW) if (any(toks, kws)) return id
  return undefined
}

const POS_KW: [string, string[]][] = [
  ['GK', ['gardien de but', 'gardien', 'gardienne', 'goalkeeper', 'goalie', 'keeper', 'portier', '=gk']],
  ['DM', ['milieu defensif', 'milieu defensive', 'sentinelle', 'pivot', 'defensive midfielder', 'holding midfielder', '=dm', 'sentinel']],
  ['AM', ['milieu offensif', 'milieu offensive', 'meneur de jeu', 'meneur', 'playmaker', 'attacking midfielder', 'numero dix']],
  ['CB', ['defenseur central', 'defenseure centrale', 'centre back', 'center back', 'centre-back', 'center-back', 'central defender', 'stoppeur', 'libero', '=cb', 'axial', 'defenseur', 'defender']],
  ['FB', ['lateral', 'laterale', 'arriere droit', 'arriere gauche', 'full back', 'full-back', 'fullback', 'right back', 'left back', 'wing back', 'wingback', 'piston', '=fb', '=rb', '=lb']],
  ['W', ['ailier', 'ailiere', 'winger', '=wing', 'excentre']],
  ['ST', ['attaquant', 'attaquante', 'avant-centre', 'avant centre', 'buteur', 'buteuse', 'striker', 'forward', 'centre forward', 'center forward', '=st', 'pointe']],
  ['CM', ['milieu de terrain', 'milieu relayeur', 'relayeur', 'milieu', 'central midfielder', 'midfielder', 'box to box', 'box-to-box', '=cm']],
]
export function parsePosition(text: string): string | undefined {
  const toks = tokens(norm(text))
  for (const [id, kws] of POS_KW) if (any(toks, kws)) return id
  return undefined
}
const POS_WORDS = POS_KW.flatMap(([, k]) => k.map((w) => w.replace(/^=/, '')))

/* ------------------------------------------------------------------ */
/* Extraction helpers on the original text                             */
/* ------------------------------------------------------------------ */

const clean = (s: string) => s.replace(/^[\s:,;.\-"'«»]+|[\s:,;.!?\-"'«»]+$/g, '').replace(/\s+/g, ' ')
const capFirst = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)
const titleCase = (s: string) => (s === s.toLowerCase() ? s.replace(/(^|[\s\-'])(\p{L})/gu, (_, a, b) => a + b.toUpperCase()) : s)
const stripArticle = (s: string) => s.replace(/^(?:les|le|la|l'|l’|the|des|du|de la|une équipe|l'équipe|l’équipe|team|club)\s*/i, '')

/** Run a regex on the normalised text and return the original-text slice of group g. */
function grab(text: string, re: RegExp, g = 1): { value: string; start: number; end: number } | null {
  const { n, map } = normMap(text)
  const flags = re.flags.includes('d') ? re.flags : re.flags + 'd'
  const m = new RegExp(re.source, flags).exec(n) as (RegExpExecArray & { indices?: [number, number][] }) | null
  if (!m || !m.indices || !m.indices[g]) return null
  const [s, e] = m.indices[g]
  if (e <= s) return null
  const start = map[s]
  const end = map[e - 1] + 1
  return { value: text.slice(start, end), start, end }
}

const DAY_WORDS = 'lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|monday|tuesday|wednesday|thursday|friday|saturday|sunday|demain|tomorrow|aujourd\'hui|aujourdhui|today|ce soir|tonight|apres-demain|apres demain'
const TAIL_STOP = new RegExp(`(?:\\s*[,.;!?(]|\\s(?:${DAY_WORDS}|prochain|prochaine|next|this|ce week|cette semaine|le \\d+|on|le (?:1er|premier)|\\d{1,2}\\s*h|\\d{1,2}(?::\\d\\d)?\\s*(?:am|pm)|\\d{1,2}:\\d\\d|a|au|aux|at|en|in|pour|for|avec|with|et|and|chez|a domicile|at home|away|contre|against|vs|versus|${MONTH_RE.split('|').filter((m) => m.length > 3).join('|')})\\b)`)

function cutTail(raw: string) {
  const { n, map } = normMap(raw)
  const m = TAIL_STOP.exec(' ' + n)
  if (!m) return clean(raw)
  const idx = Math.max(0, m.index - 1)
  return clean(raw.slice(0, idx >= n.length ? raw.length : map[idx] ?? raw.length))
}

export function parseOpponent(text: string): string | undefined {
  const g = grab(text, /(?:^|\s)(?:contre|against|vs\.?|versus|face (?:a|aux|au)|affronte(?:r|ra|rons|z)?)\s+(.+)$/) ?? grab(text, /(?:^|\s)(?:on joue|we play|we're playing|we are playing|playing)\s+(?!(?:a|au|at|en|in|demain|tomorrow|samedi|saturday)\b)(.+)$/)
  if (!g) return undefined
  const v = capFirst(stripArticle(cutTail(g.value)))
  if (!v || /^\d/.test(v) || parseDate(v, '2026-01-01') || v.length > 60) return undefined
  return v
}

export function parseVenue(text: string): string | undefined {
  const { n } = normMap(text)
  const re = /(?:^|\s)(a|au|aux|at|@|sur le terrain de|sur le terrain|on the pitch at)\s+(?!\d)(?!(?:domicile|l'exterieur|home|away|la maison|nous|eux|l'heure|the time)\b)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(n))) {
    const marker = m[1]
    const start = m.index + m[0].length
    const origStart = normMap(text).map[start]
    if (origStart === undefined) continue
    const rest = text.slice(origStart)
    // the plain "a" is also an English article: accept it only for "à" or a capitalised next word
    const origMarker = text.slice(normMap(text).map[m.index + m[0].indexOf(marker)], origStart).trim()
    if (marker === 'a' && origMarker !== 'à' && !/^[A-ZÀ-Ý]/.test(rest)) continue
    const v = cutTail(rest)
    if (!v || parseDate(v, '2026-01-01') || parseTime(v) || /^(?:un|une|the|a|an)\b/i.test(v)) continue
    return capFirst(v.replace(/^the\s+/i, ''))
  }
  return undefined
}

export function parseHome(text: string): boolean | undefined {
  const n = norm(text)
  if (/\b(?:a domicile|chez nous|at home|home game|a la maison|on recoit|we host)\b/.test(n)) return true
  if (/\b(?:a l'exterieur|en deplacement|away|chez eux|away game|on se deplace)\b/.test(n)) return false
  return undefined
}

export function parseChannel(text: string): Channel | undefined {
  const toks = tokens(norm(text))
  if (any(toks, ['whatsapp', 'whats app', '=wa', 'watsap', 'whatsap'])) return 'whatsapp'
  if (any(toks, ['=sms', 'texto', 'text message', '=text'])) return 'sms'
  if (any(toks, ['email', 'e-mail', '=mail', 'courriel', 'par mail'])) return 'email'
  if (any(toks, ['copier', 'copy', 'presse-papier', 'clipboard'])) return 'copy'
  return undefined
}
export function parseRecipient(text: string): string | undefined {
  const mail = text.match(/[^\s@]+@[^\s@]+\.[a-z]{2,}/i)
  if (mail) return mail[0]
  const phone = text.match(/\+?\d[\d\s.-]{7,}\d/)
  if (phone) return phone[0].replace(/[\s.-]/g, '')
  return undefined
}

/* ---------- players ---------- */

const ADD_PREFIX = /^(?:\s*(?:mola[,\s]+)?(?:s'il te plait|stp|please)?[,\s]*(?:peux-tu |tu peux |can you |could you )?(?:ajoute(?:r|z)?|rajoute(?:r|z)?|inscris|inscrire|enregistre(?:r)?|add|register|sign)\s*(?:moi\s+|me\s+)?(?:(?:un|une|le|la|a|the|new|un nouveau|une nouvelle|nouveau|nouvelle)\s+)?(?:(?:joueur|joueuse|player|recrue|gamin|gamine)s?\s*)?(?:a l'equipe|a mon equipe|dans l'equipe|to the team|to my team|to the squad)?\s*(?:qui s'appelle|nomme|nommee|appele|appelee|named|called)?\s*:?\s*)/

export function parsePlayer(text: string): Pick<Slots, 'name' | 'names' | 'number' | 'position' | 'birthYear'> {
  const out: Pick<Slots, 'name' | 'names' | 'number' | 'position' | 'birthYear'> = {}
  const n = norm(text)
  let m: RegExpMatchArray | null
  if ((m = n.match(/\b(?:numero|num|number|maillot|shirt|dossard|jersey)\s*(\d{1,2})\b/)) || (m = text.match(/#\s?(\d{1,2})\b/)) || (m = text.match(/n\s?°\s?(\d{1,2})\b/i)) || (m = n.match(/\p{L}[\s,]+(\d{1,2})$/u))) out.number = +m[1]
  if ((m = n.match(/\b(?:ne|nee|born|born in|ne en|nee en)\s+(?:en\s+|in\s+)?((?:19|20)\d\d)\b/))) out.birthYear = +m[1]
  out.position = parsePosition(text)
  const { n: ln } = normMap(text)
  const pre = ADD_PREFIX.exec(ln)
  const startN = pre ? pre[0].length : 0
  const startO = startN > 0 ? (normMap(text).map[startN] ?? text.length) : 0
  let rest = text.slice(startO)
  // stop at number, position words, birth year, commas when a number/position is present
  const restN = normMap(rest)
  const stops = [
    /\s*,/, /\s(?:numero|num|number|no|n°|maillot|shirt|dossard|#)/, /\s#/, /\s\d/, /\s(?:au poste|poste|comme|as a|as an|as|en tant que|position|ne en|nee en|born|qui joue|who plays|il joue|elle joue|plays)\b/,
    new RegExp(`\\s(?:${POS_WORDS.filter((w) => w.length > 2).map((w) => w.replace(/[-]/g, '[- ]')).join('|')})\\b`),
  ]
  const multi = out.number === undefined && !out.position && /,|\set\s|\sand\s/.test(restN.n)
  if (multi) {
    const parts = rest.split(/\s*(?:,|;|\bet\b|\band\b)\s*/i).map((p) => clean(p)).filter((p) => /\p{L}/u.test(p) && p.split(/\s+/).length <= 4)
    if (parts.length >= 2) { out.names = parts.map(titleCase); return out }
  }
  let cut = rest.length
  for (const re of stops) {
    const mm = re.exec(' ' + restN.n)
    if (mm) { const idx = Math.max(0, mm.index - 1); cut = Math.min(cut, restN.map[idx] ?? rest.length) }
  }
  rest = clean(rest.slice(0, cut))
  if (/\p{L}/u.test(rest) && !/^(?:un|une|le|la|a|an|the|joueur|joueuse|player|nouveau|new)$/i.test(rest) && rest.split(/\s+/).length <= 5) out.name = titleCase(rest)
  return out
}

/** "Samuel 9, Junior Ndzana (FB)\n10 BriBri ailier" -> players. */
export function parsePlayerList(text: string): { name: string; number?: number; position?: string }[] {
  // one line can hold several players ("BriBri 7, Samuel Owona") or one player and their position ("Samuel Owona, attaquant")
  const items: string[] = []
  for (const line of text.split(/\n|;/)) {
    for (const part of line.split(/,|\s+(?:et|and)\s+/i).map((s) => s.trim()).filter(Boolean)) {
      const onlyPosition = parsePosition(part) && part.split(/\s+/).length <= 3 && !/\d/.test(part) && POS_WORDS.some((w) => norm(part).includes(w))
      if (onlyPosition && items.length) items[items.length - 1] += ` - ${part}`
      else items.push(part)
    }
  }
  const out: { name: string; number?: number; position?: string }[] = []
  for (let raw of items) {
    let number: number | undefined
    let m = raw.match(/^(?:[-*•·]\s*)?(?:#|n°\s?)?(\d{1,2})[\s.)\-:]+(.+)$/)
    if (m) { number = +m[1]; raw = m[2] }
    else if ((m = raw.match(/^(.+?)[\s,]+(?:#|n°\s?|numero\s|numéro\s)?(\d{1,2})$/i))) { number = +m[2]; raw = m[1] }
    raw = raw.replace(/^[-*•·]\s*/, '')
    let position: string | undefined
    const paren = raw.match(/^(.+?)\s*[(\[]([^)\]]+)[)\]]\s*$/)
    if (paren) { position = parsePosition(paren[2]); raw = paren[1] }
    else {
      const dash = raw.match(/^(.+?)\s+[-:]\s+(.+)$/)
      if (dash && parsePosition(dash[2])) { position = parsePosition(dash[2]); raw = dash[1] }
    }
    const name = clean(raw)
    if (name && /\p{L}/u.test(name) && name.length <= 60) out.push({ name: titleCase(name), number, position })
  }
  return out
}

/* ---------- lessons and books ---------- */

export function parseLesson(text: string): Pick<Slots, 'lessonNo' | 'chapterNo' | 'book'> {
  const n = norm(text)
  const out: Pick<Slots, 'lessonNo' | 'chapterNo' | 'book'> = {}
  let m: RegExpMatchArray | null
  if ((m = n.match(new RegExp(`\\b(?:lecon|lecons|lesson|lessons|carnet|lecon du ballon)\\s*(?:numero|num|no|n|number)?\\s*${NUM_RE}\\b`)))) out.lessonNo = numOf(m[1])
  if ((m = n.match(new RegExp(`\\b(?:chapitre|chapter|chap|chapitres)\\s*(?:numero|num|no|n|number)?\\s*${NUM_RE}\\b`)))) out.chapterNo = numOf(m[1])
  const toks = tokens(n)
  if (any(toks, ['code njangi', 'njangi code', 'methode', 'method', 'methode njangi', 'njangi method', 'livre du coach', 'coaching book', 'livre de coaching', 'livre de l entraineur', 'coach book'])) out.book = 'methode'
  else if (any(toks, ['roman', 'novel', 'tome 1', 'tome', 'book 1', 'lionceaux', 'kaydoudou', 'bribri', 'ballon qui voyage', 'the travelling ball', 'travelling ball', 'histoire', 'story', 'saga'])) out.book = 'tome1'
  return out
}

/* ------------------------------------------------------------------ */
/* Intent scoring                                                      */
/* ------------------------------------------------------------------ */

const KW: Record<string, [string, number][]> = {
  plan_week: [['semaine', 3], ['week', 3], ['microcycle', 4], ['planifie', 2], ['planifier', 2], ['programme de la semaine', 3], ['ma semaine', 2], ['my week', 2], ['the week', 2], ['prepare la semaine', 3], ['periodisation', 3], ['periodization', 3], ['plan the week', 3], ['weekly plan', 3], ['=planning', 2]],
  create_session: [['seance', 3], ['seances', 2], ['session', 3], ['entrainement', 3], ['training', 3], ['practice', 2], ['tension', 2], ['activation', 2], ['recuperation', 1], ['recovery', 1], ['vitesse', 1], ['speed', 1]],
  setup_match: [['match', 2], ['=game', 1], ['=contre', 2], ['against', 2], ['=vs', 2], ['versus', 2], ['affronte', 2], ['affronter', 2], ['amical', 2], ['friendly', 2], ['fixture', 3], ['rencontre', 1]],
  add_player: [['ajoute un joueur', 5], ['ajouter un joueur', 5], ['ajoute une joueuse', 5], ['nouveau joueur', 4], ['nouvelle joueuse', 4], ['add a player', 5], ['add player', 5], ['new player', 4], ['recrue', 3], ['=inscris', 2], ['joueur', 1], ['joueuse', 1], ['player', 1], ['effectif', 1], ['roster', 1], ['squad', 1]],
  send_convocation: [['convocation', 5], ['convoc', 4], ['convoque', 4], ['convoquer', 4], ['call-up', 5], ['call up', 4], ['callup', 5], ['squad message', 4], ['team sheet', 3], ['whatsapp', 3], ['=sms', 2], ['=envoie', 1], ['=envoyer', 1], ['=send', 1], ['message', 1], ['=compo', 2], ['composition', 1], ['lineup', 1], ['line-up', 1]],
  create_team: [['cree mon equipe', 6], ['creer mon equipe', 6], ['cree une equipe', 6], ['creer une equipe', 6], ['nouvelle equipe', 6], ['ajoute une equipe', 6], ['create a team', 6], ['create my team', 6], ['new team', 6], ['add a team', 6]],
  export_calendar: [['calendrier', 4], ['calendar', 4], ['=agenda', 3], ['=ics', 4], ['google calendar', 4]],
  analyze_last_match: [['analyse', 3], ['analyser', 3], ['analyze', 3], ['analyse', 3], ['analysis', 3], ['rapport', 3], ['report', 3], ['bilan', 3], ['dernier match', 3], ['last match', 3], ['last game', 3], ['indice', 2], ['njangi index', 3], ['comment on a joue', 4], ['how did we play', 4], ['how we played', 3], ['=stats', 2], ['statistiques', 2], ['resume du match', 3], ['match summary', 3]],
  recommend_drills: [['exercice', 3], ['exercices', 3], ['drill', 3], ['drills', 3], ['=exo', 2], ['=exos', 2], ['jeux', 1], ['quoi travailler', 3], ['what to work on', 3], ['ameliorer', 2], ['improve', 2], ['=mieux', 1], ['better', 1], ['travailler', 1], ['work on', 1], ['corriger', 2], ['probleme', 2], ['problem', 2], ['difficulte', 2], ['struggle', 2]],
  open_lesson: [['lecon', 4], ['lecons', 3], ['lesson', 4], ['lessons', 3], ['carnet', 3]],
  open_book: [['livre', 3], ['livres', 3], ['book', 3], ['books', 3], ['roman', 3], ['novel', 3], ['=tome', 3], ['methode', 2], ['method', 2], ['code njangi', 4], ['njangi code', 4], ['saga', 2], ['=lire', 2], ['=read', 2], ['chapitre', 2], ['chapter', 2]],
  help: [['=aide', 4], ['aide-moi', 3], ['=help', 4], ['que peux-tu faire', 5], ['que sais-tu faire', 5], ['tu sais faire quoi', 5], ['what can you do', 5], ['comment ca marche', 4], ['how does it work', 4], ['tu fais quoi', 4], ['que fais-tu', 4], ['what do you do', 4], ['tes fonctions', 4], ['=commandes', 3]],
}

const GREET = ['bonjour', 'bonsoir', 'salut', 'coucou', '=hello', '=hi', '=hey', 'good morning', 'good evening', '=yo', 'bjr', 'slt']
const THANKS = ['merci', 'thanks', 'thank you', 'thx', 'merci beaucoup', 'cool merci']
const HOW = ['ca va', 'comment vas-tu', 'comment tu vas', 'how are you', 'how are things', 'tu vas bien']
const WHO = ['qui es-tu', 'qui es tu', 't es qui', 'tu es qui', 'who are you', 'what are you', 'c est quoi mola', 'what is mola', 'qui est mola']
const BYE = ['au revoir', 'a plus', 'a bientot', 'bye', 'goodbye', 'see you', 'bonne nuit', 'good night', 'ciao']
const PRAISE = ['bravo', 'super', 'genial', 'great', 'awesome', 'parfait merci', 'excellent', 'top', 'nice']
const YES = ['oui', 'ouais', 'ouai', 'yes', 'yeah', 'yep', 'ok', 'okay', 'oki', 'd accord', 'dac', 'vas-y', 'vas y', 'go', 'allez', 'allons-y', 'carrement', 'bien sur', 'sure', 'of course', 'please', 'oui stp', 'oui merci', 'yes please', 'c est parti', 'let s go', 'lets go', 'do it', 'fais-le', 'fais le', 'volontiers', 'avec plaisir', 'oui vas-y', 'oui prepare', 'parfait', 'exactement', 'exactly', 'correct', 'c est ca', 'that s right', 'affirmatif']
const NO = ['non', 'no', 'nope', 'pas maintenant', 'not now', 'plus tard', 'later', 'annule', 'annuler', 'cancel', 'stop', 'laisse tomber', 'never mind', 'nevermind', 'non merci', 'no thanks', 'pas besoin', 'no need']

const isAll = (n: string, list: string[]) => list.some((w) => n === w.replace(/^=/, '') || n.replace(/'/g, ' ') === w)

function scoreIntents(text: string) {
  const n = norm(text)
  const toks = tokens(n)
  const s: Record<string, number> = {}
  for (const [intent, kws] of Object.entries(KW)) {
    let v = 0
    for (const [k, w] of kws) if (hasPhrase(toks, k)) v += w
    s[intent] = v
  }
  const md = parseMD(text)
  const mdCode = /\b(?:md|j)\s*[+-]?\s*[1-4]\b/.test(n)
  const intention = parseIntention(text)
  const opponent = parseOpponent(text)
  const date = parseDate(text, '2026-01-01')
  const time = parseTime(text)
  const lesson = parseLesson(text)
  const createVerb = any(toks, ['organise', 'organiser', 'programme', 'programmer', 'cree', 'creer', 'planifie', 'ajoute', 'fixe', 'schedule', 'set up', 'setup', 'create', 'arrange', 'nouveau', 'new', 'book'])

  if (mdCode) s.create_session += 3
  else if (md && s.create_session > 0) s.create_session += 1
  if (md && !mdCode && !s.create_session && !s.plan_week && any(toks, ['tension', 'activation'])) s.create_session += 1
  if (intention || parseSkill(text)) { if (s.recommend_drills > 0) s.recommend_drills += 2; if (s.create_session > 0) s.create_session += 1 }
  if (opponent && (s.setup_match > 0 || date || time)) s.setup_match += 2
  if ((date || time) && s.setup_match >= 2) s.setup_match += 1
  if (createVerb && hasPhrase(toks, 'match')) s.setup_match += 1
  if (s.plan_week >= 3 && s.setup_match > 0 && !createVerb) s.setup_match -= 1
  if (s.plan_week >= 3 && s.create_session > 0 && !mdCode) s.create_session -= 1
  // "chapitre 7 du roman" is the lesson of that chapter; "chapitre 25 du Code Njangi" is the book
  if (lesson.lessonNo) s.open_lesson += 3
  if (lesson.chapterNo && lesson.book !== 'methode') s.open_lesson += 6
  if (lesson.chapterNo && lesson.book === 'methode') s.open_book += 3
  // "ajoute Samuel Eto'o, numéro 9, attaquant": a bare add verb with a name or a number or a position
  if (/^(?:mola[, ]+)?(?:ajoute|rajoute|inscris|add|register)\b/.test(n) && !s.export_calendar && !s.create_session && !s.setup_match) {
    const p = parsePlayer(text)
    if (p.name || p.names || p.number !== undefined || p.position) s.add_player += 4
  }
  if (s.add_player > 0 && parsePosition(text)) s.add_player += 1
  // analysis wins over the bare word "match"
  if (s.analyze_last_match >= 3 && !opponent) s.setup_match = Math.min(s.setup_match, 1)
  if (s.send_convocation >= 4) { s.setup_match = Math.min(s.setup_match, 2); s.add_player = Math.min(s.add_player, 1) }
  if (s.export_calendar >= 4) { s.setup_match = Math.min(s.setup_match, 2); s.plan_week = Math.min(s.plan_week, 2); s.send_convocation = Math.min(s.send_convocation, 1) }
  if (s.recommend_drills >= 3) s.add_player = Math.min(s.add_player, 1)
  return { s, n, toks }
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export function extractSlots(intent: IntentId, text: string, today: string, lang: Lang = 'fr'): Slots {
  const s: Slots = {}
  const set = <K extends keyof Slots>(k: K, v: Slots[K] | undefined) => { if (v !== undefined && v !== '') s[k] = v }
  switch (intent) {
    case 'plan_week':
      set('date', parseDate(text, today, lang)); set('opponent', parseOpponent(text)); set('intention', parseIntention(text))
      break
    case 'create_session':
      set('md', parseMD(text)); set('intention', parseIntention(text)); set('skill', parseSkill(text)); set('minutes', parseMinutes(text)); set('date', parseDate(text, today, lang))
      break
    case 'setup_match':
      set('opponent', parseOpponent(text)); set('date', parseDate(text, today, lang)); set('time', parseTime(text)); set('venue', parseVenue(text)); set('home', parseHome(text))
      break
    case 'add_player':
      Object.assign(s, parsePlayer(text))
      break
    case 'create_team': {
      set('ageGroup', parseAgeGroup(text)); set('format', parseFormat(text))
      const g = grab(text, /(?:equipe|team)\s+(?:nommee|appelee|called|named|:)?\s*(.+)$/)
      const nm = g ? clean(g.value.replace(/\b(?:u\s?-?\d{1,2}|seniors?)\b.*$/i, '')) : ''
      if (nm && !/^(?:a|en|de|du|des|pour|for|of)$/i.test(nm)) set('name', titleCase(nm))
      break
    }
    case 'send_convocation':
      set('channel', parseChannel(text)); set('to', parseRecipient(text)); set('opponent', parseOpponent(text))
      break
    case 'export_calendar':
      set('date', parseDate(text, today, lang))
      break
    case 'analyze_last_match':
      set('opponent', parseOpponent(text))
      break
    case 'recommend_drills':
      set('intention', parseIntention(text)); set('skill', parseSkill(text)); set('md', parseMD(text))
      break
    case 'open_lesson': case 'open_book':
      Object.assign(s, parseLesson(text))
      break
    case 'small_talk': {
      const n = norm(text); const toks = tokens(n)
      set('talk', any(toks, WHO) ? 'who' : any(toks, HOW) ? 'how' : any(toks, THANKS) ? 'thanks' : any(toks, BYE) ? 'bye' : any(toks, PRAISE) ? 'praise' : 'greet')
      break
    }
  }
  return s
}

/** Understand one message: intent + slots. */
export function parse(text: string, opts: { today: string; lang?: Lang }): Parsed {
  const lang = opts.lang ?? 'fr'
  const n = norm(text)
  if (!n) return { intent: 'unknown', slots: {}, score: 0, source: 'rules' }
  const words = tokens(n)
  if (words.length <= 4 && isAll(n, YES)) return { intent: 'confirm', slots: {}, score: 5, source: 'rules' }
  if (words.length <= 4 && (isAll(n, NO) || (words[0] === 'non' && words.length <= 3))) return { intent: 'deny', slots: {}, score: 5, source: 'rules' }
  const { s, toks } = scoreIntents(text)
  let best: IntentId = 'unknown'
  let bestScore = 0
  for (const [k, v] of Object.entries(s)) if (v > bestScore) { best = k as IntentId; bestScore = v }
  const talk = any(toks, [...GREET, ...THANKS, ...HOW, ...WHO, ...BYE, ...PRAISE])
  if (bestScore < 2) {
    if (talk) return { intent: 'small_talk', slots: extractSlots('small_talk', text, opts.today, lang), score: 2, source: 'rules' }
    if (words.length <= 2 && (words[0] === '?' || n === 'aide' || n === 'help')) return { intent: 'help', slots: {}, score: 2, source: 'rules' }
    return { intent: 'unknown', slots: {}, score: bestScore, source: 'rules' }
  }
  if (best === 'help' && bestScore < 4 && talk) best = 'small_talk'
  return { intent: best, slots: extractSlots(best, text, opts.today, lang), score: bestScore, source: 'rules' }
}

/** Required slots per intent (the first missing one becomes the follow-up question). */
export function missingSlot(intent: IntentId, slots: Slots): keyof Slots | undefined {
  if (intent === 'setup_match') { if (!slots.opponent) return 'opponent'; if (!slots.date) return 'date' }
  if (intent === 'add_player' && !slots.name && !slots.names?.length) return 'name'
  if (intent === 'create_team' && !slots.name) return 'name'
  if (intent === 'recommend_drills' && !slots.intention && !slots.skill) return 'intention'
  return undefined
}

/** Fill one awaited slot from a short reply (e.g. "les Aigles", "samedi", "MD-3"). */
export function fillSlot(slot: keyof Slots, intent: IntentId, text: string, today: string, lang: Lang = 'fr'): Slots {
  const extra = extractSlots(intent, text, today, lang)
  const out: Slots = { ...extra }
  const plain = clean(text)
  if (slot === 'opponent' && !out.opponent && plain) {
    const v = capFirst(stripArticle(cutTail(plain.replace(/^(?:contre|against|vs\.?)\s+/i, ''))))
    if (v) out.opponent = v
  }
  if (slot === 'name' && intent === 'create_team' && plain) {
    out.ageGroup = out.ageGroup ?? parseAgeGroup(plain)
    out.format = out.format ?? parseFormat(plain)
    const nm = clean(plain.replace(/^(?:l'equipe|l'équipe|the team|team|equipe|équipe)\s+/i, '').split(/[,;.]|\s(?:on joue|we play|en|in|a|à)\s/i)[0])
    if (nm) out.name = titleCase(nm)
  } else if (slot === 'name' && !out.name && !out.names?.length && plain) {
    const p = parsePlayer('ajoute ' + plain)
    Object.assign(out, p)
  }
  if (slot === 'date' && !out.date) { const d = parseDate(text, today, lang); if (d) out.date = d }
  if (slot === 'md' && !out.md) { const m = parseMD(text); if (m) out.md = m }
  if (slot === 'intention' && !out.intention) { const i = parseIntention(text); if (i) out.intention = i; else { const sk = parseSkill(text); if (sk) out.skill = sk } }
  return out
}

/* ------------------------------------------------------------------ */
/* Onboarding: understanding a person who introduces themselves        */
/* ------------------------------------------------------------------ */

export interface ProfileSlots {
  lang?: Lang
  name?: string
  role?: Role
  ageGroup?: string
  club?: string
  teamName?: string
  format?: 5 | 7 | 8 | 9 | 11
  position?: string
  city?: string
  country?: string // ISO code
  goals?: string[]
}

export const COUNTRIES: [string, string[]][] = [
  ['CM', ['cameroun', 'cameroon', 'kamerun', 'mboa']], ['CI', ["cote d'ivoire", 'cote divoire', 'ivory coast', 'ivoirien']], ['SN', ['senegal']], ['NG', ['nigeria']], ['GH', ['ghana']],
  ['CD', ['rdc', 'rd congo', 'congo kinshasa', 'dr congo', 'drc']], ['CG', ['congo brazzaville', 'congo']], ['GA', ['gabon']], ['GQ', ['guinee equatoriale', 'equatorial guinea']], ['GN', ['guinee', 'guinea']],
  ['ML', ['=mali']], ['BF', ['burkina faso', 'burkina']], ['NE', ['=niger']], ['TD', ['tchad', '=chad']], ['CF', ['centrafrique', 'central african republic']], ['BJ', ['benin']], ['TG', ['=togo']],
  ['MA', ['maroc', 'morocco']], ['DZ', ['algerie', 'algeria']], ['TN', ['tunisie', 'tunisia']], ['EG', ['egypte', 'egypt']], ['KE', ['kenya']], ['RW', ['rwanda']], ['ZA', ['afrique du sud', 'south africa']],
  ['FR', ['france']], ['BE', ['belgique', 'belgium']], ['CH', ['suisse', 'switzerland']], ['DE', ['allemagne', 'germany']], ['ES', ['espagne', 'spain']], ['IT', ['italie', 'italy']], ['PT', ['portugal']],
  ['GB', ['royaume-uni', 'royaume uni', 'angleterre', 'england', 'united kingdom', '=uk']], ['US', ['etats-unis', 'etats unis', 'usa', 'united states', 'amerique', 'america', 'the states']], ['CA', ['canada']],
]

/** Known cities (normalised) and their country. Names are kept as written by the person. */
export const CITIES: [string, string, string][] = [
  ['douala', 'Douala', 'CM'], ['yaounde', 'Yaoundé', 'CM'], ['garoua', 'Garoua', 'CM'], ['bafoussam', 'Bafoussam', 'CM'], ['bamenda', 'Bamenda', 'CM'], ['maroua', 'Maroua', 'CM'], ['ngaoundere', 'Ngaoundéré', 'CM'],
  ['bertoua', 'Bertoua', 'CM'], ['ebolowa', 'Ebolowa', 'CM'], ['kribi', 'Kribi', 'CM'], ['limbe', 'Limbé', 'CM'], ['buea', 'Buea', 'CM'], ['kumba', 'Kumba', 'CM'], ['edea', 'Edéa', 'CM'], ['dschang', 'Dschang', 'CM'],
  ['nkongsamba', 'Nkongsamba', 'CM'], ['foumban', 'Foumban', 'CM'], ['mbalmayo', 'Mbalmayo', 'CM'], ['sangmelima', 'Sangmélima', 'CM'], ['bafang', 'Bafang', 'CM'], ['mbouda', 'Mbouda', 'CM'],
  ['abidjan', 'Abidjan', 'CI'], ['bouake', 'Bouaké', 'CI'], ['yamoussoukro', 'Yamoussoukro', 'CI'], ['dakar', 'Dakar', 'SN'], ['thies', 'Thiès', 'SN'], ['lagos', 'Lagos', 'NG'], ['abuja', 'Abuja', 'NG'], ['accra', 'Accra', 'GH'], ['kumasi', 'Kumasi', 'GH'],
  ['kinshasa', 'Kinshasa', 'CD'], ['lubumbashi', 'Lubumbashi', 'CD'], ['brazzaville', 'Brazzaville', 'CG'], ['libreville', 'Libreville', 'GA'], ['malabo', 'Malabo', 'GQ'], ['conakry', 'Conakry', 'GN'], ['bamako', 'Bamako', 'ML'],
  ['ouagadougou', 'Ouagadougou', 'BF'], ['niamey', 'Niamey', 'NE'], ["n'djamena", "N'Djamena", 'TD'], ['ndjamena', "N'Djamena", 'TD'], ['bangui', 'Bangui', 'CF'], ['cotonou', 'Cotonou', 'BJ'], ['lome', 'Lomé', 'TG'],
  ['casablanca', 'Casablanca', 'MA'], ['rabat', 'Rabat', 'MA'], ['alger', 'Alger', 'DZ'], ['tunis', 'Tunis', 'TN'], ['le caire', 'Le Caire', 'EG'], ['cairo', 'Cairo', 'EG'], ['nairobi', 'Nairobi', 'KE'], ['kigali', 'Kigali', 'RW'], ['johannesburg', 'Johannesburg', 'ZA'],
  ['paris', 'Paris', 'FR'], ['lyon', 'Lyon', 'FR'], ['marseille', 'Marseille', 'FR'], ['lille', 'Lille', 'FR'], ['bordeaux', 'Bordeaux', 'FR'], ['toulouse', 'Toulouse', 'FR'], ['bruxelles', 'Bruxelles', 'BE'], ['brussels', 'Brussels', 'BE'],
  ['geneve', 'Genève', 'CH'], ['londres', 'Londres', 'GB'], ['london', 'London', 'GB'], ['montreal', 'Montréal', 'CA'], ['toronto', 'Toronto', 'CA'], ['washington', 'Washington', 'US'], ['baltimore', 'Baltimore', 'US'],
  ['silver spring', 'Silver Spring', 'US'], ['new york', 'New York', 'US'], ['houston', 'Houston', 'US'], ['atlanta', 'Atlanta', 'US'], ['dallas', 'Dallas', 'US'], ['minneapolis', 'Minneapolis', 'US'],
]

const ROLE_KW: [Role, string[]][] = [
  ['federation', ['federation', 'ligue', 'league', 'fecafoot', 'association regionale', 'conseiller technique', '=dtn', 'ministere']],
  ['manager', ['directeur technique', 'directeur sportif', 'technical director', 'sporting director', 'director of football', 'president du club', 'president', 'dirigeant', 'dirigeante', 'manager du club', 'general manager', 'club manager', 'gerant']],
  ['parent', ['parent', 'papa', 'maman', 'pere', 'mere', 'mon fils', 'ma fille', 'mes enfants', 'mon enfant', 'my son', 'my daughter', 'my child', 'my kid', 'my kids', '=dad', '=mum', '=mom', 'mother', 'father']],
  ['analyst', ['analyste', 'analyst', 'analyse video', 'video analyst', 'performance analyst', '=scout', 'recruteur', 'data analyst']],
  ['coach', ['entraineur', 'entraineuse', 'coach', 'coache', 'educateur', 'educatrice', 'formateur', 'formatrice', 'trainer', "j'entraine", 'je coache', 'i coach', 'coaching', 'head coach', 'assistant coach', 'adjoint', '=manager']],
  ['player', ['joueur', 'joueuse', 'player', 'footballeur', 'footballeuse', 'je joue', 'i play', 'footballer']],
]
export function parseRole(text: string): Role | undefined {
  const toks = tokens(norm(text))
  for (const [r, kws] of ROLE_KW) if (any(toks, kws)) return r
  return undefined
}

const AGE_CATS = [7, 9, 11, 13, 15, 17, 19, 21]
export function parseAgeGroup(text: string): string | undefined {
  const n = norm(text)
  let m: RegExpMatchArray | null
  if ((m = n.match(/\bu\s?-?\s?(\d{1,2})s?\b/)) || (m = n.match(/\bunder[- ]?(\d{1,2})s?\b/)) || (m = n.match(/\bmoins de\s+(\d{1,2})\s*ans\b/)) || (m = n.match(/\b(?:categorie|category)\s+(\d{1,2})\b/))) {
    const v = +m[1]
    if (v >= 5 && v <= 23) return `U${v}`
  }
  if (/\b(?:seniors?|adultes?|adults?|first team|equipe premiere|equipe fanion|grands?|elite)\b/.test(n)) return 'Seniors'
  if (/\b(?:veterans?|anciens|old boys)\b/.test(n)) return 'Vétérans'
  if ((m = n.match(/\b(?:j'ai|i am|i'm|il a|elle a|he is|she is|he's|she's|a|age de|agee de|aged)\s+(\d{1,2})\s*(?:ans|years?|yo)\b/)) || (m = n.match(/\b(\d{1,2})\s*(?:ans|years old|yo)\b/))) {
    const a = +m[1]
    if (a >= 4 && a < 20) return `U${AGE_CATS.find((c) => c >= a + 1) ?? 21}`
    if (a >= 20 && a < 80) return 'Seniors'
  }
  return undefined
}

export function parseFormat(text: string, bare = false): 5 | 7 | 8 | 9 | 11 | undefined {
  const n = norm(text)
  const ok = (v: number) => ([5, 7, 8, 9, 11].includes(v) ? (v as 5 | 7 | 8 | 9 | 11) : undefined)
  let m: RegExpMatchArray | null
  if ((m = n.match(/\b(5|7|8|9|11)\s*(?:contre|v|vs|x|c)\s*(5|7|8|9|11)\b/)) && m[1] === m[2]) return ok(+m[1])
  if ((m = n.match(/\b(5|7|8|9|11)[- ]?a[- ]?side\b/))) return ok(+m[1])
  if ((m = n.match(/\b(?:foot(?:ball)?|jeu|on joue|nous jouons|we play|format)\s+(?:a\s+)?(5|7|8|9|11)\b/))) return ok(+m[1])
  if ((m = n.match(/\ba\s+(5|7|8|9|11)\b(?!\s*(?:h|heures?|ans|joueurs?))/))) return ok(+m[1])
  if (/\beleven[- ]a[- ]side\b|\ba onze\b/.test(n)) return 11
  if (bare && (m = n.match(/^(?:a\s+)?(5|7|8|9|11)(?:\s*(?:contre|v|vs)\s*\d{1,2})?$/))) return ok(+m[1])
  return undefined
}

export function parseCountry(text: string): string | undefined {
  const toks = tokens(norm(text))
  for (const [code, kws] of COUNTRIES) if (any(toks, kws)) return code
  return undefined
}
export function parseKnownCity(text: string): { city: string; country: string } | undefined {
  const toks = tokens(norm(text))
  for (const [k, name, country] of CITIES) if (hasPhrase(toks, k)) return { city: name, country }
  return undefined
}

const GOAL_KW: [string, string[]][] = [
  ['identite', ['identite', 'identity', 'style de jeu', 'philosophie', 'philosophy', 'modele de jeu', 'game model', 'playing style', 'style of play', 'idee de jeu']],
  ['semaine', ['planifier', 'planification', 'semaine', 'semaines', 'week', 'weeks', 'planning', 'plan my', 'seances', 'sessions', 'organiser']],
  ['analyse', ['analyser', 'analyse', 'analyze', 'analysis', 'statistiques', '=stats', 'video', 'mes matchs', 'my matches', 'data']],
  ['progresser', ['progresser', 'personnellement', 'improve', 'progress', 'mon niveau', 'my level', 'my game', 'devenir meilleur', 'get better', 'pro']],
  ['jeunes', ['former des jeunes', 'jeunes', 'former', 'formation', 'youth', 'kids', 'enfants', 'develop players', 'developper', 'educate']],
  ['lire', ['lire', 'livres', 'livre', 'books', 'book', 'read', 'reading', 'roman', 'novel', 'histoire']],
]
export function parseGoals(text: string): string[] {
  const toks = tokens(norm(text))
  return GOAL_KW.filter(([, kws]) => any(toks, kws)).map(([id]) => id)
}

const NOT_A_NAME = new Set(['un', 'une', 'le', 'la', 'les', 'l', 'the', 'a', 'an', 'de', 'du', 'des', 'from', 'in', 'at', 'en', 'pret', 'prete', 'ready', 'nouveau', 'nouvelle', 'new', 'ici', 'here', 'tres', 'very', 'pas', 'not', 'super', 'bien', 'good', 'fine', 'au', 'a', 'mola', 'interesse', 'interested', 'passionne', 'fan', 'oui', 'non', 'yes', 'no', 'ok'])

export function parseName(text: string, bare = false): string | undefined {
  const g = grab(text, /(?:^|[\s,])(?:je m'appelle|je m appelle|je me nomme|moi c'est|moi c est|mon nom est|mon nom c'est|my name is|my name's|call me|i'm|i am|im|je suis|c'est|c est|ici)\s+(.+)$/)
  let cand: string | undefined
  if (g) cand = g.value
  else if (bare) cand = text.replace(/^\s*(?:bonjour|salut|hello|hi|hey|bonsoir)[\s,!.]*/i, '')
  if (!cand) return undefined
  const stopIdx = cand.search(/[,.;!?(]|\s(?:et|and|je|j'|i|from|de|du|des|d'|at|à|au|in|en|pour|for|with|avec|qui|who|coach|entraîneur|entraineur|joueur|joueuse|player|parent|analyste|analyst|des|the)\s/i)
  let v = clean(stopIdx >= 0 ? cand.slice(0, stopIdx) : cand)
  const words = v.split(/\s+/).filter(Boolean)
  if (!words.length || words.length > (bare ? 4 : 3)) return undefined
  const first = norm(words[0])
  if (NOT_A_NAME.has(first) || parseRole(v) || /\d/.test(v) || parseCountry(v) || parseAgeGroup(v)) return undefined
  if (!bare && !/^\p{Lu}/u.test(words[0]) && words.length > 2) return undefined
  v = titleCase(v)
  return v.length <= 40 ? v : undefined
}

/** Club after "des U15 de X", "je joue au X", "I play for X", "le club X", "chez X". */
export function parseClub(text: string): string | undefined {
  const pats = [
    /\bu\s?-?\d{1,2}s?\s+(?:de|du|des|d'|of|at|for|a|au|chez|with)\s*(.+)$/,
    /\b(?:seniors?|equipe premiere|first team|reserve)\s+(?:de|du|des|d'|of|at|for|a|au|chez)\s*(.+)$/,
    /\b(?:je joue|i play|elle joue|il joue|j'entraine|i coach|je coache|i work|je travaille|je suis|i'm|i am)\s+(?:au|aux|pour|chez|for|at|with|avec|dans|in|a l'|a la)\s+(?!(?:un|une|a|an|the)\s)(.+)$/,
    /\b(?:club|academie|academy|ecole de football|ecole de foot|centre de formation|association)\s+(?:de |du |des |d'|the |called |named |nomme |appele )?(.+)$/,
    /\b(?:chez|au sein de|au sein du|du club)\s+(.+)$/,
  ]
  for (const re of pats) {
    const g = grab(text, re)
    if (!g) continue
    let v = cutTail(g.value)
    v = stripArticle(v)
    if (!v || /^\d/.test(v) || parseRole(v) || v.length > 50) continue
    const known = parseKnownCity(v)
    if (known && norm(v) === norm(known.city)) continue // "je joue à Douala": a city, not a club
    if (/^(?:u\d|seniors?)$/i.test(v)) continue
    return capFirst(v)
  }
  const fc = text.match(/\b((?:FC|AS|US|UC|AC|CS|CA|JC|RC|SC|ASC|FAP|PWD)\s+[A-ZÀ-Ý][\p{L}'-]+(?:\s+(?:de\s+)?[A-ZÀ-Ý][\p{L}'-]+)?|[A-ZÀ-Ý][\p{L}'-]+(?:\s+[A-ZÀ-Ý][\p{L}'-]+)?\s+(?:FC|SC|AC))\b/u)
  if (fc) return fc[1]
  return undefined
}

/** City after "à X", "in X", "j'habite à X", or any known city. */
export function parseCity(text: string, bare = false): { city?: string; country?: string } {
  const known = parseKnownCity(text)
  if (known) return known
  const g = grab(text, /\b(?:j'habite|je vis|je suis base|je suis basee|base a|basee a|i live|i'm based|i am based|based|living|habitant)\s+(?:a|au|en|in|at|sur)\s+(.+)$/)
  if (g) { const v = cutTail(g.value); if (v) return { city: capFirst(v) } }
  if (bare) {
    const v = clean(text.replace(/^(?:a|à|au|in|at|de|from|je suis a|je suis à|i'm in|i am in)\s+/i, ''))
    if (v && v.split(/\s+/).length <= 4 && !/\d/.test(v)) return { city: titleCase(v) }
  }
  return {}
}

export function detectLang(text: string): Lang | undefined {
  const n = norm(text)
  const toks = tokens(n)
  if (any(toks, ['english', 'anglais', '=en', 'in english'])) return 'en'
  if (any(toks, ['francais', 'french', '=fr', 'en francais'])) return 'fr'
  const en = ['the', 'i', 'am', 'my', 'is', 'and', 'hello', 'hi', 'coach', 'player', 'please', 'with', 'for', 'of'].filter((w) => toks.includes(w)).length
  const fr = ['je', 'suis', 'le', 'la', 'les', 'de', 'des', 'et', 'bonjour', 'salut', 'mon', 'ma', 'entraineur', 'joueur', 'pour', 'avec'].filter((w) => toks.includes(w)).length
  if (en > fr && en >= 1) return 'en'
  if (fr > en && fr >= 1) return 'fr'
  return undefined
}

/** Everything a person might say about themselves, in one sentence. */
export function parseProfile(text: string): ProfileSlots {
  const out: ProfileSlots = {}
  const role = parseRole(text)
  if (role) out.role = role
  const name = parseName(text)
  if (name) out.name = name
  const age = parseAgeGroup(text)
  if (age) out.ageGroup = age
  const club = parseClub(text)
  if (club) out.club = club
  const fmt = parseFormat(text)
  if (fmt) out.format = fmt
  if (role === 'player' || !role) {
    const pos = parsePosition(text)
    if (pos) { out.position = pos; if (!role) out.role = 'player' }
  }
  const c = parseCity(text)
  if (c.city) out.city = c.city
  const country = parseCountry(text) ?? c.country
  if (country) out.country = country
  // "Coton Sport de Garoua": keep the club whole, and the city is Garoua
  if (out.club && out.city && norm(out.club).endsWith(norm(out.city)) && !/\s(?:de|du|d')\s?\S+$/i.test(out.club)) out.club = out.club
  return out
}
