import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TodoClient } from '@/components/todo/TodoClient'

export default async function TodoPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: tasks } = await supabase
    .from('project_tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  return (
    <TodoClient
      projectId={projectId}
      initialTasks={tasks ?? []}
      userEmail={user.email ?? ''}
    />
  )
}
