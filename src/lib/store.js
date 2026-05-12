// ══════════════════════════════════════════
// LÚMEN — Store (Base44 entities + localStorage fallback)
// ══════════════════════════════════════════
// Cards, Rules, Templates, Settings → Base44 entities (primary)
// Falls back to localStorage if Base44 unavailable
// Transactions, Goals, Budgets → already on Base44 via useQuery
//
// Barrel file — re-exporta tudo dos módulos em ./store/

// ── Helpers ──
export { LS_PREFIX, lsGet, lsSet, lsRemove, getLocal, setLocal, removeLocal, hasEntity, ensureEntity, migrateToUserPrefix } from './store/helpers';

// ── Cards ──
export { getCards, saveCards, fetchCards, addCard, updateCard, deleteCard } from './store/cards';

// ── Rules ──
export { getRules, saveRules, fetchRules, addRule, deleteRule, suggestCategoryFromRules } from './store/rules';

// ── Templates ──
export { getTemplates, saveTemplates, fetchTemplates, addTemplate, deleteTemplate, syncTemplatesToCloud } from './store/templates';

// ── Settings ──
export {
  getSalaryConfig, fetchSalaryConfig, saveSalaryConfig,
  getTheme, fetchTheme, setTheme,
  getChangelog, addChangelogEntry,
  getPaymentMethods, getCustomPaymentMethods, saveCustomPaymentMethods, fetchPaymentMethods,
  getExtraCats, saveExtraCats, fetchExtraCats,
  getDashSections, saveDashSections, fetchDashSections,
  getQuickDraft, saveQuickDraft, clearQuickDraft,
  getSuggestionsLog, setSuggestionApplied, fetchSuggestionsLog,
  getFinancings, saveFinancings, fetchFinancings,
  isOnboarded, setOnboarded, fetchOnboarded,
  getLastRecurringGen, setLastRecurringGen, fetchLastRecurringGen,
} from './store/settings';

// ── Clear All Data ──
export { ENTITIES_TO_CLEAR, ALL_LS_KEYS, deleteEntityBatch, clearAllData, isClearingInProgress } from './store/clearAllData';

// ── Dedup ──
export { _dedupRanThisSession, _autoDeduplicate } from './store/dedup';

// ══════════════════════════════════════════
// INIT — Fetch all from cloud on app start
// ══════════════════════════════════════════

import { fetchCards } from './store/cards';
import { fetchRules } from './store/rules';
import { fetchTemplates } from './store/templates';
import {
  fetchSalaryConfig, fetchTheme, fetchExtraCats, fetchPaymentMethods,
  fetchDashSections, fetchSuggestionsLog, fetchFinancings, fetchOnboarded, fetchLastRecurringGen,
} from './store/settings';
import { _autoDeduplicate } from './store/dedup';
import { migrateToUserPrefix } from './store/helpers';

export async function initStore() {
  // Não inicializa durante limpeza de dados (evita re-fetch de dados recém-deletados)
  try {
    if (localStorage.getItem('lumen_clearing') === '1') {
      console.info('[initStore] Limpeza em andamento — skipping');
      return;
    }
  } catch {}

  // Migra dados do prefixo legado (rattio_) para prefixo por usuario (rattio_{userId}_)
  migrateToUserPrefix();

  try {
    await Promise.allSettled([
      fetchCards(),
      fetchRules(),
      fetchTemplates(),
      fetchSalaryConfig(),
      fetchTheme(),
      fetchExtraCats(),
      fetchPaymentMethods(),
      fetchDashSections(),
      fetchSuggestionsLog(),
      fetchFinancings(),
      fetchOnboarded(),
      fetchLastRecurringGen(),
    ]);

    // Deduplicação automática — roda 1x por sessão se encontrar duplicatas
    _autoDeduplicate().catch(() => {});
  } catch (err) {
    console.error('[Store] Erro em initStore:', err);
  }
}
