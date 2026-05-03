// ══════════════════════════════════════════
// RATTIO — Gerar Orçamentos Recorrentes
// ══════════════════════════════════════════
// Cron: todo dia 1 às 00:00
// Replica budgets com isRecurring: true para o mês corrente.

export default async function handler({ entities }) {
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const log = { generated: 0, skipped: [], errors: [], month: currentMonth };

  // 1. Buscar todos os budgets recorrentes
  let recurring;
  try {
    recurring = await entities.Budget.filter({ isRecurring: true });
  } catch (e) {
    console.error('[generateRecurringBudgets] Erro ao listar budgets:', e);
    return { generated: 0, month: currentMonth, error: 'Falha ao listar budgets: ' + e.message };
  }

  if (!recurring || recurring.length === 0) {
    console.log('[generateRecurringBudgets] Nenhum budget recorrente encontrado.');
    return { generated: 0, month: currentMonth, message: 'Nenhum budget recorrente' };
  }

  console.log(`[generateRecurringBudgets] ${recurring.length} budget(s) recorrente(s) encontrado(s).`);

  // 2. Buscar budgets já existentes no mês corrente
  let existing;
  try {
    existing = await entities.Budget.filter({ month: currentMonth });
  } catch (e) {
    console.error('[generateRecurringBudgets] Erro ao filtrar budgets existentes:', e);
    existing = [];
  }

  const existingCategories = new Set((existing || []).map(b => b.category));
  console.log(`[generateRecurringBudgets] ${existingCategories.size} categoria(s) já com budget em ${currentMonth}.`);

  // 3. Criar budgets para categorias que ainda não existem no mês corrente
  for (const budget of recurring) {
    if (existingCategories.has(budget.category)) {
      const reason = `já existe budget para "${budget.category}" em ${currentMonth}`;
      console.log(`[generateRecurringBudgets] Pulando: ${reason}`);
      log.skipped.push({ category: budget.category, reason });
      continue;
    }

    try {
      await entities.Budget.create({
        category: budget.category,
        limit: budget.limit,
        month: currentMonth,
        isRecurring: true,
      });
      log.generated++;
      console.log(`[generateRecurringBudgets] ✅ Criado: "${budget.category}" → R$ ${budget.limit} (${currentMonth})`);
    } catch (e) {
      console.error(`[generateRecurringBudgets] ❌ Erro ao criar "${budget.category}":`, e);
      log.errors.push({ category: budget.category, error: e.message });
    }
  }

  // 4. Resumo final
  console.log(
    `[generateRecurringBudgets] Resumo: ${log.generated} gerado(s), ${log.skipped.length} pulado(s), ${log.errors.length} erro(s).`
  );

  return {
    generated: log.generated,
    skipped: log.skipped,
    errors: log.errors,
    month: currentMonth,
    message: `${log.generated} gerado(s), ${log.skipped.length} pulado(s), ${log.errors.length} erro(s)`,
  };
}
