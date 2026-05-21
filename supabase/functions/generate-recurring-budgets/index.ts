// ══════════════════════════════════════════
// Lumen — Gerar Orcamentos Recorrentes
// ══════════════════════════════════════════
// Cron: todo dia 1 as 00:00 (via pg_cron)
// Replica budgets com is_recurring: true para o mes corrente.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const today = new Date()
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    const log = { generated: 0, skipped: [] as string[], errors: [] as string[], month: currentMonth }

    // List all users
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) {
      return new Response(
        JSON.stringify({ error: 'Failed to list users: ' + listError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    for (const user of users) {
      // Fetch recurring budgets for this user
      const { data: recurring } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_recurring', true)

      if (!recurring || recurring.length === 0) continue

      // Fetch existing budgets this month
      const { data: existing } = await supabase
        .from('budgets')
        .select('category')
        .eq('user_id', user.id)
        .eq('month', currentMonth)

      const existingCategories = new Set((existing || []).map(b => b.category))

      for (const budget of recurring) {
        if (existingCategories.has(budget.category)) {
          log.skipped.push(`${user.id}:${budget.category}`)
          continue
        }

        const { error: insertError } = await supabase
          .from('budgets')
          .insert({
            user_id: user.id,
            category: budget.category,
            limit: budget.limit,
            month: currentMonth,
            is_recurring: true,
          })

        if (insertError) {
          log.errors.push(`${user.id}:${budget.category}:${insertError.message}`)
        } else {
          log.generated++
        }
      }
    }

    return new Response(
      JSON.stringify({
        ...log,
        message: `${log.generated} gerado(s), ${log.skipped.length} pulada(s), ${log.errors.length} erro(s)`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
