import { supabase } from '@/api/supabaseClient';
import { toast } from '@/components/ui/use-toast';
import { getLocal, setLocal } from './helpers';

export function getTemplates() { return getLocal('templates', []); }

export async function fetchTemplates() {
  try {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    setLocal('templates', data || []);
    setLocal('templates_syncedAt', Date.now());
    return data || [];
  } catch (err) {
    console.error('[Store] Erro em fetchTemplates:', err);
    return getTemplates();
  }
}

export function saveTemplates(tpls) { setLocal('templates', tpls); }

export async function addTemplate(tpl) {
  const newTpl = {
    description: tpl.description || '',
    value: parseFloat(tpl.value) || 0,
    category: tpl.category || '',
    payment_method: tpl.paymentMethod || '',
    type: tpl.type || 'expense',
  };

  try {
    const { data, error } = await supabase
      .from('templates')
      .insert(newTpl)
      .select();

    if (error) throw error;
    await fetchTemplates();
    return data || [];
  } catch (err) {
    console.error('[Store] Erro em addTemplate:', err);
    toast({ title: 'Erro ao salvar template', variant: 'destructive' });
    return [];
  }
}

export async function updateTemplate(id, updates) {
  try {
    const { data, error } = await supabase
      .from('templates')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;
    await fetchTemplates();
    return data || [];
  } catch (err) {
    console.error('[Store] Erro em updateTemplate:', err);
    toast({ title: 'Erro ao atualizar template', variant: 'destructive' });
    return [];
  }
}

export async function deleteTemplate(id) {
  try {
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchTemplates();
    return fetchTemplates();
  } catch (err) {
    console.error('[Store] Erro em deleteTemplate:', err);
    toast({ title: 'Erro ao excluir template', variant: 'destructive' });
    return getTemplates();
  }
}

export async function syncTemplatesToCloud() {
  const local = getTemplates();
  if (!local.length) return { synced: 0 };

  let synced = 0;
  for (const tpl of local) {
    try {
      const { data: existing, error: findError } = await supabase
        .from('templates')
        .select('id')
        .eq('description', tpl.description || '')
        .limit(1);

      if (findError) continue;

      const payload = {
        description: tpl.description || '',
        value: parseFloat(tpl.value) || 0,
        type: tpl.type || 'expense',
        category: tpl.category || '',
        payment_method: tpl.paymentMethod || '',
      };

      if (existing?.length) {
        await supabase.from('templates').update(payload).eq('id', existing[0].id);
      } else {
        await supabase.from('templates').insert(payload);
      }
      synced++;
    } catch (e) {
      console.warn('[syncTemplatesToCloud] Erro:', tpl.description, e);
    }
  }
  return { synced };
}
