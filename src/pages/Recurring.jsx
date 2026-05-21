import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import MsIcon from '@/components/ui/ms-icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AdaptiveModal } from '@/components/ui/adaptive-modal';
import { formatCurrency, getTypeLabel, getTypeBg } from '@/lib/financeUtils';
import { getCategories } from '@/lib/categories';
import { cn } from '@/lib/utils';
import { fetchTemplates, addTemplate, updateTemplate, deleteTemplate } from '@/lib/store';

// ═══ Zod Validation Schema ═══
const templateSchema = z.object({
  description: z.string().min(2, 'Descrição deve ter ao menos 2 caracteres'),
  value: z.number({ invalid_type_error: 'Informe um valor numérico' })
    .positive('O valor deve ser maior que zero'),
  category: z.string().min(1, 'Selecione uma categoria'),
  type: z.enum(['income', 'expense'], { required_error: 'Selecione o tipo' }),
  payment_method: z.string().optional(),
  dayOfMonth: z.number({ invalid_type_error: 'Informe o dia' })
    .min(1, 'Dia deve ser entre 1 e 31')
    .max(31, 'Dia deve ser entre 1 e 31')
    .optional(),
});

function RecurringModal({ open, onClose, onSave, template }) {
  const categories = getCategories();

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      description: '',
      value: undefined,
      category: '',
      type: 'expense',
      payment_method: '',
      dayOfMonth: undefined,
    },
  });

  React.useEffect(() => {
    if (template) {
      reset({
        description: template.description || '',
        value: template.value || undefined,
        category: template.category || '',
        type: template.type || 'expense',
        payment_method: template.payment_method || '',
        dayOfMonth: template.dayOfMonth || undefined,
      });
    } else {
      reset({
        description: '',
        value: undefined,
        category: '',
        type: 'expense',
        payment_method: '',
        dayOfMonth: undefined,
      });
    }
  }, [template, open, reset]);

  const onSubmit = (data) => {
    onSave({
      ...data,
      payment_method: data.payment_method || '',
      dayOfMonth: data.dayOfMonth || null,
    });
  };

  return (
    <AdaptiveModal
      open={open}
      onOpenChange={onClose}
      title={template ? 'Editar Recorrência' : 'Nova Recorrência'}
    >
      <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <Label>Descrição</Label>
          <Input
            {...register('description')}
            className="mt-1"
            placeholder="Ex: Aluguel, Netflix, Academia..."
          />
          {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <Label>Valor (R$)</Label>
            <Input
              {...register('value', { valueAsNumber: true })}
              type="number"
              min="0"
              step="0.01"
              className="mt-1"
              placeholder="0,00"
            />
            {errors.value && <p className="text-sm text-destructive mt-1">{errors.value.message}</p>}
          </div>
          <div>
            <Label>Tipo</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Despesa</SelectItem>
                    <SelectItem value="income">Receita</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.type && <p className="text-sm text-destructive mt-1">{errors.type.message}</p>}
          </div>
        </div>

        <div>
          <Label>Categoria</Label>
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
          {errors.category && <p className="text-sm text-destructive mt-1">{errors.category.message}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <Label>Método de Pagamento</Label>
            <Input
              {...register('payment_method')}
              className="mt-1"
              placeholder="Ex: Débito, PIX, Boleto..."
            />
          </div>
          <div>
            <Label>Dia do Mês</Label>
            <Input
              {...register('dayOfMonth', { valueAsNumber: true })}
              type="number"
              min="1"
              max="31"
              className="mt-1"
              placeholder="1-31"
            />
            {errors.dayOfMonth && <p className="text-sm text-destructive mt-1">{errors.dayOfMonth.message}</p>}
          </div>
        </div>
      </form>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
        <Button className="flex-1" onClick={handleSubmit(onSubmit)}>
          {template ? 'Salvar' : 'Criar'}
        </Button>
      </div>
    </AdaptiveModal>
  );
}

export default function Recurring() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const loadTemplates = async () => {
    setLoading(true);
    const data = await fetchTemplates();
    setTemplates(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleSave = async (data) => {
    if (editing) {
      await updateTemplate(editing.id, data);
    } else {
      await addTemplate(data);
    }
    await loadTemplates();
    setShowModal(false);
    setEditing(null);
  };

  const handleToggleActive = async (template) => {
    const newActive = !(template.active !== false);
    await updateTemplate(template.id, { active: newActive });
    await loadTemplates();
  };

  const handleDelete = async (id) => {
    await deleteTemplate(id);
    await loadTemplates();
    setConfirmDelete(null);
  };

  return (
    <div className="py-xl max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Transações Recorrentes</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Gerencie suas transações fixas</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setShowModal(true); }}>
          <MsIcon name="add" size={14} className="mr-1" /> Nova Recorrência
        </Button>
      </div>

      {/* Templates list */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2].map(i => (
            <div key={i} className="bg-surface border border-surface-border p-card-loading animate-pulse rounded-lg h-32" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-surface border border-surface-border p-xl text-center">
          <MsIcon name="repeat" size={32} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">Nenhuma transação recorrente cadastrada</p>
          <Button size="sm" className="mt-3" onClick={() => setShowModal(true)}>
            Criar primeira recorrência
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {templates.map(tpl => {
            const isActive = tpl.active !== false;
            const typeBg = getTypeBg(tpl.type);
            const typeLabel = getTypeLabel(tpl.type);

            return (
              <div
                key={tpl.id}
                className={cn(
                  "bg-surface border border-surface-border p-card-padding relative group hover:shadow-lg transition-shadow overflow-hidden",
                  !isActive && "opacity-60"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <MsIcon
                      name={tpl.type === 'income' ? 'trending_up' : 'trending_down'}
                      size={18}
                      className={cn(tpl.type === 'income' ? 'text-emerald-500' : 'text-red-500', 'shrink-0')}
                    />
                    <span className="font-semibold text-sm truncate">{tpl.description}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={isActive}
                      onCheckedChange={() => handleToggleActive(tpl)}
                      aria-label={isActive ? 'Desativar recorrência' : 'Ativar recorrência'}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <span className={cn("text-lg font-bold tabular-nums", tpl.type === 'income' ? 'text-emerald-600' : 'text-red-500')}>
                    {tpl.type === 'income' ? '+' : '-'}{formatCurrency(tpl.value)}
                  </span>
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium", typeBg)}>
                    {typeLabel}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                  {tpl.category && (
                    <span className="flex items-center gap-1">
                      <MsIcon name="label" size={12} /> {tpl.category}
                    </span>
                  )}
                  {tpl.payment_method && (
                    <span className="flex items-center gap-1">
                      <MsIcon name="credit_card" size={12} /> {tpl.payment_method}
                    </span>
                  )}
                  {tpl.dayOfMonth && (
                    <span className="flex items-center gap-1">
                      <MsIcon name="event" size={12} /> Dia {tpl.dayOfMonth}
                    </span>
                  )}
                </div>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setEditing(tpl); setShowModal(true); }}
                    className="p-1.5 hover:bg-muted rounded"
                    aria-label="Editar recorrência"
                  >
                    <MsIcon name="edit" size={14} />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(tpl)}
                    className="p-1.5 hover:bg-red-50 text-red-500 rounded"
                    aria-label="Excluir recorrência"
                  >
                    <MsIcon name="delete" size={14} />
                  </button>
                </div>

                {!isActive && (
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-muted-foreground/30" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info note */}
      {templates.length > 0 && (
        <div className="bg-surface border border-surface-border p-3 flex items-start gap-2 text-xs text-muted-foreground">
          <MsIcon name="info" size={16} className="shrink-0 mt-0.5" />
          <p>As transações recorrentes são geradas automaticamente todo mês pela Edge Function generate-recurring.</p>
        </div>
      )}

      {/* Create/Edit modal */}
      <RecurringModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditing(null); }}
        onSave={handleSave}
        template={editing}
      />

      {/* Delete confirmation */}
      {confirmDelete && (
        <AdaptiveModal
          open={!!confirmDelete}
          onOpenChange={() => setConfirmDelete(null)}
          title="Excluir Recorrência"
        >
          <p className="text-sm text-muted-foreground mb-4">
            Tem certeza que deseja excluir a recorrência <strong>"{confirmDelete.description}"</strong>?
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
            <Button variant="destructive" className="flex-1" onClick={() => handleDelete(confirmDelete.id)}>Excluir</Button>
          </div>
        </AdaptiveModal>
      )}
    </div>
  );
}
