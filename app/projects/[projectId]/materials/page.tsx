import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MaterialsClient } from '@/components/materials/MaterialsClient'
import type { ProviderRate } from '@/types/database'

export default async function MaterialsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: materials }, { data: providers }, { data: rates }] = await Promise.all([
    supabase
      .from('materials')
      .select('*, provider:providers(id, name), provider_rate:provider_rates(id, label, rate_value, rate_timing), frames:material_frames(id, storage_path, order_index)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true }),
    supabase.from('providers').select('id, name, code').order('name'),
    supabase.from('provider_rates').select('*').order('created_at'),
  ])

  // Group rates by provider_id
  const ratesByProvider: Record<string, ProviderRate[]> = {}
  for (const r of (rates ?? []) as ProviderRate[]) {
    if (!ratesByProvider[r.provider_id]) ratesByProvider[r.provider_id] = []
    ratesByProvider[r.provider_id].push(r)
  }

  return (
    <MaterialsClient
      projectId={projectId}
      initialMaterials={materials ?? []}
      providers={providers ?? []}
      providerRates={ratesByProvider}
      userEmail={user.email ?? ''}
    />
  )
}
