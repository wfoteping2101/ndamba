// Le Code Njangi : l'art de posséder. Full-screen game with its own routes under /jeux/code-njangi.
import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { useT } from '../../i18n'
import { GameFrame, Spinner } from '../shared/ui'

const Home = lazy(() => import('./Home'))
const Academie = lazy(() => import('./academy/Academie'))
const Lesson = lazy(() => import('./academy/Lesson'))
const Lecture = lazy(() => import('./reading/Lecture'))
const DixPasses = lazy(() => import('./tenpasses/DixPasses'))
const Tableau = lazy(() => import('./board/Tableau'))
const Analyse = lazy(() => import('./analysis/Analyse'))
const Parcours = lazy(() => import('./path/Parcours'))

function Loading() {
  const { t } = useT('jeux')
  return <GameFrame><Spinner label={t('shell.loading')} /></GameFrame>
}

export default function NjangiApp() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route index element={<Home />} />
        <Route path="academie" element={<Academie />} />
        <Route path="academie/:id" element={<Lesson />} />
        <Route path="lecture" element={<Lecture />} />
        <Route path="dix-passes" element={<DixPasses />} />
        <Route path="tableau" element={<Tableau />} />
        <Route path="analyse" element={<Analyse />} />
        <Route path="parcours" element={<Parcours />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </Suspense>
  )
}
