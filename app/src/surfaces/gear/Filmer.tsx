// Placeholder: replaced by the gear build.
import { useT } from '../../i18n'

export default function Filmer() {
  const { t } = useT('gear')
  return <div className="card card-pad"><h1 className="font-display text-2xl font-semibold text-ink">{t('title')}</h1></div>
}
