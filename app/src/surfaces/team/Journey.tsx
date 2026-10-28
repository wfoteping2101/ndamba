// /app/equipe/:id/parcours: the coach's view of one player's journey (seasons, evaluations,
// observations, matches, attendance, objectives, milestones).
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, UserX } from 'lucide-react'
import { EmptyState } from '../../ui'
import { useT } from '../../i18n'
import { useDocumentTitle } from '../../lib/hooks'
import { BackLink, Spinner, useJourney } from './components/journey/bits'
import { JourneyView } from './components/journey/JourneyView'

export default function TeamJourney() {
  const { id = '' } = useParams()
  const { t } = useT('journey')
  const data = useJourney(id)
  useDocumentTitle(data?.player ? t('page.docTitle', { name: data.player.name }) : t('page.docTitleBare'))
  if (data === undefined) return <Spinner />
  if (data === null) return (
    <div className="mx-auto max-w-lg pt-6">
      <EmptyState icon={<UserX size={32} />} title={t('page.notFoundTitle')} body={t('page.notFoundBody')} action={<Link to="/app/equipe" className="btn-primary">{t('page.backToTeam')}</Link>} />
    </div>
  )
  return <JourneyView data={data} viewer="coach" top={<BackLink to={`/app/equipe/${id}`}><ArrowLeft size={16} />{t('page.backToPlayer')}</BackLink>} />
}
