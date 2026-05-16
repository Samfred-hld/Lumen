// ══════════════════════════════════════════
// LÚMEN — Settings (Base44 entity key-value with localStorage cache)
// ══════════════════════════════════════════

import { base44 } from '@/api/base44Client';
import { getLocal, setLocal, removeLocal, ensureEntity } from './helpers';

async function getSettingFromCloud(key) {
  if (!(await ensureEntity('Setting'))) return null;
  try {
    const results = await base44.entities.Setting.filter({ key });
    if (results?.length) return JSON.parse(results[0].value);
  } catch (err) {
    console.error('[Store] Erro em getSettingFromCloud:', err);
  }
  return null;
}

async function setSettingToCloud(key, value) {
  if (!(await ensureEntity('Setting'))) return;
  try {
    const jsonVal = JSON.stringify(value);
    const existing = await base44.entities.Setting.filter({ key });
    if (existing?.length) {
      await base44.entities.Setting.update(existing[0].id, { value: jsonVal });
    } else {
      await base44.entities.Setting.create({ key, value: jsonVal });
    }
  } catch (err) {
    console.error('[Store] Erro em setSettingToCloud:', err);
  }
}

// ── Salary Config ──
export function getSalaryConfig() { return getLocal('salaryConfig', { incomeType: 'clt', value: 0, day: 5, autoGenerate: false }); }
export async function fetchSalaryConfig() {
  const cloud = await getSettingFromCloud('salaryConfig');
  if (cloud) { setLocal('salaryConfig', cloud); return cloud; }
  return getSalaryConfig();
}
export async function saveSalaryConfig(c) {
  setLocal('salaryConfig', c);
  await setSettingToCloud('salaryConfig', c);
}

// ── Theme ──
export function getTheme() {
  const saved = getLocal('theme', null);
  if (saved) return saved;
  return 'light'; // Default to light theme
}
export async function fetchTheme() {
  const cloud = await getSettingFromCloud('theme');
  if (cloud) { setLocal('theme', cloud); return cloud; }
  return getTheme();
}
export async function setTheme(t) {
  setLocal('theme', t);
  document.documentElement.setAttribute('data-theme', t);
  document.documentElement.classList.toggle('dark', t === 'dark');
  await setSettingToCloud('theme', t);
}

// ── Changelog ──
export function getChangelog() { return getLocal('changelog', []); }
export function addChangelogEntry(entry) {
  const log = getChangelog();
  log.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    timestamp: new Date().toISOString(),
    ...entry,
  });
  if (log.length > 500) log.length = 500;
  setLocal('changelog', log);
}

// ── Payment Methods ──
const DEFAULT_PAYMENT_METHODS = ['Débito', 'Dinheiro', 'Pix', 'Transferência', 'Crédito'];
export function getPaymentMethods() {
  const custom = getLocal('paymentMethods', []);
  return [...DEFAULT_PAYMENT_METHODS, ...custom];
}
export function getCustomPaymentMethods() { return getLocal('paymentMethods', []); }
export async function saveCustomPaymentMethods(pms) {
  setLocal('paymentMethods', pms);
  await setSettingToCloud('paymentMethods', pms);
}
export async function fetchPaymentMethods() {
  const cloud = await getSettingFromCloud('paymentMethods');
  if (cloud) { setLocal('paymentMethods', cloud); return cloud; }
  return getCustomPaymentMethods();
}

// ── Extra Categories ──
export function getExtraCats() { return getLocal('extraCats', []); }
export async function saveExtraCats(cats) {
  setLocal('extraCats', cats);
  await setSettingToCloud('extraCats', cats);
}
export async function fetchExtraCats() {
  const cloud = await getSettingFromCloud('extraCats');
  if (cloud) { setLocal('extraCats', cloud); return cloud; }
  return getExtraCats();
}

// ── Dashboard Sections Config ──
const DEFAULT_DASH_SECTIONS = [
  { id: 'resumo', label: 'Resumo', visible: true },
  { id: 'graficos', label: 'Gráficos', visible: true },
  { id: 'gastos', label: 'Gastos por Categoria', visible: true },
  { id: 'metas', label: 'Metas', visible: true },
  { id: 'parcelas', label: 'Parcelas Ativas', visible: true },
  { id: 'planejado', label: 'Planejado vs Real', visible: true },
  { id: 'previsao', label: 'Previsão', visible: true },
  { id: 'vencimentos', label: 'Próximos Vencimentos', visible: true },
];
export function getDashSections() {
  const raw = getLocal('dashSections', DEFAULT_DASH_SECTIONS);
  return Array.isArray(raw) ? raw : DEFAULT_DASH_SECTIONS;
}
export async function saveDashSections(sections) {
  setLocal('dashSections', sections);
  await setSettingToCloud('dashSections', sections);
}
export async function fetchDashSections() {
  const cloud = await getSettingFromCloud('dashSections');
  if (cloud && Array.isArray(cloud)) { setLocal('dashSections', cloud); return cloud; }
  return getDashSections();
}

// ── Quick Entry Draft (local only — no need for cloud) ──
export function getQuickDraft() { return getLocal('quickDraft', null); }
export function saveQuickDraft(draft) { setLocal('quickDraft', draft); }
export function clearQuickDraft() { removeLocal('quickDraft'); }

// ── Suggestions Log (monthly) ──
export function getSuggestionsLog() { return getLocal('suggestionsLog', {}); }
export async function setSuggestionApplied(monthKey, type) {
  const log = getSuggestionsLog();
  if (!log[monthKey]) log[monthKey] = {};
  log[monthKey][type] = true;
  setLocal('suggestionsLog', log);
  await setSettingToCloud('suggestionsLog', log);
}
export async function fetchSuggestionsLog() {
  const cloud = await getSettingFromCloud('suggestionsLog');
  if (cloud) { setLocal('suggestionsLog', cloud); return cloud; }
  return getSuggestionsLog();
}

// ── Financings ──
export function getFinancings() { return getLocal('financings', []); }
export async function saveFinancings(fin) {
  setLocal('financings', fin);
  await setSettingToCloud('financings', fin);
}
export async function fetchFinancings() {
  const cloud = await getSettingFromCloud('financings');
  if (cloud) { setLocal('financings', cloud); return cloud; }
  return getFinancings();
}

// ── Onboarding ──
export function isOnboarded() { return getLocal('onboarded', null) === 'true'; }
export async function setOnboarded() {
  setLocal('onboarded', 'true');
  await setSettingToCloud('onboarded', 'true');
}
export async function fetchOnboarded() {
  const cloud = await getSettingFromCloud('onboarded');
  if (cloud) { setLocal('onboarded', cloud); return cloud; }
  return isOnboarded();
}

// ── Recurring Generation ──
export function getLastRecurringGen() { return getLocal('lastRecurringGen', ''); }
export async function setLastRecurringGen(monthKey) {
  setLocal('lastRecurringGen', monthKey);
  await setSettingToCloud('lastRecurringGen', monthKey);
}
export async function fetchLastRecurringGen() {
  const cloud = await getSettingFromCloud('lastRecurringGen');
  if (cloud) { setLocal('lastRecurringGen', cloud); return cloud; }
  return getLastRecurringGen();
}
