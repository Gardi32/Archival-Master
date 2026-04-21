import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OrdersClient } from '@/components/budget/OrdersClient'

export default async function OrdersPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: orders }, { data: providers }, { data: budgets }] = await Promise.all([
    supabase
      .from('orders')
      .select(`
        *,
        provider:providers(id, name, email, contact_name),
        items:order_items(*, material:materials(id, title, code)),
        documents(id, type, filename)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }),
    supabase.from('providers').select('id, name').eq('project_id', projectId).order('name'),
    supabase.from('budgets').select('id, name, total_amount, currency').eq('project_id', projectId),
  ])

  return (
    <OrdersClient
      projectId={projectId}
      initialOrders={orders ?? []}
      providers={providers ?? []}
      budgets={budgets ?? []}
      userEmail={user.email ?? ''}
    />
  )
}
