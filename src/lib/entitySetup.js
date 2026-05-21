// ══════════════════════════════════════════
// LÚMEN — Entity Setup Utility
// ══════════════════════════════════════════
// Run in browser console: lumenSetup.run()
// Or import and call from Settings page.

import { supabase } from '@/api/supabaseClient';

import { LS_PREFIX } from './store/helpers'; // Prefix dinâmico por usuário

/** Verifica se uma limpeza de dados está em andamento */
function isClearing() {
  try { return localStorage.getItem('lumen_clearing') === '1'; } catch { return false; }
}

// Entidades que precisam existir no Supabase
const REQUIRED_ENTITIES = [
  { name: 'Transaction', fields: ['description', 'date', 'value', 'type', 'category', 'paymentMethod', 'isFixed', 'cardId', 'goalId', 'notes', 'isInstallment', 'installmentIndex', 'installmentTotal', 'installmentSeriesId', 'installmentCount', 'installmentCurrent', 'installmentTotalValue', 'invoiceMonth', 'source'] },
  { name: 'Budget', fields: ['category', 'limit', 'month', 'isRecurring'] },
  { name: 'Goal', fields: ['name', 'targetValue', 'currentValue', 'progressMode', 'deadline', 'color', 'description', 'investmentType'] },
  { name: 'UserConfig', fields: ['key', 'value'] },
  { name: 'Card', fields: ['name', 'color', 'limit', 'closingDay', 'dueDay', 'brand'] },
  { name: 'Rule', fields: ['keyword', 'category'] },
  { name: 'Template', fields: ['description', 'value', 'category', 'paymentMethod', 'type'] },
  { name: 'Setting', fields: ['key', 'value'] },
];

// Configs do localStorage para migrar para UserConfig
const CONFIG_KEYS = [
  'cards', 'rules', 'extraCats', 'salaryConfig',
  'paymentMethods', 'templates', 'dashSections',
  'theme', 'onboarded', 'lastRecurringGen',
];

const ENTITY_TABLE_MAP = {
  Transaction: 'transactions',
  Budget: 'budgets',
  Goal: 'goals',
  UserConfig: 'user_configs',
  Card: 'cards',
  Rule: 'rules',
  Template: 'templates',
  Setting: 'settings',
};

/**
 * Testa se uma entidade existe consultando a tabela
 */
async function testEntity(entityName) {
  try {
    const table = ENTITY_TABLE_MAP[entityName];
    if (!table) return { exists: false, error: 'Unknown entity' };

    await supabase.from(table).select('*').limit(1);
    return { exists: true };
  } catch (e) {
    return { exists: false, error: e.message };
  }
}

/**
 * Cria um registro de teste para forçar a criação da entidade
 */
async function createEntity(entityName, testRecord) {
  try {
    const table = ENTITY_TABLE_MAP[entityName];
    if (!table) return { created: false, error: 'Unknown entity' };

    const { data: created } = await supabase.from(table).insert(testRecord).select().single();
    if (created?.id) {
      await supabase.from(table).delete().eq('id', created.id);
    }
    return { created: true };
  } catch (e) {
    return { created: false, error: e.message };
  }
}

/**
 * Migra configs do localStorage para UserConfig na nuvem
 */
async function migrateConfigs() {
  const results = { migrated: 0, skipped: 0, failed: 0 };

  for (const key of CONFIG_KEYS) {
    try {
      const localValue = localStorage.getItem(LS_PREFIX + key);
      if (!localValue) { results.skipped++; continue; }

      // Check if already in cloud
      const { data: existing } = await supabase.from('user_configs').select('*').eq('key', key);
      if (existing?.length > 0) {
        // Update if different
        if (existing[0].value !== localValue) {
          await supabase.from('user_configs').update({ value: localValue }).eq('id', existing[0].id);
        }
        results.skipped++;
        continue;
      }

      // Create in cloud
      await supabase.from('user_configs').insert({ key, value: localValue }).select().single();
      results.migrated++;
    } catch (e) {
      console.warn(`Failed to migrate ${key}:`, e);
      results.failed++;
    }
  }

  return results;
}

/**
 * Migra dados do localStorage/UserConfig para entidades próprias (Card, Rule, Template, Setting)
 */
async function migrateToEntities() {
  const results = { cards: 0, rules: 0, templates: 0, settings: 0, errors: [] };

  // Helper: get data from localStorage
  const getLocal = (key) => {
    try { return JSON.parse(localStorage.getItem(LS_PREFIX + key) || 'null'); } catch { return null; }
  };

  // Helper: check if a table exists
  const entityExists = async (entityName) => {
    try {
      const table = ENTITY_TABLE_MAP[entityName];
      if (!table) return false;
      await supabase.from(table).select('*').limit(1);
      return true;
    } catch (e) {
      return !e.message?.includes('not found');
    }
  };

  // ── Cards ──
  try {
    if (!await entityExists('Card')) {
      results.errors.push('Card: schema not created in Supabase — skipping');
    } else {
      const cards = getLocal('cards') || [];
      const { data: existing } = await supabase.from('cards').select('*').limit(1000);
      if (!existing?.length && cards.length) {
        for (const c of cards) {
          await supabase.from('cards').insert({
            name: c.name || '',
            color: c.color || '#3b82f6',
            limit: parseFloat(c.limit) || 0,
            closing_day: parseInt(c.closingDay) || 1,
            due_day: parseInt(c.dueDay) || 10,
            brand: c.brand || 'other',
          });
          results.cards++;
        }
      }
    }
  } catch (e) { results.errors.push('Card: ' + e.message); }

  // ── Rules ──
  try {
    if (!await entityExists('Rule')) {
      results.errors.push('Rule: schema not created in Supabase — skipping');
    } else {
      const rules = getLocal('rules') || [];
      const { data: existing } = await supabase.from('rules').select('*').limit(1000);
      if (!existing?.length && rules.length) {
        for (const r of rules) {
          await supabase.from('rules').insert({
            keyword: r.keyword || '',
            category: r.category || '',
          });
          results.rules++;
        }
      }
    }
  } catch (e) { results.errors.push('Rule: ' + e.message); }

  // ── Templates ──
  try {
    if (!await entityExists('Template')) {
      results.errors.push('Template: schema not created in Supabase — skipping');
    } else {
      const templates = getLocal('templates') || [];
      const { data: existing } = await supabase.from('templates').select('*').limit(1000);
      if (!existing?.length && templates.length) {
        for (const t of templates) {
          await supabase.from('templates').insert({
            description: t.description || '',
            value: parseFloat(t.value) || 0,
            category: t.category || '',
            payment_method: t.paymentMethod || '',
            type: t.type || 'expense',
          });
          results.templates++;
        }
      }
    }
  } catch (e) { results.errors.push('Template: ' + e.message); }

  // ── Settings (salaryConfig, theme, dashSections, etc.) ──
  try {
    if (!await entityExists('Setting')) {
      results.errors.push('Setting: schema not created in Supabase — skipping');
    } else {
      const settingKeys = ['salaryConfig', 'theme', 'dashSections', 'onboarded', 'lastRecurringGen', 'suggestionsLog', 'financings'];
      for (const key of settingKeys) {
        const val = getLocal(key);
        if (val === null) continue;
        const { data: existing } = await supabase.from('settings').select('*').eq('key', key);
        if (!existing?.length) {
          await supabase.from('settings').insert({ key, value: JSON.stringify(val) });
          results.settings++;
        }
      }
    }
  } catch (e) { results.errors.push('Setting: ' + e.message); }

  return results;
}

/**
 * Pull configs from cloud to localStorage
 */
async function pullFromCloud() {
  try {
    const { data: configs } = await supabase.from('user_configs').select('*').limit(500);
    if (!configs?.length) return { pulled: 0 };

    let pulled = 0;
    for (const cfg of configs) {
      if (cfg.key && cfg.value !== undefined) {
        localStorage.setItem(LS_PREFIX + cfg.key, cfg.value);
        pulled++;
      }
    }
    return { pulled };
  } catch (e) {
    return { pulled: 0, error: e.message };
  }
}

/**
 * Main setup function — tests all entities and reports status
 */
async function run() {
  console.log('🔧 Lúmen Entity Setup — Iniciando...\n');

  const status = {};

  for (const entity of REQUIRED_ENTITIES) {
    const result = await testEntity(entity.name);
    status[entity.name] = result;
    console.log(`${result.exists ? '✅' : '❌'} ${entity.name}: ${result.exists ? 'OK' : result.error}`);
  }

  // If UserConfig doesn't exist, try to create it
  if (!status.UserConfig?.exists) {
    console.log('\n⏳ Tentando criar UserConfig...');
    const createResult = await createEntity('UserConfig', {
      key: '_setup_test',
      value: JSON.stringify({ test: true }),
    });

    if (createResult.created) {
      console.log('✅ UserConfig criado com sucesso!');
      status.UserConfig = { exists: true };
    } else {
      console.log('❌ Falha ao criar UserConfig:', createResult.error);
      console.log('👉 Crie a tabela user_configs no Supabase com campos key (text) e value (jsonb)');
    }
  }

  // If UserConfig exists, offer migration
  if (status.UserConfig?.exists) {
    console.log('\n📦 Migrando configs do localStorage para nuvem...');
    const migResult = await migrateConfigs();
    console.log(`   Migrados: ${migResult.migrated} | Pulados: ${migResult.skipped} | Falhas: ${migResult.failed}`);
  }

  console.log('\n✨ Setup concluído!');
  return status;
}

// Export
export const lumenSetup = { run, testEntity, createEntity, migrateConfigs, migrateToEntities, migrateCardsToCloud, pullFromCloud, deduplicateCards, deduplicateRules, deduplicateTemplates, deduplicateAll };

/**
 * Migra cartões do localStorage para a tabela cards no Supabase.
 * Upsert por campo `name` para evitar duplicatas.
 */
async function migrateCardsToCloud() {
  if (isClearing()) {
    console.info('[migrateCardsToCloud] Limpeza em andamento — skipping');
    return { migrated: 0, skipped: true, reason: 'clearing in progress' };
  }

  // Check if Card table exists
  try {
    await supabase.from('cards').select('*').limit(1);
  } catch (e) {
    if (e.message?.includes('not found')) {
      console.info('[migrateCardsToCloud] Card table not found — skipping');
      return { migrated: 0, skipped: true, reason: 'Card table not found' };
    }
  }

  let local;
  try {
    local = JSON.parse(localStorage.getItem(LS_PREFIX + 'cards') || '[]');
  } catch { return { migrated: 0 }; }

  if (!local.length) return { migrated: 0 };

  // Fetch existing cloud cards to avoid duplicates
  let existing = [];
  try {
    const { data } = await supabase.from('cards').select('*').limit(1000);
    existing = data || [];
  } catch {}
  const existingNames = new Set(existing.map(c => (c.name || '').toLowerCase()));

  let migrated = 0;
  for (const c of local) {
    const name = (c.name || '').trim();
    if (!name) continue;
    if (existingNames.has(name.toLowerCase())) continue;

    try {
      await supabase.from('cards').insert({
        name,
        color: c.color || '#3b82f6',
        limit: parseFloat(c.limit) || 0,
        closing_day: parseInt(c.closingDay) || 1,
        due_day: parseInt(c.dueDay) || 10,
        brand: c.brand || 'other',
      });
      existingNames.add(name.toLowerCase());
      migrated++;
    } catch (e) {
      console.warn('[migrateCardsToCloud] Falha ao migrar cartão:', name, e);
    }
  }

  // Sync localStorage with cloud state after migration
  try {
    const { data: fresh } = await supabase.from('cards').select('*').limit(1000);
    if (fresh?.length) localStorage.setItem(LS_PREFIX + 'cards', JSON.stringify(fresh));
  } catch {}

  return { migrated };
}

/**
 * Remove cartões duplicados do Supabase, mantendo o mais recente de cada nome.
 * Pode ser chamado via console: lumenSetup.deduplicateCards()
 */
async function deduplicateCards() {
  let allCards;
  try {
    const { data } = await supabase.from('cards').select('*').limit(10000);
    allCards = data || [];
  } catch (e) {
    return { removed: 0, error: e.message };
  }

  if (!allCards?.length) return { removed: 0, total: 0 };

  // Agrupar por nome (case-insensitive)
  const groups = new Map();
  for (const card of allCards) {
    const key = (card.name || '').trim().toLowerCase();
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(card);
  }

  let removed = 0;
  const errors = [];

  for (const [name, cards] of groups) {
    if (cards.length <= 1) continue;
    // Manter o mais recente (maior id ou último criado)
    cards.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
    const keep = cards[0];
    const toDelete = cards.slice(1);
    console.log(`[deduplicateCards] "${name}": ${cards.length} cópias — mantendo ${keep.id}, deletando ${toDelete.length}`);

    try {
      await supabase.from('cards').delete().in('id', toDelete.map(d => d.id));
      removed += toDelete.length;
    } catch {
      // Fallback: um por um
      for (const card of toDelete) {
        try {
          await supabase.from('cards').delete().eq('id', card.id);
          removed++;
        } catch (e) {
          errors.push(`Card[${card.id}]: ${e.message}`);
        }
      }
    }
  }

  // Atualizar localStorage com estado limpo
  try {
    const { data: fresh } = await supabase.from('cards').select('*').limit(1000);
    localStorage.setItem(LS_PREFIX + 'cards', JSON.stringify(fresh || []));
  } catch {}

  console.log(`[deduplicateCards] Concluído: ${removed} duplicatas removidas de ${allCards.length} total`);
  return { removed, total: allCards.length, errors };
}

/**
 * Remove regras duplicadas do Supabase, mantendo a mais recente de cada keyword.
 */
async function deduplicateRules() {
  let allRules;
  try {
    const { data } = await supabase.from('rules').select('*').limit(10000);
    allRules = data || [];
  } catch (e) {
    return { removed: 0, error: e.message };
  }

  if (!allRules?.length) return { removed: 0, total: 0 };

  const groups = new Map();
  for (const rule of allRules) {
    const key = (rule.keyword || '').trim().toLowerCase();
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(rule);
  }

  let removed = 0;
  for (const [keyword, rules] of groups) {
    if (rules.length <= 1) continue;
    rules.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
    const toDelete = rules.slice(1);
    try {
      await supabase.from('rules').delete().in('id', toDelete.map(d => d.id));
      removed += toDelete.length;
    } catch {
      for (const rule of toDelete) {
        try { await supabase.from('rules').delete().eq('id', rule.id); removed++; } catch {}
      }
    }
  }

  try {
    const { data: fresh } = await supabase.from('rules').select('*').limit(1000);
    localStorage.setItem(LS_PREFIX + 'rules', JSON.stringify(fresh || []));
  } catch {}

  return { removed, total: allRules.length };
}

/**
 * Remove templates duplicados do Supabase, mantendo o mais recente de cada descrição.
 */
async function deduplicateTemplates() {
  let allTpls;
  try {
    const { data } = await supabase.from('templates').select('*').limit(10000);
    allTpls = data || [];
  } catch (e) {
    return { removed: 0, error: e.message };
  }

  if (!allTpls?.length) return { removed: 0, total: 0 };

  const groups = new Map();
  for (const tpl of allTpls) {
    const key = (tpl.description || '').trim().toLowerCase();
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(tpl);
  }

  let removed = 0;
  for (const [desc, tpls] of groups) {
    if (tpls.length <= 1) continue;
    tpls.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
    const toDelete = tpls.slice(1);
    try {
      await supabase.from('templates').delete().in('id', toDelete.map(d => d.id));
      removed += toDelete.length;
    } catch {
      for (const tpl of toDelete) {
        try { await supabase.from('templates').delete().eq('id', tpl.id); removed++; } catch {}
      }
    }
  }

  try {
    const { data: fresh } = await supabase.from('templates').select('*').limit(1000);
    localStorage.setItem(LS_PREFIX + 'templates', JSON.stringify(fresh || []));
  } catch {}

  return { removed, total: allTpls.length };
}

/**
 * Limpa TODAS as duplicatas de todas as entidades.
 * Rodar no console: lumenSetup.deduplicateAll()
 */
async function deduplicateAll() {
  console.log('🔧 Limpando duplicatas...\n');
  const cards = await deduplicateCards();
  console.log(`✅ Cards: ${cards.removed} removidos de ${cards.total}`);
  const rules = await deduplicateRules();
  console.log(`✅ Rules: ${rules.removed} removidos de ${rules.total}`);
  const templates = await deduplicateTemplates();
  console.log(`✅ Templates: ${templates.removed} removidos de ${templates.total}`);
  console.log('\n✨ Limpeza concluída!');
  return { cards, rules, templates };
}

// Auto-register on window
if (typeof window !== 'undefined') {
  window.lumenSetup = lumenSetup;
}
