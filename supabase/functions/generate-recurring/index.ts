// ══════════════════════════════════════════
// Lumen — Gerar Transacoes Recorrentes
// ══════════════════════════════════════════
// Cron: todo dia 1 as 00:00 (via pg_cron)
// Le templates, cria transactions do mes corrente.
// Verifica duplicatas via description + source no mes corrente.

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
    const year = today.getFullYear()
    const monthNum = today.getMonth() + 1
    const currentMonth = `${year}-${String(monthNum).padStart(2, '0')}`
    const lastDay = new Date(year, monthNum, 0).getDate()
    const monthEnd = `${currentMonth}-${String(lastDay).padStart(2, '0')}`
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
      // Fetch templates for this user
      const { data: templates } = await supabase
        .from('templates')
        .select('*')
        .eq('user_id', user.id)

      if (!templates || templates.length === 0) continue

      // Fetch existing cron_recurring transactions this month
      const { data: existing } = await supabase
        .from('transactions')
        .select('description')
        .eq('user_id', user.id)
        .eq('source', 'cron_recurring')
        .gte('date', `${currentMonth}-01`)
        .lte('date', monthEnd)

      const existingDescs = new Set((existing || []).map(t => t.description))

      for (const tpl of templates) {
        if (existingDescs.has(tpl.description)) {
          log.skipped.push(`${user.id}:${tpl.description}`)
          continue
        }

        const day = String(Math.min(tpl.day_of_month || tpl.dayOfMonth || 1, 28)).padStart(2, '0')
        const date = `${currentMonth}-${day}`

        const { error: insertError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            description: tpl.description,
            value: tpl.value,
            type: tpl.type,
            category: tpl.category,
            date,
            is_fixed: true,
            payment_method: tpl.payment_method || tpl.paymentMethod || 'Debito',
            source: 'cron_recurring',
          })

        if (insertError) {
          log.errors.push(`${user.id}:${tpl.description}:${insertError.message}`)
        } else {
          log.generated++
        }
      }
    }

    return new Response(
      JSON.stringify({
        ...log,
        message: `${log.generated} gerada(s), ${log.skipped.length} pulada(s), ${log.errors.length} erro(s)`,
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
