import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BitacoraClient } from '@/components/bitacora/BitacoraClient'
import type { LogEntry, ResearchItem } from '@/types/database'

export default async function BitacoraPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: entries }, { data: researchItems }] = await Promise.all([
    supabase
      .from('log_entries')
      .select('*, research_links:log_entry_research_links(log_entry_id, research_item_id, research_item:research_items(*))')
      .eq('project_id', projectId)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('research_items')
      .select('id, id_number, shot_code, subject, supplier_name, file_type')
      .eq('project_id', projectId)
      .order('id_number', { ascending: true, nullsFirst: false }),
  ])

  return (
    <BitacoraClient
      projectId={projectId}
      initialEntries={(entries ?? []) as LogEntry[]}
      researchItems={(researchItems ?? []) as Pick<ResearchItem, 'id' | 'id_number' | 'shot_code' | 'subject' | 'supplier_name' | 'file_type'>[]}
    />
  )
}
