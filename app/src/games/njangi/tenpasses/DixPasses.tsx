// Mode D, Défi des dix passes: the lesson engine on the full pitch, from our keeper to the net.
import { useMemo } from 'react'
import { useT } from '../../../i18n'
import i18n from '../../../i18n'
import { LessonScreen } from '../academy/Lesson'
import { tome1Chapter } from '../links'
import { CHALLENGE_GAMEPLAY, challengeDrill } from './challenge'

const pick = (lang: 'fr' | 'en', key: string) => i18n.t(key, { lng: lang, ns: 'jeux', returnObjects: true }) as unknown

export default function DixPasses() {
  const { t } = useT('jeux')
  const drill = useMemo(() => {
    const text = (lang: 'fr' | 'en') => ({
      title: pick(lang, 'dix.title') as string,
      subtitle: pick(lang, 'dix.subtitle') as string,
      objective: pick(lang, 'dix.objective') as string,
      rules: pick(lang, 'dix.rules') as string[],
    })
    return challengeDrill({ fr: text('fr'), en: text('en') })
  }, [])
  const g = useMemo(() => ({ ...CHALLENGE_GAMEPLAY, adaptation: t('dix.adaptation') }), [t])
  return <LessonScreen drill={drill} g={g} back="/jeux/code-njangi" chain sheet={{ href: tome1Chapter(40), label: t('dix.lessonLink') }} rulesLabel={t('dix.rulesLabel')} docTitle={t('dix.title')} />
}
