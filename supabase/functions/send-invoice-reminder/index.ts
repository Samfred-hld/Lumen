// ══════════════════════════════════════════
// Lumen — Lembrete de Fatura por Email
// ══════════════════════════════════════════
// Cron: diario via pg_cron
// Verifica cartoes com vencimento proximo e envia email.

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
    const currentDay = today.getDate()
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    const results = [] as Array<{ user_id: string; sent: number }>

    // List all users
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) {
      return new Response(
        JSON.stringify({ error: 'Failed to list users: ' + listError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    for (const user of users) {
      // Fetch cards from cards table
      const { data: cards } = await supabase
        .from('cards')
        .select('*')
        .eq('user_id', user.id)

      if (!cards || cards.length === 0 || !user.email) continue

      let sent = 0

      for (const card of cards) {
        const dueDay = parseInt(String(card.due_day || card.dueDay || 10))
        // Handle month wraparound: if dueDay < currentDay, due date is next month
        let daysUntilDue = dueDay - currentDay
        if (daysUntilDue < 0) {
          daysUntilDue = (daysInMonth - currentDay) + dueDay
        }

        // Send reminder 3 days and 1 day before due date
        if (daysUntilDue === 3 || daysUntilDue === 1) {
          try {
            await sendEmail(
              user.email,
              `Fatura ${card.name} vence em ${daysUntilDue} dia(s)`,
              `Sua fatura do cartao ${card.name} vence no dia ${dueDay}.\n\nLembre-se de verificar o saldo e realizar o pagamento.\n\n— Lumen`
            )
            sent++
          } catch (e) {
            console.error(`[send-invoice-reminder] Email error for ${user.id}:${card.name}:`, e)
          }
        }
      }

      if (sent > 0) {
        results.push({ user_id: user.id, sent })
      }
    }

    const totalSent = results.reduce((sum, r) => sum + r.sent, 0)

    return new Response(
      JSON.stringify({ sent: totalSent, usersChecked: users.length, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
