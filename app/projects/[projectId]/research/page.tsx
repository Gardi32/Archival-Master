import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ResearchClient } from '@/components/research/ResearchClient'
import type { ResearchItem } from '@/types/database'

export default async function ResearchPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: items } = await supabase
    .from('research_items')
    .select('*')
    .eq('project_id', projectId)
    .order('id_number', { ascending: true, nullsFirst: false })

  return (
    <ResearchClient
      projectId={projectId}
      initialItems={(items ?? []) as ResearchItem[]}
      userEmail={user.email ?? ''}
    />
  )
}
