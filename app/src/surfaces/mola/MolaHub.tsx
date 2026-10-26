import { PageHeader } from '../../ui'
import { useDocumentTitle } from '../../lib/hooks'

// PLACEHOLDER: replaced by the owner of this surface (see docs/CONVENTIONS.md).
export default function MolaHub() {
  useDocumentTitle('MolaHub')
  return <PageHeader eyebrow="Njangi" title="MolaHub" subtitle="En construction." />
}
