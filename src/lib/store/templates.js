// ══════════════════════════════════════════
// LÚMEN — Templates (Base44 entity with localStorage cache)
// ══════════════════════════════════════════

import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/use-toast';
import { getLocal, setLocal, hasEntity, ensureEntity } from './helpers';

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
