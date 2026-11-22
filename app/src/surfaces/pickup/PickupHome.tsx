// Placeholder: replaced by the pickup build.
import { useT } from '../../i18n'

export default function PickupHome() {
  const { t } = useT('pickup')
  return <div className="card card-pad"><h1 className="font-display text-2xl font-semibold text-ink">{t('title')}</h1></div>
}
