import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DocumentsClient } from '@/components/documents/DocumentsClient'

export default async function DocumentsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: documents }, { data: orders }] = await Promise.all([
    supabase
      .from('documents')
      .select('*, order:orders(id, provider:providers(name))')
      .eq('project_id', projectId)
      .order('uploaded_at', { ascending: false }),
    supabase
      .from('orders')
      .select('id, provider:providers(name)')
      .eq('project_id', projectId),
  ])

  return (
    <DocumentsClient
      projectId={projectId}
      initialDocuments={(documents ?? []) as never}
      orders={(orders ?? []) as never}
      userEmail={user.email ?? ''}
    />
  )
}
