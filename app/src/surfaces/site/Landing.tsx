import { PageHeader } from '../../ui'
import { useDocumentTitle } from '../../lib/hooks'

// PLACEHOLDER: replaced by the owner of this surface (see docs/CONVENTIONS.md).
export default function Landing() {
  useDocumentTitle('Landing')
  return <PageHeader eyebrow="Njangi" title="Landing" subtitle="En construction." />
}
