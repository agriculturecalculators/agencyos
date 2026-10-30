import { PageHeader, Empty } from '../components/ui'

export default function ComingSoon({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <div className="card"><Empty title={`${title} is being built`} text="This module arrives in the next build step." /></div>
    </>
  )
}
