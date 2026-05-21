// ══════════════════════════════════════════
// Lumen — Alerta de Orcamento Ultrapassado
// ══════════════════════════════════════════
// Cron: semanal (segunda-feira) via pg_cron
// Verifica orcamentos ultrapassados e envia email.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

async function sendEmail(to: string, subject: string, body: string) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  if (!resendApiKey) {
    console.log(`[EMAIL LOG] To: ${to} | Subject: ${subject} | Body: ${body}`)
    return { sent: false, reason: 'RESEND_API_KEY not configured' }
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: Deno.env.get('EMAIL_FROM') || 'Lumen <noreply@lumen.app>',
      to,
      subject,
      text: body,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Resend API error: ${res.status} ${err}`)
  }

  return { sent: true }
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
    const results = [] as Array<{ user_id: string; alerts: number; exceeded: Array<{ category: string; limit: number; actual: number; pct: number }> }>

    // List all users
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) {
      return new Response(
        JSON.stringify({ error: 'Failed to list users: ' + listError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    for (const user of users) {
      // Fetch budgets
      const { data: budgets } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', currentMonth)

      if (!budgets || budgets.length === 0) continue

      // Fetch expense transactions this month
      const { data: transactions } = await supabase
        .from('transactions')
        .select('category, value')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .gte('date', `${currentMonth}-01`)
        .lte('date', monthEnd)

      // Calculate spending per category
      const spent: Record<string, number> = {}
      for (const tx of (transactions || [])) {
        const cat = tx.category || 'Outros'
        spent[cat] = (spent[cat] || 0) + Math.abs(tx.value || 0)
      }

      // Find exceeded budgets
      const exceeded: Array<{ category: string; limit: number; actual: number; pct: number }> = []
      for (const budget of budgets) {
        const limit = parseFloat(String(budget.limit || 0))
        const actual = spent[budget.category] || 0
        if (limit > 0 && actual > limit) {
          exceeded.push({
            category: budget.category,
            limit,
            actual,
            pct: Math.round((actual / limit) * 100),
          })
        }
      }

      if (exceeded.length > 0 && user.email) {
        const body = exceeded
          .map(e => `- ${e.category}: R$ ${e.actual.toFixed(2)} de R$ ${e.limit.toFixed(2)} (${e.pct}%)`)
          .join('\n')

        try {
          await sendEmail(
            user.email,
            `${exceeded.length} orcamento(s) ultrapassado(s) este mes`,
            `Os seguintes orcamentos foram ultrapassados:\n\n${body}\n\nRevise seus gastos no Lumen.\n\n— Lumen`
          )
        } catch (e) {
          console.error(`[send-budget-alert] Email error for ${user.id}:`, e)
        }
      }

      results.push({ user_id: user.id, alerts: exceeded.length, exceeded })
    }

    const totalAlerts = results.reduce((sum, r) => sum + r.alerts, 0)

    return new Response(
      JSON.stringify({ alerts: totalAlerts, usersChecked: users.length, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
