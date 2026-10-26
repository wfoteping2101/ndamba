import { PageHeader } from '../../ui'
import { useDocumentTitle } from '../../lib/hooks'

// PLACEHOLDER: replaced by the owner of this surface (see docs/CONVENTIONS.md).
export default function Notebook() {
  useDocumentTitle('Notebook')
  return <PageHeader eyebrow="Njangi" title="Notebook" subtitle="En construction." />
}
