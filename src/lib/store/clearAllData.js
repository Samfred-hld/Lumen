// ══════════════════════════════════════════
// LÚMEN — Clear All Data
// ══════════════════════════════════════════

import { base44 } from '@/api/base44Client';
import { LS_PREFIX, getPrefix } from './helpers';

export const ALL_LS_KEYS = [
  'cards', 'cards_syncedAt', 'extraCats', 'rules', 'rules_syncedAt',
  'salaryConfig', 'changelog', 'templates', 'templates_syncedAt',
  'paymentMethods', 'dashSections', 'quickDraft', 'theme', 'onboarded',
  'lastRecurringGen', 'suggestionsLog', 'financings', 'lastCategory',
];

export const ENTITIES_TO_CLEAR = [
  { name: 'Transaction', label: 'Transações' },
  { name: 'Goal', label: 'Metas' },
  { name: 'Budget', label: 'Orçamentos' },
  { name: 'Card', label: 'Cartões' },
  { name: 'Rule', label: 'Regras' },
  { name: 'Template', label: 'Templates' },
  { name: 'FixedTemplate', label: 'Templates Fixos' },
  { name: 'Setting', label: 'Configurações' },
  { name: 'UserConfig', label: 'Configurações do Usuário' },
];

/**
 * Deleta todos os itens de uma entidade.
 * Tenta deleteMany({}) primeiro (1 request). Fallback para delete sequencial se não suportado.
 * Retorna { deleted, errors }.
 */
export async function deleteEntityBatch(entity, name) {
  // Tentar deleteMany nativo — muito mais rápido
  try {
    const result = await entity.deleteMany({});
    const deleted = result?.deleted ?? result?.count ?? 0;
    return { deleted, errors: [] };
  } catch (e) {
    // deleteMany pode não estar disponível ou falhar — fallback sequencial
    console.warn(`[deleteEntityBatch] ${name}: deleteMany falhou, usando fallback sequencial:`, e.message);
  }

  // Fallback: paginação + delete sequencial
  const PAGE_SIZE = 500;
  let allItems = [];
  let offset = 0;

  while (true) {
    let page;
    try {
      page = await entity.list('', PAGE_SIZE, offset);
    } catch (e) {
      return { deleted: allItems.length, errors: [`list falhou: ${e.message}`] };
    }
    if (!page?.length) break;
    allItems.push(...page);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  if (!allItems.length) return { deleted: 0, errors: [] };

  const errors = [];
  let deleted = 0;

  for (const item of allItems) {
    try {
      await entity.delete(item.id);
      deleted++;
    } catch (e) {
      errors.push(`${name}[${item.id}]: ${e.message || 'erro desconhecido'}`);
    }
  }

  return { deleted, errors };
}

/**
 * Limpa todos os dados: entidades Base44 primeiro, depois localStorage.
 * @param {object} base44Ref - Instância do Base44 (opcional)
 * @param {function} onProgress - Callback (step, total, label) para progresso
 * @returns {object} Resultado detalhado
 */
export async function clearAllData(base44Ref, onProgress) {
  const b44 = base44Ref || base44;
  const totalSteps = ENTITIES_TO_CLEAR.length + 2; // +2: localStorage + query cache
  let currentStep = 0;

  // Flag para bloquear migrações durante limpeza
  try { localStorage.setItem('lumen_clearing', '1'); } catch {}

  const result = {
    entities: {},
    localStorage: { cleared: 0, keys: [] },
    errors: [],
    success: true,
  };

  const report = (label) => {
    currentStep++;
    if (onProgress) onProgress(currentStep, totalSteps, label);
  };

  // ═══ FASE 1: Deletar entidades Base44 ═══
  if (b44?.entities) {
    for (const { name, label } of ENTITIES_TO_CLEAR) {
      report(`Deletando ${label}...`);
      try {
        if (!b44.entities[name]) {
          result.entities[name] = { deleted: 0, skipped: true };
          continue;
        }
        const { deleted, errors } = await deleteEntityBatch(b44.entities[name], name);
        result.entities[name] = { deleted, errors };
        if (errors.length) {
          result.errors.push(...errors);
          // Não marca success=false por erros parciais — continua limpando
        }
      } catch (e) {
        result.entities[name] = { deleted: 0, errors: [e.message] };
        result.errors.push(`${name}: ${e.message}`);
      }
    }
  }

  // ═══ FASE 2: Limpar localStorage SEMPRE (independente de erros na nuvem) ═══
  // Se a nuvem falhou parcialmente, o cache local pode ficar inconsistente
  // com dados que já foram deletados da nuvem — melhor limpar tudo.
  report('Limpando cache local...');
  try {
    // Coletar TODAS as chaves primeiro (evita bug de índice com removeItem no loop)
    const allKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      allKeys.push(localStorage.key(i));
    }
    // Clear both legacy prefix and current user-specific prefix
    const userPrefix = getPrefix();
    const keysToRemove = allKeys.filter(k => k && (k.startsWith(LS_PREFIX) || k.startsWith(userPrefix) || k === 'rattio_lastUserId'));
    // Chaves fora do prefixo que também pertencem ao app
    const EXTRA_KEYS = [
      'lumen_clearing', // flag de limpeza em andamento
    ];
    for (const k of [...keysToRemove, ...EXTRA_KEYS]) {
      try {
        localStorage.removeItem(k);
        result.localStorage.cleared++;
      } catch (err) {
        console.error('[Store] Erro ao remover chave localStorage:', k, err);
      }
    }
    result.localStorage.keys = keysToRemove;
  } catch (e) {
    result.localStorage.error = e.message;
  }

  // Marca success baseado em erros críticos (não em erros parciais de deleção)
  result.success = result.errors.filter(e => !e.includes('list falhou')).length === 0;

  // ═══ FASE 3: Limpar React Query cache ═══
  // Sem isso, dados antigos persistem no cache e são re-renderizados
  report('Limpando cache de consultas...');
  try {
    const { queryClientInstance } = await import('@/lib/query-client');
    queryClientInstance.clear(); // remove todas as queries do cache
  } catch (e) {
    console.warn('[Store] Não foi possível limpar React Query cache:', e.message);
  }

  // Remove flag de limpeza
  try { localStorage.removeItem('lumen_clearing'); } catch {}

  return result;
}

/**
 * Verifica se uma limpeza de dados está em andamento.
 * Usado por migrateCardsToCloud para evitar re-upload durante clearAllData.
 */
export function isClearingInProgress() {
  try { return localStorage.getItem('lumen_clearing') === '1'; } catch { return false; }
}
