import { createClient } from '@supabase/supabase-js';
import { createClient as createBase44Client } from '@base44/sdk';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE44_APP_ID = process.env.BASE44_APP_ID;
const BASE44_TOKEN = process.env.BASE44_TOKEN;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const entities = [
  'Transaction', 'Budget', 'Goal', 'Card', 'Rule', 'Template', 'Setting', 'UserConfig'
];

const tableMap = {
  Transaction: 'transactions', Budget: 'budgets', Goal: 'goals', Card: 'cards',
  Rule: 'rules', Template: 'templates', Setting: 'settings', UserConfig: 'user_configs'
};

const transformMap = {
  Transaction: (e, userId) => ({
    user_id: userId, description: e.description, date: e.date, value: e.value,
    type: e.type, category: e.category || 'Outros', payment_method: e.paymentMethod,
    is_fixed: e.isFixed, card_id: e.cardId, goal_id: e.goalId, notes: e.notes,
    is_installment: e.isInstallment, installment_index: e.installmentIndex,
    installment_total: e.installmentTotal, installment_series_id: e.installmentSeriesId,
    source: e.source, created_at: e.createdAt, updated_at: e.updatedAt
  }),
  Budget: (e, userId) => ({
    user_id: userId, category: e.category, limit: e.limit, month: e.month,
    is_recurring: e.isRecurring, created_at: e.createdAt, updated_at: e.updatedAt
  }),
  Goal: (e, userId) => ({
    user_id: userId, name: e.name, target_value: e.targetValue,
    current_value: e.currentValue, progress_mode: e.progressMode, deadline: e.deadline,
    color: e.color, investment_type: e.investmentType, created_at: e.createdAt, updated_at: e.updatedAt
  }),
  Card: (e, userId) => ({
    user_id: userId, name: e.name, color: e.color, limit: e.limit,
    closing_day: e.closingDay, due_day: e.dueDay, brand: e.brand,
    created_at: e.createdAt, updated_at: e.updatedAt
  }),
  Rule: (e, userId) => ({
    user_id: userId, keyword: e.keyword, category: e.category
  }),
  Template: (e, userId) => ({
    user_id: userId, description: e.description, value: e.value,
    category: e.category, payment_method: e.paymentMethod, type: e.type
  }),
  Setting: (e, userId) => ({
    user_id: userId, key: e.key, value: e.value
  }),
  UserConfig: (e, userId) => ({
    user_id: userId, key: e.key, value: e.value
  })
};

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) console.log('DRY RUN — no data will be imported');

  if (!BASE44_APP_ID || !BASE44_TOKEN) {
    console.error('Base44 credentials not configured. Set BASE44_APP_ID and BASE44_TOKEN.');
    console.log('Skipping Base44 export — no source data to migrate.');
    process.exit(0);
  }

  const base44 = createBase44Client({
    appId: BASE44_APP_ID, token: BASE44_TOKEN,
    functionsVersion: 'prod', serverUrl: '',
    requiresAuth: false, appBaseUrl: ''
  });

  let totalExported = 0;
  let totalImported = 0;
  let totalErrors = 0;

  for (const entityName of entities) {
    const tableName = tableMap[entityName];
    console.log(`\nExporting ${entityName} → ${tableName}...`);

    try {
      const items = await base44.entities[entityName].list('', 10000);
      console.log(`  Exported: ${items.length} records`);

      if (!items.length) continue;
      totalExported += items.length;

      if (dryRun) continue;

      // Transform and batch insert
      const batchSize = 100;
      let imported = 0;

      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const rows = batch.map(item => {
          const userId = item.userId || item.user_id || '00000000-0000-0000-0000-000000000000';
          return transformMap[entityName](item, userId);
        });

        const { error } = await supabase.from(tableName).upsert(rows, { onConflict: 'id' });
        if (error) {
          console.error(`  Error importing batch ${i}-${i + batch.length}: ${error.message}`);
          totalErrors++;
        } else {
          imported += rows.length;
        }
      }

      console.log(`  Imported: ${imported} records`);
      totalImported += imported;

      // Validate row count
      const { count, error: countError } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error(`  Count validation error: ${countError.message}`);
      } else {
        const match = count === items.length ? '✓ MATCH' : `✗ MISMATCH (Supabase: ${count}, Base44: ${items.length})`;
        console.log(`  Validation: ${match}`);
      }

      await delay(500);
    } catch (err) {
      console.error(`  Error processing ${entityName}: ${err.message}`);
      totalErrors++;
    }
  }

  console.log(`\n=== Migration Summary ===`);
  console.log(`Total exported: ${totalExported}`);
  console.log(`Total imported: ${totalImported}`);
  console.log(`Errors: ${totalErrors}`);

  if (totalErrors > 0) process.exit(1);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
