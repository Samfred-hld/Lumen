// ══════════════════════════════════════════
// Lumen — Gerar Salario Mensal
// ══════════════════════════════════════════
// Cron: todo dia 5 (ou dia configurado pelo usuario)
// Cria Transaction de income com valor do salario.

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
    const month = String(monthNum).padStart(2, '0')
    const lastDay = new Date(year, monthNum, 0).getDate()
    const monthEnd = `${year}-${month}-${String(lastDay).padStart(2, '0')}`
    const results = [] as Array<{ user_id: string; generated: boolean; message: string }>

    // List all users
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) {
      return new Response(
        JSON.stringify({ error: 'Failed to list users: ' + listError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    for (const user of users) {
      // Fetch salary config from settings table
      const { data: settings } = await supabase
        .from('settings')
        .select('value')
        .eq('user_id', user.id)
        .eq('key', 'salaryConfig')
        .single()

      if (!settings) {
        results.push({ user_id: user.id, generated: false, message: 'Salario nao configurado' })
        continue
      }

      let salaryConfig
      try {
        salaryConfig = typeof settings.value === 'string' ? JSON.parse(settings.value) : settings.value
      } catch {
        results.push({ user_id: user.id, generated: false, message: 'Config de salario invalida' })
        continue
      }

      if (!salaryConfig.autoGenerate || !salaryConfig.value || salaryConfig.value <= 0) {
        results.push({ user_id: user.id, generated: false, message: 'Geracao automatica desativada' })
        continue
      }

      const salaryDay = salaryConfig.day || 5

      // Only generate on the configured salary day
      if (today.getDate() !== salaryDay) {
        results.push({ user_id: user.id, generated: false, message: `Hoje nao e o dia do salario (dia ${salaryDay})` })
        continue
      }

      const day = String(salaryDay).padStart(2, '0')
      const date = `${year}-${month}-${day}`

      // Check if already generated this month
      const { data: existing } = await supabase
        .from('transactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('source', 'cron_salary')
        .gte('date', `${year}-${month}-01`)
        .lte('date', monthEnd)

      if (existing && existing.length > 0) {
        results.push({ user_id: user.id, generated: false, message: 'Salario ja gerado este mes' })
        continue
      }

      const { error: insertError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          description: 'Salario',
          value: salaryConfig.value,
          type: 'income',
          category: 'Salario',
          date,
          is_fixed: true,
          payment_method: 'Transferencia',
          source: 'cron_salary',
        })

      if (insertError) {
        results.push({ user_id: user.id, generated: false, message: insertError.message })
      } else {
        results.push({ user_id: user.id, generated: true, message: `Salario gerado: R$ ${salaryConfig.value}` })
      }
    }

    const generated = results.filter(r => r.generated).length

    return new Response(
      JSON.stringify({ generated, total: users.length, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
