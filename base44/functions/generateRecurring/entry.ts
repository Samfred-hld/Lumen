// ══════════════════════════════════════════
// RATTIO — Gerar Transações Recorrentes
// ══════════════════════════════════════════
// Cron: todo dia 1 às 00:00
// Lê FixedTemplates, cria Transactions do mês corrente.
// Verifica duplicatas via description + isFixed no mês corrente.

export default async function handler({ entities }) {
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const log = { generated: 0, skipped: [], errors: [], month: currentMonth };

  // 1. Buscar todos os templates fixos
  let templates;
  try {
    templates = await entities.FixedTemplate.list();
  } catch (e) {
    console.error('[generateRecurring] Erro ao listar FixedTemplates:', e);
    return { generated: 0, month: currentMonth, error: 'Falha ao listar FixedTemplates: ' + e.message };
  }

  if (!templates || templates.length === 0) {
    console.log('[generateRecurring] Nenhum template fixo encontrado.');
    return { generated: 0, month: currentMonth, message: 'Nenhum template fixo encontrado' };
  }

  console.log(`[generateRecurring] ${templates.length} template(s) fixo(s) encontrado(s).`);

  // 2. Buscar transações já geradas pelo cron neste mês (evitar duplicatas)
  let existing;
  try {
    existing = await entities.Transaction.filter({
      source: 'cron_recurring',
      date: { $gte: `${currentMonth}-01`, $lte: `${currentMonth}-31` }
    });
  } catch (e) {
    console.error('[generateRecurring] Erro ao filtrar transações existentes:', e);
    existing = [];
  }

  const existingDescs = new Set((existing || []).map(t => t.description));
  console.log(`[generateRecurring] ${existingDescs.size} transação(ões) fixa(s) já existente(s) neste mês.`);

  // 3. Gerar transações para cada template
  for (const tpl of templates) {
    // Pular se já existe transação com mesma descrição e isFixed neste mês
    if (existingDescs.has(tpl.description)) {
      const reason = `já existe transação com descrição "${tpl.description}" em ${currentMonth}`;
      console.log(`[generateRecurring] Pulando: ${reason}`);
      log.skipped.push({ description: tpl.description, reason });
      continue;
    }

    const day = String(Math.min(tpl.dayOfMonth || 1, 28)).padStart(2, '0');
    const date = `${currentMonth}-${day}`;

    try {
      await entities.Transaction.create({
        description: tpl.description,
        value: tpl.value,
        type: tpl.type,
        category: tpl.category,
        date,
        isFixed: true,
        paymentMethod: tpl.paymentMethod || 'Débito',
        source: 'cron_recurring',
      });
      log.generated++;
      console.log(`[generateRecurring] ✅ Criada: "${tpl.description}" → ${date} (R$ ${tpl.value})`);
    } catch (e) {
      console.error(`[generateRecurring] ❌ Erro ao gerar "${tpl.description}":`, e);
      log.errors.push({ description: tpl.description, error: e.message });
    }
  }

  // 4. Resumo final
  console.log(
    `[generateRecurring] Resumo: ${log.generated} gerada(s), ${log.skipped.length} pulada(s), ${log.errors.length} erro(s).`
  );

  return {
    generated: log.generated,
    skipped: log.skipped,
    errors: log.errors,
    month: currentMonth,
    message: `${log.generated} gerada(s), ${log.skipped.length} pulada(s), ${log.errors.length} erro(s)`,
  };
}
