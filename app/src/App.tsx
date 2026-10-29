import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { SessionProvider } from './lib/session'
import SiteLayout from './layouts/SiteLayout'
import AppLayout from './layouts/AppLayout'

// Site
const Landing = lazy(() => import('./surfaces/site/Landing'))
const Library = lazy(() => import('./surfaces/site/Library'))
const Pricing = lazy(() => import('./surfaces/site/Pricing'))
const Settings = lazy(() => import('./surfaces/site/Settings'))
const Review = lazy(() => import('./surfaces/site/Review'))
const Brand = lazy(() => import('./surfaces/site/Brand'))
// Games (full screen, three.js loaded only here)
const Games = lazy(() => import('./surfaces/site/Games'))
const NjangiGame = lazy(() => import('./games/njangi/NjangiApp'))
const LionceauxGame = lazy(() => import('./games/lionceaux/LionceauxApp'))
// Mola (onboarding + action agent)
const Onboarding = lazy(() => import('./surfaces/mola/Onboarding'))
const MolaHub = lazy(() => import('./surfaces/mola/MolaHub'))
// Training
const DrillLibrary = lazy(() => import('./surfaces/training/DrillLibrary'))
const DrillDetail = lazy(() => import('./surfaces/training/DrillDetail'))
const Sessions = lazy(() => import('./surfaces/training/Sessions'))
const SessionBuilder = lazy(() => import('./surfaces/training/SessionBuilder'))
const WeekPlanner = lazy(() => import('./surfaces/training/WeekPlanner'))
// Team and matches
const Roster = lazy(() => import('./surfaces/team/Roster'))
const PlayerDetail = lazy(() => import('./surfaces/team/PlayerDetail'))
const Matches = lazy(() => import('./surfaces/team/Matches'))
const MatchSetup = lazy(() => import('./surfaces/team/MatchSetup'))
const MatchSheet = lazy(() => import('./surfaces/team/MatchSheet'))
const TeamJourney = lazy(() => import('./surfaces/team/Journey'))
const Observe = lazy(() => import('./surfaces/team/Observe'))
// Analysis
const AnalysisHub = lazy(() => import('./surfaces/analysis/AnalysisHub'))
const LiveTagger = lazy(() => import('./surfaces/analysis/LiveTagger'))
const MatchReport = lazy(() => import('./surfaces/analysis/MatchReport'))
const VideoList = lazy(() => import('./surfaces/analysis/VideoList'))
const VideoStudio = lazy(() => import('./surfaces/analysis/VideoStudio'))
// Home and player space
const Home = lazy(() => import('./surfaces/player/Home'))
const PlayerSpace = lazy(() => import('./surfaces/player/PlayerSpace'))
const Lessons = lazy(() => import('./surfaces/player/Lessons'))
const Notebook = lazy(() => import('./surfaces/player/Notebook'))
const PlayerJourney = lazy(() => import('./surfaces/player/Journey'))

const Loading = () => <div className="grid min-h-[50vh] place-items-center"><div className="h-9 w-9 animate-spin rounded-full border-4 border-forest-100 border-t-forest-600" /></div>

export default function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route element={<SiteLayout />}>
              <Route index element={<Landing />} />
              <Route path="livres" element={<Library />} />
              <Route path="premium" element={<Pricing />} />
              <Route path="revue" element={<Review />} />
              <Route path="marque" element={<Brand />} />
              <Route path="jeux" element={<Games />} />
            </Route>
            <Route path="jeux/code-njangi/*" element={<NjangiGame />} />
            <Route path="jeux/lionceaux/*" element={<LionceauxGame />} />
            <Route path="bienvenue" element={<Onboarding />} />
            <Route path="app" element={<AppLayout />}>
              <Route index element={<Home />} />
              <Route path="mola" element={<MolaHub />} />
              <Route path="exercices" element={<DrillLibrary />} />
              <Route path="exercices/:id" element={<DrillDetail />} />
              <Route path="seances" element={<Sessions />} />
              <Route path="seances/:id" element={<SessionBuilder />} />
              <Route path="semaine" element={<WeekPlanner />} />
              <Route path="equipe" element={<Roster />} />
              <Route path="equipe/:id" element={<PlayerDetail />} />
              <Route path="equipe/:id/parcours" element={<TeamJourney />} />
              <Route path="observer" element={<Observe />} />
              <Route path="matchs" element={<Matches />} />
              <Route path="matchs/nouveau" element={<MatchSetup />} />
              <Route path="matchs/:id" element={<MatchSheet />} />
              <Route path="matchs/:id/modifier" element={<MatchSetup />} />
              <Route path="analyse" element={<AnalysisHub />} />
              <Route path="analyse/live/:id" element={<LiveTagger />} />
              <Route path="analyse/rapport/:id" element={<MatchReport />} />
              <Route path="analyse/video" element={<VideoList />} />
              <Route path="analyse/video/:id" element={<VideoStudio />} />
              <Route path="joueur" element={<PlayerSpace />} />
              <Route path="joueur/lecons" element={<Lessons />} />
              <Route path="joueur/carnet" element={<Notebook />} />
              <Route path="joueur/parcours" element={<PlayerJourney />} />
              <Route path="livres" element={<Library />} />
              <Route path="premium" element={<Pricing />} />
              <Route path="reglages" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </SessionProvider>
  )
}
