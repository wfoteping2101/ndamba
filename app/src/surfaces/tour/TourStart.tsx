// Placeholder: replaced by the tour build.
import { useT } from '../../i18n'

export default function TourStart() {
  const { t } = useT('tour')
  return <div className="card card-pad"><h1 className="font-display text-2xl font-semibold text-ink">{t('title')}</h1></div>
}
