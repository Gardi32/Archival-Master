import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProvidersClient } from '@/components/providers/ProvidersClient'
import type { Provider } from '@/types/database'

export default async function ProvidersPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: providers }, { data: materialCounts }] = await Promise.all([
    supabase.from('providers').select('*').eq('project_id', projectId).order('name'),
    supabase.from('materials').select('provider_id').eq('project_id', projectId),
  ])

  const counts: Record<string, number> = {}
  for (const m of (materialCounts ?? []) as { provider_id: string | null }[]) {
    if (m.provider_id) counts[m.provider_id] = (counts[m.provider_id] ?? 0) + 1
  }

  return <ProvidersClient projectId={projectId} initialProviders={(providers ?? []) as Provider[]} materialCounts={counts} userEmail={user.email ?? ''} />
}
