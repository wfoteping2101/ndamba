import { PageHeader } from '../../ui'
import { useDocumentTitle } from '../../lib/hooks'

// PLACEHOLDER: replaced by the owner of this surface (see docs/CONVENTIONS.md).
export default function Lessons() {
  useDocumentTitle('Lessons')
  return <PageHeader eyebrow="Njangi" title="Lessons" subtitle="En construction." />
}
