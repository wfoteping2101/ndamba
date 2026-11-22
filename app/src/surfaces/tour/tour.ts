// The guided tour: a walk through the whole app on the professional club demo (Étoile de la Côte).
// Each step opens a page and, when it can find it, puts a light on one element (data-tour="..." or a CSS selector).
// The state lives in sessionStorage, so a reload keeps the step; the overlay (TourOverlay) is mounted by AppLayout.
import { useEffect, useState } from 'react'

export interface TourStep {
  key: string // texts: tour.json steps.<key>.title / .body
  chapter: string // tour.json chapters.<chapter>
  route: string
  /** element to light up; several selectors separated by commas, the first found wins */
  target?: string
  /** phone: put the card at the top instead of the bottom (the element sits low) */
  top?: boolean
}

export const TOUR_STEPS: TourStep[] = [
  { key: 'home', chapter: 'welcome', route: '/app', target: '[data-tour="home-today"], main h1' },
  { key: 'guide', chapter: 'welcome', route: '/app', target: '[data-tour="guide-link"]' },
  { key: 'drills', chapter: 'training', route: '/app/exercices', target: '[data-tour="drill-grid"], main ul, main section' },
  { key: 'drill', chapter: 'training', route: '/app/exercices/R04', target: '[data-tour="pitch-video"], main figure, main canvas' },
  { key: 'sessions', chapter: 'training', route: '/app/seances', target: 'main section, main ul, main h1' },
  { key: 'week', chapter: 'training', route: '/app/semaine', target: 'main section' },
  { key: 'roster', chapter: 'team', route: '/app/equipe', target: 'main section' },
  { key: 'player', chapter: 'team', route: '/app/equipe/pl_6', target: 'main section' },
  { key: 'matchSheet', chapter: 'team', route: '/app/matchs/ma_next', target: '[data-tour="match-video"], main section' },
  { key: 'club', chapter: 'club', route: '/app/club', target: '[data-tour="club-overview"], main section' },
  { key: 'clubMembers', chapter: 'club', route: '/app/club/membres', target: '[data-tour="club-members"], main section' },
  { key: 'clubVideos', chapter: 'club', route: '/app/club/videos', target: '[data-tour="club-videos"], main section' },
  { key: 'clubPlayers', chapter: 'club', route: '/app/club/joueurs', target: '[data-tour="club-players"], main section' },
  { key: 'analysis', chapter: 'analyse', route: '/app/analyse', target: '[data-tour="analysis-how"], main section' },
  { key: 'studio', chapter: 'analyse', route: '/app/analyse/video/vp_demo_past', target: '[data-tour="studio-player"], main video' },
  { key: 'coding', chapter: 'analyse', route: '/app/analyse/video/vp_demo_past?panneau=coder', target: '[data-tour="studio-codes"]', top: true },
  { key: 'clips', chapter: 'editor', route: '/app/analyse/video/vp_demo_past?panneau=clips', target: '[data-tour="studio-clips"]', top: true },
  { key: 'drawing', chapter: 'editor', route: '/app/analyse/video/vp_demo_past', target: '[data-tour="studio-draw"]' },
  { key: 'session', chapter: 'editor', route: '/app/analyse/video/vp_demo_past/seance?p=pl_demo_monday', target: '[data-tour="presenter"]' },
  { key: 'ai', chapter: 'editor', route: '/app/analyse/video/vp_demo_past?panneau=ia', target: '[data-tour="studio-ai"], section[aria-labelledby="ai-h"]', top: true },
  { key: 'report', chapter: 'maps', route: '/app/analyse/rapport/ma_past', target: '[data-tour="report-head"], main section' },
  { key: 'maps', chapter: 'maps', route: '/app/analyse/rapport/ma_past?onglet=cartes', target: '[data-tour="report-maps"], main svg' },
  { key: 'players', chapter: 'maps', route: '/app/analyse/rapport/ma_past?onglet=joueurs', target: '[data-tour="report-players"], main section' },
  { key: 'assist', chapter: 'maps', route: '/app/analyse/rapport/ma_past?onglet=mola', target: '[data-tour="report-assist"], main section' },
  { key: 'season', chapter: 'maps', route: '/app/analyse/studio', target: '[data-tour="season"], main section' },
  { key: 'filming', chapter: 'filming', route: '/app/filmer', target: '[data-tour="filming-gear"], main section' },
  { key: 'upload', chapter: 'filming', route: '/app/analyse/video?nouveau=ma_next', target: '[data-tour="upload-choice"], [role="radiogroup"]' },
  { key: 'pickup', chapter: 'pickup', route: '/app/pickup', target: '[data-tour="pickup-home"], main section' },
  { key: 'pickupGame', chapter: 'pickup', route: '/app/pickup', target: '[data-tour="pickup-game"], main section' },
  { key: 'mola', chapter: 'mola', route: '/app/mola', target: '[data-tour="mola-chat"], main section, main h1' },
  { key: 'premium', chapter: 'end', route: '/app/premium', target: 'main section' },
  { key: 'end', chapter: 'end', route: '/app' },
]

export const TOUR_CHAPTERS = ['welcome', 'training', 'team', 'club', 'analyse', 'editor', 'maps', 'filming', 'pickup', 'mola', 'end'] as const

const KEY = 'njangi.tour'
const EVT = 'njangi-tour'

export interface TourState { step: number }

export function readTour(): TourState | null {
  try { const v = sessionStorage.getItem(KEY); return v ? (JSON.parse(v) as TourState) : null } catch { return null }
}
export function writeTour(s: TourState | null) {
  try { if (s) sessionStorage.setItem(KEY, JSON.stringify(s)); else sessionStorage.removeItem(KEY) } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event(EVT))
}
export function useTour(): TourState | null {
  const [s, setS] = useState<TourState | null>(readTour)
  useEffect(() => {
    const f = () => setS(readTour())
    window.addEventListener(EVT, f)
    window.addEventListener('storage', f)
    return () => { window.removeEventListener(EVT, f); window.removeEventListener('storage', f) }
  }, [])
  return s
}
/** The first step of a chapter (to start the tour anywhere). */
export const chapterStart = (c: string) => Math.max(0, TOUR_STEPS.findIndex((s) => s.chapter === c))
