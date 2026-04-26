import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EdlClient } from '@/components/edl/EdlClient'

export default async function EdlPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: imports }, { data: materials }] = await Promise.all([
    supabase
      .from('edl_imports')
      .select('*, clips:edl_clips(*, material:materials(id, title, code, provider:providers(name)))')
      .eq('project_id', projectId)
      .order('imported_at', { ascending: false }),
    supabase
      .from('materials')
      .select('id, title, code, provider:providers(id, name), provider_rate:provider_rates(id, label, rate_value, rate_timing)')
      .eq('project_id', projectId)
      .order('title'),
  ])

  return (
    <EdlClient
      projectId={projectId}
      initialImports={(imports ?? []) as never}
      materials={(materials ?? []) as never}
      userEmail={user.email ?? ''}
    />
  )
}
