import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { GanttClient } from '@/components/gantt/GanttClient'

export default async function GanttPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: tasks } = await supabase
    .from('gantt_tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('order_index', { ascending: true })

  return (
    <GanttClient
      projectId={projectId}
      initialTasks={tasks ?? []}
      userEmail={user.email ?? ''}
    />
  )
}
