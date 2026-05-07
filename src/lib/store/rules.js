// ══════════════════════════════════════════
// LÚMEN — Rules (Base44 entity with localStorage cache)
// ══════════════════════════════════════════

import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/use-toast';
import { matchCorrelation } from '../autoCorrelations';
import { getLocal, setLocal, hasEntity, ensureEntity } from './helpers';

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
