// Placeholder: replaced by the club build.
import { useT } from '../../i18n'

export default function ClubHome() {
  const { t } = useT('club')
  return <div className="card card-pad"><h1 className="font-display text-2xl font-semibold text-ink">{t('title')}</h1></div>
}
