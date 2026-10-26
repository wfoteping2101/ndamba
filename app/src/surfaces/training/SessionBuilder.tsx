import { PageHeader } from '../../ui'
import { useDocumentTitle } from '../../lib/hooks'

// PLACEHOLDER: replaced by the owner of this surface (see docs/CONVENTIONS.md).
export default function SessionBuilder() {
  useDocumentTitle('SessionBuilder')
  return <PageHeader eyebrow="Njangi" title="SessionBuilder" subtitle="En construction." />
}
