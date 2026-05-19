// ── Helpers ──
export { LS_PREFIX, lsGet, lsSet, lsRemove, getLocal, setLocal, removeLocal, migrateToUserPrefix } from './store/helpers';

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

import { _autoDeduplicate } from './store/dedup';
import { migrateToUserPrefix } from './store/helpers';

export async function initStore() {
  try {
    if (localStorage.getItem('lumen_clearing') === '1') return;
  } catch {}

  migrateToUserPrefix();
  _autoDeduplicate().catch(() => {});
}
