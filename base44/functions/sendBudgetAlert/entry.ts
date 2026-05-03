// ══════════════════════════════════════════
// RATTIO — Alerta de Orçamento Ultrapassado
// ══════════════════════════════════════════
// Cron: semanal (segunda-feira)
// Verifica orçamentos que foram ultrapassados e envia alerta.

export default async function handler({ entities, integrations }) {
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  let alerts = 0;

  // Buscar orçamentos
  const budgets = await entities.Budget.list();
  if (!budgets || budgets.length === 0) {
    return { alerts: 0, message: 'Nenhum orçamento configurado' };
  }

  // Buscar transações do mês
  const transactions = await entities.Transaction.filter({
    date: { $gte: `${currentMonth}-01`, $lte: `${currentMonth}-31` },
    type: 'expense'
  });

  // Calcular gastos por categoria
  const spent = {};
  for (const tx of (transactions || [])) {
    const cat = tx.category || 'Outros';
    spent[cat] = (spent[cat] || 0) + Math.abs(tx.value || 0);
  }

  // Buscar email do usuário
  const emailConfig = await entities.UserConfig.filter({ key: 'userEmail' });
  const userEmail = emailConfig?.[0]?.value;
  if (!userEmail) {
    return { alerts: 0, message: 'Email não configurado' };
  }

  const exceeded = [];

  for (const budget of budgets) {
    const category = budget.category;
    const limit = parseFloat(budget.limit || budget.value || 0);
    const actual = spent[category] || 0;

    if (limit > 0 && actual > limit) {
      const pct = Math.round((actual / limit) * 100);
      exceeded.push({ category, limit, actual, pct });
    }
  }

  if (exceeded.length > 0) {
    const body = exceeded
      .map(e => `• ${e.category}: R$ ${e.actual.toFixed(2)} de R$ ${e.limit.toFixed(2)} (${e.pct}%)`)
      .join('\n');

    try {
      await integrations.Core.SendEmail({
        to: userEmail,
        subject: `⚠️ ${exceeded.length} orçamento(s) ultrapassado(s) este mês`,
        body: `Os seguintes orçamentos foram ultrapassados:\n\n${body}\n\nRevise seus gastos em Rattio.\n\n— Rattio`,
      });
      alerts = exceeded.length;
    } catch (e) {
      console.error('Erro ao enviar alerta de orçamento:', e);
    }
  }

  return { alerts, categoriesChecked: budgets.length, exceeded };
}
