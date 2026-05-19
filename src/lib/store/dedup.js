import { supabase } from '@/api/supabaseClient';

let _dedupRanThisSession = false;
export { _dedupRanThisSession };

const entityConfigs = [
  { table: 'transactions', pk: 'id', keys: ['description', 'date', 'value'] },
  { table: 'budgets', pk: 'id', keys: ['category', 'month'] },
  { table: 'goals', pk: 'id', keys: ['name'] },
  { table: 'cards', pk: 'id', keys: ['name'] },
  { table: 'rules', pk: 'id', keys: ['keyword'] },
  { table: 'templates', pk: 'id', keys: ['description'] },
];

export async function _autoDeduplicate() {
  if (_dedupRanThisSession) return;
  _dedupRanThisSession = true;

  for (const config of entityConfigs) {
    try {
      const { data, error } = await supabase
        .from(config.table)
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data?.length) continue;

      const seen = new Map();
      const toRemove = [];

      for (const row of data) {
        const key = config.keys.map(k => String(row[k] || '').toLowerCase()).join('|');
        if (seen.has(key)) {
          toRemove.push(row[config.pk]);
        } else {
          seen.set(key, true);
        }
      }

      if (toRemove.length) {
        await supabase.from(config.table).delete().in(config.pk, toRemove);
      }
    } catch (err) {
      console.warn('[Dedup] Erro:', config.table, err);
    }
  }
}
