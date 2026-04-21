import { redirect } from 'next/navigation'

export default async function ProjectRoot({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  redirect(`/projects/${projectId}/materials`)
}
