import clsx, { type ClassValue } from 'clsx'

export const cx = (...v: ClassValue[]) => clsx(v)

export const uid = (prefix = '') => prefix + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4)

export const nowISO = () => new Date().toISOString()
export const todayISO = () => toISODate(new Date())

export function toISODate(d: Date) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
export function parseISODate(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}
export function addDays(iso: string, n: number) {
  const d = parseISODate(iso); d.setDate(d.getDate() + n); return toISODate(d)
}
export function daysBetween(a: string, b: string) {
  return Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / 86400000)
}
/** Monday of the week containing iso */
export function weekStart(iso: string) {
  const d = parseISODate(iso); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return toISODate(d)
}

export function fmtDate(iso: string, lang: 'fr' | 'en' = 'fr', opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) {
  try { return parseISODate(iso).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', opts) } catch { return iso }
}
export function fmtClock(sec: number) {
  const s = Math.max(0, Math.floor(sec)); const m = Math.floor(s / 60); return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
export const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)

/** Money: USD and FCFA (XAF). 1 USD is about 600 FCFA (planning rate; shown as approximate). */
export const FCFA_PER_USD = 600
export function money(usd: number, lang: 'fr' | 'en' = 'fr') {
  return new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: usd % 1 ? 2 : 0 }).format(usd)
}
export function fcfa(usd: number, lang: 'fr' | 'en' = 'fr') {
  const v = Math.round((usd * FCFA_PER_USD) / 100) * 100
  return new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-US').format(v) + ' FCFA'
}

export function download(filename: string, content: string | Blob, type = 'text/plain') {
  const blob = typeof content === 'string' ? new Blob([content], { type }) : content
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 500)
}
