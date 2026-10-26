import { PageHeader } from '../../ui'
import { useDocumentTitle } from '../../lib/hooks'

// PLACEHOLDER: replaced by the owner of this surface (see docs/CONVENTIONS.md).
export default function Home() {
  useDocumentTitle('Home')
  return <PageHeader eyebrow="Njangi" title="Home" subtitle="En construction." />
}
