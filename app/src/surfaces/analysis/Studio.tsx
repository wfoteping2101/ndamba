// Placeholder: replaced by the viz build.
import { useT } from '../../i18n'

export default function Studio() {
  const { t } = useT('viz')
  return <div className="card card-pad"><h1 className="font-display text-2xl font-semibold text-ink">{t('title')}</h1></div>
}
