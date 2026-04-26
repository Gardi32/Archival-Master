import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReportsClient } from '@/components/reports/ReportsClient'

export default async function ReportsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: materials }, { data: providers }] = await Promise.all([
    supabase
      .from('materials')
      .select('*, provider:providers(id, name, code)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true }),
    supabase.from('providers').select('id, name, code').order('name'),
  ])

  return (
    <ReportsClient
      projectId={projectId}
      materials={(materials ?? []) as never}
      providers={providers ?? []}
      userEmail={user.email ?? ''}
    />
  )
}
