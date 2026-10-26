import { PageHeader } from '../../ui'
import { useDocumentTitle } from '../../lib/hooks'

// PLACEHOLDER: replaced by the owner of this surface (see docs/CONVENTIONS.md).
export default function Library() {
  useDocumentTitle('Library')
  return <PageHeader eyebrow="Njangi" title="Library" subtitle="En construction." />
}
