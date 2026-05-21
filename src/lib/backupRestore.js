import { z } from 'zod';
import { supabase } from '@/api/supabaseClient';
import {
  getExtraCats,
  getRules,
  getSalaryConfig,
  getChangelog,
  getPaymentMethods,
  getCustomPaymentMethods,
  getFinancings,
} from '@/lib/store';

// ── Backup Schema (zod) ──
const BackupSchema = z.object({
  version: z.number(),
  exportedAt: z.string(),
  transactions: z.array(z.object({}).passthrough()),
  budgets: z.array(z.object({}).passthrough()),
  goals: z.array(z.object({}).passthrough()),
  cards: z.array(z.object({}).passthrough()),
  categories: z.array(z.string()).optional(),
  rules: z.array(z.object({}).passthrough()).optional(),
  salaryConfig: z.object({}).passthrough().optional(),
  changelog: z.array(z.object({}).passthrough()).optional(),
  paymentMethods: z.array(z.string()).optional(),
  financings: z.array(z.object({}).passthrough()).optional(),
});

// ── Export Backup ──
export function exportBackup(transactions, budgets, goals, cards) {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions,
    budgets,
    goals,
    cards,
    categories: getExtraCats(),
    rules: getRules(),
    salaryConfig: getSalaryConfig(),
    changelog: getChangelog(),
    paymentMethods: getCustomPaymentMethods(),
    financings: getFinancings(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lumen_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Validate Backup Schema ──
export function validateBackupSchema(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    const result = BackupSchema.safeParse(parsed);
    if (result.success) {
      return { valid: true, data: result.data };
    }
    return { valid: false, error: result.error.issues.map(i => i.message).join('; ') };
  } catch (err) {
    return { valid: false, error: 'JSON inválido: ' + err.message };
  }
}

// ── Import Backup ──
export function importBackup(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const validation = validateBackupSchema(text);

      if (!validation.valid) {
        resolve({
          success: false,
          error: 'Arquivo de backup inválido. Verifique se o arquivo é um backup do Lúmen no formato JSON.',
        });
        return;
      }

      const data = validation.data;
      resolve({
        success: true,
        data,
        summary: {
          transactions: data.transactions?.length || 0,
          budgets: data.budgets?.length || 0,
          goals: data.goals?.length || 0,
          cards: data.cards?.length || 0,
        },
      });
    };
    reader.onerror = () => {
      resolve({ success: false, error: 'Erro ao ler o arquivo.' });
    };
    reader.readAsText(file);
  });
}

// ── Restore data to Supabase ──
export async function restoreBackupData(data, onProgress) {
  const steps = [
    { label: 'Transações', table: 'transactions', items: data.transactions || [] },
    { label: 'Orçamentos', table: 'budgets', items: data.budgets || [] },
    { label: 'Metas', table: 'goals', items: data.goals || [] },
    { label: 'Cartões', table: 'cards', items: data.cards || [] },
  ];

  const totalItems = steps.reduce((sum, s) => sum + s.items.length, 0);
  let processed = 0;

  for (const step of steps) {
    if (step.items.length === 0) continue;

    // Remove id fields to avoid conflicts on insert
    const cleaned = step.items.map(({ id, user_id, created_at, ...rest }) => rest);

    // Batch insert in chunks of 50
    const chunkSize = 50;
    for (let i = 0; i < cleaned.length; i += chunkSize) {
      const chunk = cleaned.slice(i, i + chunkSize);
      const { error } = await supabase.from(step.table).insert(chunk);
      if (error) {
        throw new Error(`Erro ao restaurar ${step.label}: ${error.message}`);
      }
      processed += chunk.length;
      if (onProgress) {
        onProgress(Math.round((processed / totalItems) * 100), step.label);
      }
    }
  }

  // Restore settings from backup
  const { saveExtraCats, saveRules, saveSalaryConfig, saveCustomPaymentMethods, saveFinancings } = await import('@/lib/store');

  if (data.categories?.length) await saveExtraCats(data.categories);
  if (data.rules?.length) await saveRules(data.rules);
  if (data.salaryConfig) await saveSalaryConfig(data.salaryConfig);
  if (data.paymentMethods?.length) await saveCustomPaymentMethods(data.paymentMethods);
  if (data.financings?.length) await saveFinancings(data.financings);

  return { success: true };
}
