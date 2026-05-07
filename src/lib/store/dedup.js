// ══════════════════════════════════════════
// LÚMEN — Auto-deduplicação
// ══════════════════════════════════════════

import { base44 } from '@/api/base44Client';
import { setLocal } from './helpers';

// Flag de sessão — dedup roda 1x por carregamento da aba
export let _dedupRanThisSession = false;

/**
 * Deduplicação automática de Card, Rule e Template.
 * Roda 1x por sessão após initStore. Silencioso — só loga se encontrar algo.
 */
export async function _autoDeduplicate() {
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
        const toDelete = group.slice(1);
        try {
          // Tentar deleteMany com IDs específicos
          await base44.entities[entity].deleteMany({ id: { $in: toDelete.map(d => d.id) } });
          removed += toDelete.length;
        } catch {
          // Fallback: deletar um por um
          for (const dup of toDelete) {
            try { await base44.entities[entity].delete(dup.id); removed++; } catch {}
          }
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
