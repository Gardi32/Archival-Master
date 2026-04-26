import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProvidersClient } from '@/components/providers/ProvidersClient'
import type { Provider, ProviderRate } from '@/types/database'

export default async function ProvidersPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: providers }, { data: rates }, { data: linked }] = await Promise.all([
    supabase.from('providers').select('*').order('name'),
    supabase.from('provider_rates').select('*').order('created_at'),
    supabase.from('project_providers').select('provider_id').eq('project_id', projectId),
  ])

  // Group rates by provider
  const ratesByProvider: Record<string, ProviderRate[]> = {}
  for (const r of (rates ?? []) as ProviderRate[]) {
    if (!ratesByProvider[r.provider_id]) ratesByProvider[r.provider_id] = []
    ratesByProvider[r.provider_id].push(r)
  }

  const enrichedProviders: Provider[] = (providers ?? []).map(p => ({
    ...p,
    rates: ratesByProvider[p.id] ?? [],
  }))

  const linkedIds = (linked ?? []).map(l => l.provider_id)

  return (
    <ProvidersClient
      projectId={projectId}
      initialProviders={enrichedProviders}
      initialLinkedIds={linkedIds}
      userEmail={user.email ?? ''}
    />
  )
}
