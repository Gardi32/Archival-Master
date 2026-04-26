import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ResearchClient } from '@/components/research/ResearchClient'
import type { ResearchItem, Provider, ProviderRate } from '@/types/database'

export default async function ResearchPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: items }, { data: providers }, { data: rates }] = await Promise.all([
    supabase
      .from('research_items')
      .select('*')
      .eq('project_id', projectId)
      .order('id_number', { ascending: true, nullsFirst: false }),
    supabase
      .from('providers')
      .select('id, name')
      .order('name'),
    supabase
      .from('provider_rates')
      .select('*')
      .or(`project_id.is.null,project_id.eq.${projectId}`)
      .order('label'),
  ])

  const providerRates: Record<string, ProviderRate[]> = {}
  for (const r of (rates ?? []) as ProviderRate[]) {
    if (!providerRates[r.provider_id]) providerRates[r.provider_id] = []
    providerRates[r.provider_id].push(r)
  }

  return (
    <ResearchClient
      projectId={projectId}
      initialItems={(items ?? []) as ResearchItem[]}
      providers={(providers ?? []) as Pick<Provider, 'id' | 'name'>[]}
      providerRates={providerRates}
      userEmail={user.email ?? ''}
    />
  )
}
