// ══════════════════════════════════════════
// LÚMEN — Store (Base44 entities + localStorage fallback)
// ══════════════════════════════════════════
// Cards, Rules, Templates, Settings → Base44 entities (primary)
// Falls back to localStorage if Base44 unavailable
// Transactions, Goals, Budgets → already on Base44 via useQuery

import { matchCorrelation } from './autoCorrelations';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/use-toast';

const LS_PREFIX = 'rattio_'; // Mantido como 'rattio_' para compatibilidade com dados existentes — não alterar

// ── Internal helpers ──
const _entityValid = new Map(); // name → true|false (connectivity cache)

function hasEntity(name) {
  // Duck-type check + cached connectivity result
  if (!base44?.entities?.[name]) return false;
  if (_entityValid.has(name)) return _entityValid.get(name);
  // Assume valid until proven otherwise (async ops will update cache)
  return true;
}

/**
 * Testa conectividade real com a entidade (async).
 * Cacheia resultado para que hasEntity() possa consultar depois.
 */
async function ensureEntity(name) {
  if (!base44?.entities?.[name]) { _entityValid.set(name, false); return false; }
  try {
    await base44.entities[name].list('', 1);
    _entityValid.set(name, true);
    return true;
  } catch (err) {
    console.error('[Store] Erro em ensureEntity:', err);
    return false;
  }
}

function getLocal(key, fallback = null) {
  try {
    const r = localStorage.getItem(LS_PREFIX + key);
    return r ? JSON.parse(r) : fallback;
  } catch (err) {
    console.error('[Store] Erro em getLocal:', err);
    return fallback;
  }
}

function setLocal(key, val) {
  try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(val)); } catch (err) { console.error('[Store] Erro em setLocal:', err); }
}

function removeLocal(key) {
  try { localStorage.removeItem(LS_PREFIX + key); } catch (err) { console.error('[Store] Erro em removeLocal:', err); }
}

// ── Primitivos (localStorage direto) ──
export function lsGet(key, fallback = null) {
  return getLocal(key, fallback);
}

export function lsSet(key, val) {
  setLocal(key, val);
}

export function lsRemove(key) {
  removeLocal(key);
}

// ══════════════════════════════════════════
// CARDS — Base44 entity with localStorage cache
// ══════════════════════════════════════════

export function getCards() {
  return getLocal('cards', []);
}

// ── Fetch Cards ──
// Padrão cloud → localStorage:
// 1. Tenta buscar do Base44 (cloud).
// 2. Se a requisição SUCESSO (mesmo com []): cloud é fonte de verdade → atualiza localStorage.
// 3. Se a requisição FALHAR (erro de rede/API): usa localStorage como fallback.
// 4. Se cloud está vazia mas localStorage tem dados: migra local → cloud (first-time sync).
// 5. Salva syncedAt para rastrear a última sync bem-sucedida.
export async function fetchCards() {
  if (!(await ensureEntity('Card'))) return getCards();
  try {
    const cards = await base44.entities.Card.list('', 1000);
    // Cloud respondeu com sucesso — é a fonte de verdade, mesmo que vazio
    setLocal('cards', cards || []);
    setLocal('cards_syncedAt', Date.now());
    // Migrar dados locais se cloud está vazia (first-time sync)
    if (!cards?.length) {
      const local = getCards();
      if (local.length) {
        // Deduplicar por nome antes de migrar
        const seen = new Set();
        const unique = local.filter(c => {
          const key = (c.name || '').trim().toLowerCase();
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        for (const c of unique) {
          await base44.entities.Card.create({
            name: c.name || '', color: c.color || '#3b82f6',
            limit: parseFloat(c.limit) || 0, closingDay: parseInt(c.closingDay) || 1,
            dueDay: parseInt(c.dueDay) || 10, brand: c.brand || 'other',
          });
        }
        const fresh = await base44.entities.Card.list('', 1000);
        setLocal('cards', fresh || []);
        setLocal('cards_syncedAt', Date.now());
        return fresh || [];
      }
    }
    return cards || [];
  } catch (err) {
    // Erro de rede/API — fallback para localStorage
    console.error('[Store] Erro em fetchCards:', err);
    return getCards();
  }
}

export function saveCards(cards) { setLocal('cards', cards); }

export async function addCard(card) {
  const newCard = {
    name: card.name || '', color: card.color || '#3b82f6',
    limit: parseFloat(card.limit) || 0, closingDay: parseInt(card.closingDay) || 1,
    dueDay: parseInt(card.dueDay) || 10, brand: card.brand || 'other',
  };

  if (hasEntity('Card')) {
    try {
      const created = await base44.entities.Card.create(newCard);
      const cards = await base44.entities.Card.list('', 1000);
      setLocal('cards', cards || []);
      return created;
    } catch (err) {
      console.error('[Store] Erro em addCard (Base44):', err);
      toast({ title: 'Erro ao salvar cartão', description: 'Tente novamente ou verifique sua conexão.', variant: 'destructive' });
    }
  }

  // Fallback: localStorage
  const cards = getCards();
  const localCard = { id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5), ...newCard, createdAt: new Date().toISOString() };
  cards.push(localCard);
  setLocal('cards', cards);
  return localCard;
}

export async function updateCard(id, data) {
  if (hasEntity('Card')) {
    try {
      await base44.entities.Card.update(id, data);
      const cards = await base44.entities.Card.list('', 1000);
      setLocal('cards', cards || []);
      return;
    } catch (err) {
      console.error('[Store] Erro em updateCard:', err);
      toast({ title: 'Erro ao atualizar cartão', description: 'Tente novamente.', variant: 'destructive' });
    }
  }
  const cards = getCards();
  const i = cards.findIndex(c => c.id === id);
  if (i !== -1) { cards[i] = { ...cards[i], ...data }; setLocal('cards', cards); }
}

export async function deleteCard(id) {
  if (hasEntity('Card')) {
    try {
      await base44.entities.Card.delete(id);
      const cards = await base44.entities.Card.list('', 1000);
      setLocal('cards', cards || []);
      return;
    } catch (err) {
      console.error('[Store] Erro em deleteCard:', err);
      toast({ title: 'Erro ao excluir cartão', description: 'Tente novamente.', variant: 'destructive' });
    }
  }
  setLocal('cards', getCards().filter(c => c.id !== id));
}

// ══════════════════════════════════════════
// RULES — Base44 entity with localStorage cache
// ══════════════════════════════════════════

export function getRules() { return getLocal('rules', []); }

// ── Fetch Rules ──
// Padrão cloud → localStorage:
// 1. Tenta buscar do Base44 (cloud).
// 2. Se a requisição SUCESSO (mesmo com []): cloud é fonte de verdade → atualiza localStorage.
// 3. Se a requisição FALHAR (erro de rede/API): usa localStorage como fallback.
// 4. Se cloud está vazia mas localStorage tem dados: migra local → cloud (first-time sync).
// 5. Salva syncedAt para rastrear a última sync bem-sucedida.
export async function fetchRules() {
  if (!(await ensureEntity('Rule'))) return getRules();
  try {
    const rules = await base44.entities.Rule.list('', 1000);
    // Cloud respondeu com sucesso — é a fonte de verdade, mesmo que vazio
    setLocal('rules', rules || []);
    setLocal('rules_syncedAt', Date.now());
    // Migrar dados locais se cloud está vazia (first-time sync)
    if (!rules?.length) {
      const local = getRules();
      if (local.length) {
        // Deduplicar por keyword antes de migrar
        const seen = new Set();
        const unique = local.filter(r => {
          const key = (r.keyword || '').trim().toLowerCase();
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        for (const r of unique) {
          await base44.entities.Rule.create({ keyword: r.keyword || '', category: r.category || '' });
        }
        const fresh = await base44.entities.Rule.list('', 1000);
        setLocal('rules', fresh || []);
        setLocal('rules_syncedAt', Date.now());
        return fresh || [];
      }
    }
    return rules || [];
  } catch (err) {
    // Erro de rede/API — fallback para localStorage
    console.error('[Store] Erro em fetchRules:', err);
    return getRules();
  }
}

export function saveRules(rules) { setLocal('rules', rules); }

export async function addRule(rule) {
  const newRule = { keyword: rule.keyword || '', category: rule.category || '' };

  if (hasEntity('Rule')) {
    try {
      await base44.entities.Rule.create(newRule);
      const rules = await base44.entities.Rule.list('', 1000);
      setLocal('rules', rules || []);
      return rules || [];
    } catch (err) {
      console.error('[Store] Erro em addRule:', err);
      toast({ title: 'Erro ao salvar regra', variant: 'destructive' });
    }
  }

  const rules = getRules();
  rules.push({ id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5), ...newRule, createdAt: new Date().toISOString() });
  setLocal('rules', rules);
  return rules;
}

export async function deleteRule(id) {
  if (hasEntity('Rule')) {
    try {
      await base44.entities.Rule.delete(id);
      const rules = await base44.entities.Rule.list('', 1000);
      setLocal('rules', rules || []);
      return rules || [];
    } catch (err) {
      console.error('[Store] Erro em deleteRule:', err);
      toast({ title: 'Erro ao excluir regra', variant: 'destructive' });
    }
  }
  const rules = getRules().filter(r => r.id !== id);
  setLocal('rules', rules);
  return rules;
}

// ══════════════════════════════════════════
// TEMPLATES — Base44 entity with localStorage cache
// ══════════════════════════════════════════

export function getTemplates() { return getLocal('templates', []); }

// ── Fetch Templates ──
// Padrão cloud → localStorage:
// 1. Tenta buscar do Base44 (cloud).
// 2. Se a requisição SUCESSO (mesmo com []): cloud é fonte de verdade → atualiza localStorage.
// 3. Se a requisição FALHAR (erro de rede/API): usa localStorage como fallback.
// 4. Se cloud está vazia mas localStorage tem dados: migra local → cloud (first-time sync).
// 5. Salva syncedAt para rastrear a última sync bem-sucedida.
export async function fetchTemplates() {
  if (!(await ensureEntity('Template'))) return getTemplates();
  try {
    const tpls = await base44.entities.Template.list('', 1000);
    // Cloud respondeu com sucesso — é a fonte de verdade, mesmo que vazio
    setLocal('templates', tpls || []);
    setLocal('templates_syncedAt', Date.now());
    // Migrar dados locais se cloud está vazia (first-time sync)
    if (!tpls?.length) {
      const local = getTemplates();
      if (local.length) {
        // Deduplicar por descrição antes de migrar
        const seen = new Set();
        const unique = local.filter(t => {
          const key = (t.description || '').trim().toLowerCase();
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        for (const t of unique) {
          await base44.entities.Template.create({
            description: t.description || '', value: parseFloat(t.value) || 0,
            category: t.category || '', paymentMethod: t.paymentMethod || '', type: t.type || 'expense',
          });
        }
        const fresh = await base44.entities.Template.list('', 1000);
        setLocal('templates', fresh || []);
        setLocal('templates_syncedAt', Date.now());
        return fresh || [];
      }
    }
    return tpls || [];
  } catch (err) {
    // Erro de rede/API — fallback para localStorage
    console.error('[Store] Erro em fetchTemplates:', err);
    return getTemplates();
  }
}

export function saveTemplates(tpls) { setLocal('templates', tpls); }

export async function addTemplate(tpl) {
  const newTpl = {
    description: tpl.description || '', value: parseFloat(tpl.value) || 0,
    category: tpl.category || '', paymentMethod: tpl.paymentMethod || '', type: tpl.type || 'expense',
  };

  if (hasEntity('Template')) {
    try {
      await base44.entities.Template.create(newTpl);
      const tpls = await base44.entities.Template.list('', 1000);
      setLocal('templates', tpls || []);
      return tpls || [];
    } catch (err) {
      console.error('[Store] Erro em addTemplate:', err);
      toast({ title: 'Erro ao salvar template', variant: 'destructive' });
    }
  }

  const tpls = getTemplates();
  tpls.push({ id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5), ...newTpl, createdAt: new Date().toISOString() });
  setLocal('templates', tpls);
  return tpls;
}

export async function deleteTemplate(id) {
  if (hasEntity('Template')) {
    try {
      await base44.entities.Template.delete(id);
      const tpls = await base44.entities.Template.list('', 1000);
      setLocal('templates', tpls || []);
      return tpls || [];
    } catch (err) {
      console.error('[Store] Erro em deleteTemplate:', err);
      toast({ title: 'Erro ao excluir template', variant: 'destructive' });
    }
  }
  const tpls = getTemplates().filter(t => t.id !== id);
  setLocal('templates', tpls);
  return tpls;
}

// ── Sync localStorage templates → FixedTemplate entity (cloud) ──
export async function syncTemplatesToCloud(b44) {
  const client = b44 || base44;
  if (!client?.entities?.FixedTemplate) return { synced: 0, error: 'FixedTemplate entity unavailable' };

  const local = getTemplates();
  if (!local.length) return { synced: 0 };

  let synced = 0;
  for (const tpl of local) {
    try {
      const existing = await client.entities.FixedTemplate.filter({ description: tpl.description || '' });
      const payload = {
        description: tpl.description || '',
        value: parseFloat(tpl.value) || 0,
        type: tpl.type || 'expense',
        category: tpl.category || '',
        paymentMethod: tpl.paymentMethod || '',
        dayOfMonth: parseInt(tpl.dayOfMonth) || 1,
      };
      if (existing?.length) {
        await client.entities.FixedTemplate.update(existing[0].id, payload);
      } else {
        await client.entities.FixedTemplate.create(payload);
      }
      synced++;
    } catch (e) {
      console.warn('[syncTemplatesToCloud] Erro ao sincronizar template:', tpl.description, e);
    }
  }
  return { synced };
}

// ══════════════════════════════════════════
// SETTINGS — Base44 entity (key-value) with localStorage cache
// ══════════════════════════════════════════

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
export function getSalaryConfig() { return getLocal('salaryConfig', { value: 0, day: 5, autoGenerate: false }); }
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
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
export async function fetchTheme() {
  const cloud = await getSettingFromCloud('theme');
  if (cloud) { setLocal('theme', cloud); return cloud; }
  return getTheme();
}
export async function setTheme(t) {
  setLocal('theme', t);
  document.documentElement.setAttribute('data-theme', t);
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
export function getDashSections() { return getLocal('dashSections', DEFAULT_DASH_SECTIONS); }
export async function saveDashSections(sections) {
  setLocal('dashSections', sections);
  await setSettingToCloud('dashSections', sections);
}
export async function fetchDashSections() {
  const cloud = await getSettingFromCloud('dashSections');
  if (cloud) { setLocal('dashSections', cloud); return cloud; }
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

// ── Auto-categorization (user rules first, then built-in correlations) ──
export function suggestCategoryFromRules(description) {
  const rules = getRules();
  const desc = (description || '').toLowerCase();
  for (const rule of rules) {
    if (desc.includes(rule.keyword.toLowerCase())) return rule.category;
  }
  const correlated = matchCorrelation(description);
  if (correlated) return correlated;
  return null;
}

// ══════════════════════════════════════════
// INIT — Fetch all from cloud on app start
// ══════════════════════════════════════════

// Flag de sessão — dedup roda 1x por carregamento da aba
let _dedupRanThisSession = false;

/**
 * Deduplicação automática de Card, Rule e Template.
 * Roda 1x por sessão após initStore. Silencioso — só loga se encontrar algo.
 */
async function _autoDeduplicate() {
  if (_dedupRanThisSession) return;
  _dedupRanThisSession = true;

  const tasks = [
    { entity: 'Card', key: 'name' },
    { entity: 'Rule', key: 'keyword' },
    { entity: 'Template', key: 'description' },
  ];

  for (const { entity, key } of tasks) {
    try {
      if (!base44?.entities?.[entity]) continue;
      const items = await base44.entities[entity].list('', 10000);
      if (!items?.length) continue;

      // Agrupar por campo-chave (case-insensitive)
      const groups = new Map();
      for (const item of items) {
        const k = (item[key] || '').trim().toLowerCase();
        if (!k) continue;
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(item);
      }

      // Deletar duplicatas (mantém o mais recente)
      let removed = 0;
      for (const [, group] of groups) {
        if (group.length <= 1) continue;
        group.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
        for (const dup of group.slice(1)) {
          try { await base44.entities[entity].delete(dup.id); removed++; } catch {}
        }
      }

      if (removed > 0) {
        console.log(`[AutoDedup] ${entity}: ${removed} duplicatas removidas`);
        // Atualizar localStorage com estado limpo
        const fresh = await base44.entities[entity].list('', 1000);
        setLocal(entity === 'Card' ? 'cards' : entity === 'Rule' ? 'rules' : 'templates', fresh || []);
      }
    } catch {}
  }
}

export async function initStore() {
  // Não inicializa durante limpeza de dados (evita re-fetch de dados recém-deletados)
  try {
    if (localStorage.getItem('lumen_clearing') === '1') {
      console.info('[initStore] Limpeza em andamento — skipping');
      return;
    }
  } catch {}
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

// ══════════════════════════════════════════
// CLEAR ALL DATA
// ══════════════════════════════════════════

const ALL_LS_KEYS = [
  'cards', 'cards_syncedAt', 'extraCats', 'rules', 'rules_syncedAt',
  'salaryConfig', 'changelog', 'templates', 'templates_syncedAt',
  'paymentMethods', 'dashSections', 'quickDraft', 'theme', 'onboarded',
  'lastRecurringGen', 'suggestionsLog', 'financings', 'lastCategory',
];

const ENTITIES_TO_CLEAR = [
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
 * Deleta todos os itens de uma entidade em lotes para evitar rate limit.
 * Usa paginação para garantir que todos os itens sejam encontrados.
 * Retorna { deleted, errors }.
 */
async function deleteEntityBatch(entity, name) {
  const PAGE_SIZE = 500;
  let allItems = [];
  let offset = 0;

  // Paginar para buscar TODOS os itens (list com limit pode ter ceiling interno)
  while (true) {
    let page;
    try {
      page = await entity.list('', PAGE_SIZE, offset);
    } catch (e) {
      return { deleted: allItems.length, errors: [`list falhou: ${e.message}`] };
    }
    if (!page?.length) break;
    allItems.push(...page);
    if (page.length < PAGE_SIZE) break; // última página
    offset += PAGE_SIZE;
  }

  if (!allItems.length) return { deleted: 0, errors: [] };

  const errors = [];
  let deleted = 0;

  // Deletar sequencialmente para não estourar o rate limit
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
    const keysToRemove = allKeys.filter(k => k?.startsWith(LS_PREFIX));
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
