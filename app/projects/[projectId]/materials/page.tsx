import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MaterialsClient } from '@/components/materials/MaterialsClient'

export default async function MaterialsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: materials }, { data: providers }] = await Promise.all([
    supabase
      .from('materials')
      .select('*, provider:providers(id, name), frames:material_frames(id, storage_path, order_index)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true }),
    supabase
      .from('providers')
      .select('id, name')
      .eq('project_id', projectId)
      .order('name'),
  ])

  return (
    <MaterialsClient
      projectId={projectId}
      initialMaterials={materials ?? []}
      providers={providers ?? []}
      userEmail={user.email ?? ''}
    />
  )
}
