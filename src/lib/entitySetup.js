// ══════════════════════════════════════════
// LÚMEN — Entity Setup Utility
// ══════════════════════════════════════════
// Run in browser console: lumenSetup.run()
// Or import and call from Settings page.

import { base44 } from '@/api/base44Client';

const LS_PREFIX = 'rattio_'; // Mantido para compatibilidade com dados existentes — não alterar

// Entidades que precisam existir no Base44
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

/**
 * Testa se uma entidade existe criando um registro de teste
 */
async function testEntity(entityName) {
  try {
    const entity = base44.entities[entityName];
    if (!entity) return { exists: false, error: 'Entity not in SDK' };

    // Try to list (lightweight check)
    await entity.list('', 1);
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
    const entity = base44.entities[entityName];
    if (!entity) return { created: false, error: 'Entity not in SDK' };

    const created = await entity.create(testRecord);
    // Delete the test record
    if (created?.id) {
      await entity.delete(created.id);
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
      const existing = await base44.entities.UserConfig.filter({ key });
      if (existing?.length > 0) {
        // Update if different
        if (existing[0].value !== localValue) {
          await base44.entities.UserConfig.update(existing[0].id, { value: localValue });
        }
        results.skipped++;
        continue;
      }

      // Create in cloud
      await base44.entities.UserConfig.create({ key, value: localValue });
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

  // Helper: check if an entity schema exists in the app
  const entityExists = async (entityName) => {
    try {
      if (!base44.entities[entityName]) return false;
      await base44.entities[entityName].list('', 1);
      return true;
    } catch (e) {
      return !e.message?.includes('not found');
    }
  };

  // ── Cards ──
  try {
    if (!await entityExists('Card')) {
      results.errors.push('Card: schema not created in Base44 — skipping');
    } else {
      const cards = getLocal('cards') || [];
      const existing = await base44.entities.Card.list('', 1000);
      if (!existing?.length && cards.length) {
        for (const c of cards) {
          await base44.entities.Card.create({
            name: c.name || '',
            color: c.color || '#3b82f6',
            limit: parseFloat(c.limit) || 0,
            closingDay: parseInt(c.closingDay) || 1,
            dueDay: parseInt(c.dueDay) || 10,
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
      results.errors.push('Rule: schema not created in Base44 — skipping');
    } else {
      const rules = getLocal('rules') || [];
      const existing = await base44.entities.Rule.list('', 1000);
      if (!existing?.length && rules.length) {
        for (const r of rules) {
          await base44.entities.Rule.create({
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
      results.errors.push('Template: schema not created in Base44 — skipping');
    } else {
      const templates = getLocal('templates') || [];
      const existing = await base44.entities.Template.list('', 1000);
      if (!existing?.length && templates.length) {
        for (const t of templates) {
          await base44.entities.Template.create({
            description: t.description || '',
            value: parseFloat(t.value) || 0,
            category: t.category || '',
            paymentMethod: t.paymentMethod || '',
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
      results.errors.push('Setting: schema not created in Base44 — skipping');
    } else {
      const settingKeys = ['salaryConfig', 'theme', 'dashSections', 'onboarded', 'lastRecurringGen', 'suggestionsLog', 'financings'];
      for (const key of settingKeys) {
        const val = getLocal(key);
        if (val === null) continue;
        const existing = await base44.entities.Setting.filter({ key });
        if (!existing?.length) {
          await base44.entities.Setting.create({ key, value: JSON.stringify(val) });
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
    const configs = await base44.entities.UserConfig.list('', 500);
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
      console.log('👉 Peça ao Base44: "crie a entidade UserConfig com campos key (string) e value (text)"');
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
export const lumenSetup = { run, testEntity, createEntity, migrateConfigs, migrateToEntities, migrateCardsToCloud, pullFromCloud };

/**
 * Migra cartões do localStorage para a entidade Card no Base44.
 * Upsert por campo `name` para evitar duplicatas.
 */
async function migrateCardsToCloud(b44) {
  const client = b44 || base44;
  if (!client?.entities?.Card) {
    console.info('[migrateCardsToCloud] Card entity not available in SDK — skipping migration');
    return { migrated: 0, skipped: true, reason: 'Card entity not in SDK' };
  }

  // Check if Card schema actually exists in the app
  try {
    await client.entities.Card.list('', 1);
  } catch (e) {
    if (e.message?.includes('not found')) {
      console.info('[migrateCardsToCloud] Card schema not created in Base44 yet — skipping');
      return { migrated: 0, skipped: true, reason: 'Card schema not found in app' };
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
    existing = await client.entities.Card.list('', 1000) || [];
  } catch {}
  const existingNames = new Set(existing.map(c => (c.name || '').toLowerCase()));

  let migrated = 0;
  for (const c of local) {
    const name = (c.name || '').trim();
    if (!name) continue;
    if (existingNames.has(name.toLowerCase())) continue;

    try {
      await client.entities.Card.create({
        name,
        color: c.color || '#3b82f6',
        limit: parseFloat(c.limit) || 0,
        closingDay: parseInt(c.closingDay) || 1,
        dueDay: parseInt(c.dueDay) || 10,
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
    const fresh = await client.entities.Card.list('', 1000);
    if (fresh?.length) localStorage.setItem(LS_PREFIX + 'cards', JSON.stringify(fresh));
  } catch {}

  return { migrated };
}

// Auto-register on window
if (typeof window !== 'undefined') {
  window.lumenSetup = lumenSetup;
}
