// Placeholder: replaced by the editor build.
import { useT } from '../../i18n'

export default function Presenter() {
  const { t } = useT('editor')
  return <div className="card card-pad"><h1 className="font-display text-2xl font-semibold text-ink">{t('title')}</h1></div>
}
