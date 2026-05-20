import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import MsIcon from '@/components/ui/ms-icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AdaptiveModal } from '@/components/ui/adaptive-modal';
import { clampDateInput } from '@/lib/financeUtils';
import { cn } from '@/lib/utils';

const GOAL_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316'];

const goalSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(60, 'Nome muito longo'),
  targetValue: z.number({ invalid_type_error: 'Informe um valor numérico' }).positive('O valor alvo deve ser maior que zero'),
  currentValue: z.number({ invalid_type_error: 'Informe um valor numérico' }).min(0).optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data invalida').optional().or(z.literal('')),
  description: z.string().optional(),
});

export function GoalModal({ open, onClose, onSave, goal }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(goalSchema),
    defaultValues: { name: '', targetValue: undefined, currentValue: undefined, deadline: '', description: '' },
  });
  const [progressMode, setProgressMode] = useState('linked');
  const [color, setColor] = useState('#10b981');

  React.useEffect(() => {
    if (goal) {
      reset({ name: goal.name || '', targetValue: goal.targetValue || undefined, currentValue: goal.currentValue ?? undefined, deadline: goal.deadline || '', description: goal.description || goal.icon || '' });
      setColor(goal.color || '#10b981');
      setProgressMode(goal.progressMode || 'linked');
    } else {
      reset({ name: '', targetValue: undefined, currentValue: undefined, deadline: '', description: '' });
      setColor('#10b981');
      setProgressMode('linked');
    }
  }, [goal, open, reset]);

  const onSubmit = (data) => {
    onSave({ ...data, color, progressMode, currentValue: progressMode === 'manual' && data.currentValue !== undefined ? data.currentValue : null });
  };

  return (
    <AdaptiveModal open={open} onOpenChange={onClose} title={goal ? 'Editar Objetivo' : 'Novo Objetivo'}>
      <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <Label>Nome do Objetivo</Label>
          <Input {...register('name')} className="mt-1" placeholder="Ex: Reserva de Emergencia" />
          {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Valor Alvo (R$)</Label>
            <Input {...register('targetValue', { valueAsNumber: true })} type="number" min="0" step="0.01" className="mt-1" />
            {errors.targetValue && <p className="text-sm text-destructive mt-1">{errors.targetValue.message}</p>}
          </div>
          <div>
            <Label>Progresso</Label>
            <div className="flex gap-1.5 mt-1">
              <button type="button" onClick={() => setProgressMode('linked')} className={cn("flex-1 text-xs py-1.5 px-2 rounded border transition-colors", progressMode === 'linked' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border')}>Transacoes</button>
              <button type="button" onClick={() => setProgressMode('manual')} className={cn("flex-1 text-xs py-1.5 px-2 rounded border transition-colors", progressMode === 'manual' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border')}>Manual</button>
            </div>
          </div>
        </div>
        {progressMode === 'manual' && (
          <div><Label>Valor Atual (R$)</Label><Input {...register('currentValue', { valueAsNumber: true })} type="number" min="0" step="0.01" className="mt-1" /></div>
        )}
        <div>
          <Label>Prazo</Label>
          <Input {...register('deadline')} type="date" max="2099-12-31" min="1900-01-01"
            onChange={(e) => register('deadline').onChange({ target: { value: clampDateInput(e.target.value), name: 'deadline' } })} className="mt-1" />
        </div>
        <div><Label>Descricao</Label><Input {...register('description')} className="mt-1" placeholder="Opcional..." /></div>
        <div>
          <Label>Cor</Label>
          <div className="flex gap-2 mt-1">
            {GOAL_COLORS.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)} className={cn("w-6 h-6 rounded-full transition-transform", color === c && "ring-2 ring-offset-2 ring-ring scale-110")} style={{ background: c }} />
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" type="submit">{goal ? 'Salvar' : 'Criar'}</Button>
        </div>
      </form>
    </AdaptiveModal>
  );
}

export function DepositModal({ open, onClose, onSave, goal }) {
  const [value, setValue] = useState('');
  return (
    <AdaptiveModal open={open} onOpenChange={onClose} title={`Registrar progresso - "${goal?.name}"`} className="max-w-xs">
      <div><Label>Valor (R$)</Label><Input type="number" min="0" step="0.01" value={value} onChange={e => setValue(e.target.value)} className="mt-1" /></div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
        <Button className="flex-1" onClick={() => { onSave(parseFloat(value)); setValue(''); }}>Registrar</Button>
      </div>
    </AdaptiveModal>
  );
}
