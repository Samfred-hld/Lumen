// ══════════════════════════════════════════
// RATTIO — Gerar Salário Mensal
// ══════════════════════════════════════════
// Cron: todo dia 5 (ou dia configurado pelo usuário)
// Cria Transaction de income com valor do salário.

export default async function handler({ entities }) {
  // Buscar configuração de salário
  const configs = await entities.UserConfig.filter({ key: 'salaryConfig' });
  if (!configs || configs.length === 0) {
    return { generated: false, message: 'Salário não configurado' };
  }

  let salaryConfig;
  try {
    salaryConfig = JSON.parse(configs[0].value);
  } catch {
    return { generated: false, message: 'Config de salário inválida' };
  }

  if (!salaryConfig.autoGenerate || !salaryConfig.value || salaryConfig.value <= 0) {
    return { generated: false, message: 'Geração automática desativada' };
  }

  const today = new Date();
  const day = String(salaryConfig.day || 5).padStart(2, '0');
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const date = `${year}-${month}-${day}`;

  // Verificar se já existe salário gerado pelo cron neste mês
  const existing = await entities.Transaction.filter({
    source: 'cron_salary',
    date: { $gte: `${year}-${month}-01`, $lte: `${year}-${month}-31` }
  });

  if (existing && existing.length > 0) {
    return { generated: false, message: 'Salário já gerado este mês' };
  }

  try {
    await entities.Transaction.create({
      description: 'Salário',
      value: salaryConfig.value,
      type: 'income',
      category: 'Salário',
      date,
      isFixed: true,
      paymentMethod: 'Transferência',
      source: 'cron_salary',
    });
    return { generated: true, value: salaryConfig.value, date };
  } catch (e) {
    return { generated: false, error: e.message };
  }
}
