// A Leçon du Ballon played: the notebook's drawing on the pitch, the lesson engine of the Académie.
import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import i18n, { useT } from '../../i18n'
import { LessonScreen } from '../njangi/academy/Lesson'
import { tome1Chapter } from '../njangi/links'
import { GameFrame, TopBar } from '../shared/ui'
import { lessonByNo, lessonDrill, lessonGameplay } from './lessons'

const tr = (lng: 'fr' | 'en', key: string, vars?: Record<string, unknown>) => i18n.t(key, { lng, ns: 'lionceaux', ...vars }) as string

export default function LessonPlay() {
  const { n } = useParams()
  const no = Number(n)
  const { t } = useT('lionceaux')
  const lesson = lessonByNo(no)
  const drill = useMemo(() => {
    if (!lesson?.diagram) return null
    const text = (lng: 'fr' | 'en') => ({
      title: lesson.title,
      subtitle: tr(lng, 'lesson.playSub', { n: lesson.no }) + ' · ' + lesson.chapterTitle,
      objective: tr(lng, 'lesson.objective'),
      // the notebook's words, as the book prints them
      rules: lesson.lines,
    })
    return lessonDrill(lesson, { fr: text('fr'), en: text('en') })
  }, [lesson])
  const g = useMemo(() => (lesson ? { ...lessonGameplay(lesson), adaptation: t('lesson.adaptation') } : null), [lesson, t])
  if (!lesson || !drill || !g) return (
    <GameFrame className="bg-night-800">
      <TopBar back="/jeux/lionceaux/chapitres" title={lesson ? t('lesson.title', { n: lesson.no }) : t('chapters.title')} />
      <div className="mx-auto max-w-md px-5 pt-28 text-center">
        <p className="text-[15.5px] text-cream/80">{t('lesson.noDiagram')}</p>
        <Link to="/jeux/lionceaux/chapitres" className="btn-sun mt-5">{t('player.backToChapters')}</Link>
      </div>
    </GameFrame>
  )
  return <LessonScreen drill={drill} g={g} kicker={t('lesson.title', { n: lesson.no })} back="/jeux/lionceaux/chapitres" chain={false} sheet={{ href: tome1Chapter(no), label: t('chapters.read') }} />
}
