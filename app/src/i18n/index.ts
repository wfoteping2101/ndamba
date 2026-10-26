// i18n: French first, English second. Every surface owns its own namespace file:
// src/i18n/fr/<ns>.json and src/i18n/en/<ns>.json (same keys in both).
import i18n from 'i18next'
import { initReactI18next, useTranslation } from 'react-i18next'

type Dict = Record<string, unknown>
const load = (mods: Record<string, unknown>) => {
  const out: Record<string, Dict> = {}
  for (const [path, mod] of Object.entries(mods)) {
    const ns = path.split('/').pop()!.replace('.json', '')
    out[ns] = ((mod as { default?: Dict }).default ?? mod) as Dict
  }
  return out
}
const fr = load(import.meta.glob('./fr/*.json', { eager: true }))
const en = load(import.meta.glob('./en/*.json', { eager: true }))

export const LANG_KEY = 'njangi.lang'
export type Lang = 'fr' | 'en'
const saved = (() => { try { return localStorage.getItem(LANG_KEY) } catch { return null } })()

i18n.use(initReactI18next).init({
  resources: { fr, en },
  lng: saved === 'en' ? 'en' : 'fr',
  fallbackLng: 'fr',
  ns: Object.keys(fr),
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  returnNull: false,
})

export function setLang(lang: Lang) {
  i18n.changeLanguage(lang)
  try { localStorage.setItem(LANG_KEY, lang) } catch { /* private mode */ }
  document.documentElement.lang = lang
}
document.documentElement.lang = i18n.language

/** t for one namespace: const { t, lang } = useT('training') */
export function useT(ns: string = 'common') {
  const { t, i18n: inst } = useTranslation(ns)
  return { t, lang: (inst.language === 'en' ? 'en' : 'fr') as Lang }
}

export default i18n
