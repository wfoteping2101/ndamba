// Lionceaux : le ballon qui voyage. Full-screen story game under /jeux/lionceaux.
import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { useT } from '../../i18n'
import { GameFrame, Spinner } from '../shared/ui'

const Title = lazy(() => import('./Title'))
const Chapters = lazy(() => import('./Chapters'))
const ChapterPlayer = lazy(() => import('./ChapterPlayer'))
const LessonPlay = lazy(() => import('./LessonPlay'))
const CastSheet = lazy(() => import('./CastSheet'))
const Places = lazy(() => import('./Places'))

function Loading() {
  const { t } = useT('jeux')
  return <GameFrame><Spinner label={t('shell.loading')} /></GameFrame>
}

export default function LionceauxApp() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route index element={<Title />} />
        <Route path="chapitres" element={<Chapters />} />
        <Route path="chapitre/:n" element={<ChapterPlayer />} />
        <Route path="lecon/:n" element={<LessonPlay />} />
        <Route path="personnages" element={<CastSheet />} />
        <Route path="lieux" element={<Places />} />
        <Route path="*" element={<Title />} />
      </Routes>
    </Suspense>
  )
}
