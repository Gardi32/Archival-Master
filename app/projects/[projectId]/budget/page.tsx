import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BudgetClient } from '@/components/budget/BudgetClient'

export default async function BudgetPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: edlImports }, { data: budgets }] = await Promise.all([
    supabase
      .from('edl_imports')
      .select(`
        id, name, imported_at, format,
        clips:edl_clips(
          id, clip_name, duration_sec, material_id,
          material:materials(id, title, code, cost_amount, cost_currency, cost_unit, provider_id, provider:providers(id, name))
        )
      `)
      .eq('project_id', projectId)
      .order('imported_at', { ascending: false }),
    supabase
      .from('budgets')
      .select('*, items:budget_items(*, material:materials(id, title, code, provider:providers(name)))')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }),
  ])

  return (
    <BudgetClient
      projectId={projectId}
      edlImports={(edlImports ?? []) as never}
      initialBudgets={(budgets ?? []) as never}
      userEmail={user.email ?? ''}
    />
  )
}
