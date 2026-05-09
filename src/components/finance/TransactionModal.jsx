import React, { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AdaptiveModal } from '@/components/ui/adaptive-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Calendar, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/financeUtils';
import { getCategories } from '@/lib/categories';
import { suggestCategoryFromRules, getTemplates, getPaymentMethods } from '@/lib/store';
import { detectInstallment, isRefundOrPayment } from '@/lib/transactionDetectors';
import { Checkbox } from '@/components/ui/checkbox';
import { base44 } from '@/api/base44Client';
import { useTransactions, useCards } from '@/hooks/useData';

// ═══ Zod Validation Schema ═══
const transactionSchema = z.object({
  value: z.number({ invalid_type_error: 'Informe um valor numérico' })
    .positive('O valor deve ser maior que zero'),
  description: z.string()
    .min(2, 'Descrição deve ter ao menos 2 caracteres')
    .max(100, 'Descrição muito longa'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  type: z.enum(['income', 'expense', 'investment'], {
    errorMap: () => ({ message: 'Tipo inválido' })
  }),
  category: z.string().optional(),
  cardId: z.string().optional(),
  isFixed: z.boolean().optional(),
  isInstallment: z.boolean().optional(),
  installmentCount: z.number().int().positive().optional(),
});

function generateInstallmentSeries({ description, date, perInstallmentValue, count, category, paymentMethod, cardId, isFixed, goalId }) {
  const transactions = [];
  const startDate = new Date(date + 'T00:00:00');
  const seriesId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  for (let i = 0; i < count; i++) {
    const txDate = new Date(startDate);
    txDate.setMonth(txDate.getMonth() + i);
    transactions.push({
      description: `${description} (${i + 1}/${count})`,
      date: txDate.toISOString().split('T')[0],
      value: perInstallmentValue,
      type: 'expense',
      category,
      paymentMethod: paymentMethod || 'Crédito',
      cardId: cardId || null,
      isFixed: false,
      goalId: goalId || null,
      isInstallment: true,
      installmentCount: count,
      installmentCurrent: i + 1,
      installmentSeriesId: seriesId,
      installmentTotalValue: perInstallmentValue * count,
      notes: `Parcela ${i + 1} de ${count}`,
    });
  }
  return transactions;
}

const TYPE_TABS = [
  { value: 'expense', label: 'Despesa' },
  { value: 'income', label: 'Receita' },
  { value: 'investment', label: 'Investimento' },
];

export default function TransactionModal({ open, onClose, onSave, transaction, goals = [], defaultType = 'expense' }) {
  const { data: cardsData = [] } = useCards();
  const cards = cardsData;
  const categories = getCategories();
  const paymentMethods = getPaymentMethods();

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: defaultType || 'expense',
      description: '',
      value: undefined,
      date: new Date().toISOString().split('T')[0],
      category: '',
      cardId: '',
      isFixed: false,
      isInstallment: false,
      installmentCount: undefined,
    },
  });

  const watchedType = watch('type');
  const watchedDescription = watch('description');
  const watchedIsInstallment = watch('isInstallment');
  const watchedValue = watch('value');
  const watchedDate = watch('date');
  const watchedInstallmentCount = watch('installmentCount');
  const watchedCardId = watch('cardId');
  const watchedPaymentMethod = watch('paymentMethod', 'Pix');

  // Autocomplete: recent descriptions (data already cached from Transactions page)
  const { data: recentTx = [] } = useTransactions(200);

  const [showAuto, setShowAuto] = useState(false);
  const [autoIdx, setAutoIdx] = useState(0);
  const descRef = useRef(null);

  // Deduplicated suggestions from recent transactions
  const suggestions = watchedDescription?.trim().length >= 2
    ? [...new Map(
        recentTx
          .filter(t => t.description?.toLowerCase().includes(watchedDescription.toLowerCase()))
          .map(t => [t.description.toLowerCase(), t])
      ).values()].slice(0, 6)
    : [];

  useEffect(() => {
    setShowAuto(suggestions.length > 0 && watchedDescription?.trim().length >= 2);
    setAutoIdx(0);
  }, [watchedDescription]);

  const applySuggestion = (tx) => {
    setValue('description', tx.description);
    if (tx.category) setValue('category', tx.category);
    setShowAuto(false);
  };

  // Reset form when modal opens/closes or transaction changes
  useEffect(() => {
    if (transaction) {
      reset({
        type: transaction.type || 'expense',
        description: transaction.description || '',
        value: transaction.value || undefined,
        date: transaction.date || new Date().toISOString().split('T')[0],
        category: transaction.category || '',
        cardId: transaction.cardId || '',
        isFixed: transaction.isFixed || false,
        isInstallment: transaction.isInstallment || false,
        installmentCount: transaction.installmentCount || undefined,
      });
    } else {
      reset({
        type: defaultType || 'expense',
        description: '',
        value: undefined,
        date: new Date().toISOString().split('T')[0],
        category: '',
        cardId: '',
        isFixed: false,
        isInstallment: false,
        installmentCount: undefined,
      });
    }
  }, [transaction, open, reset, defaultType]);

  // Auto-suggest category on description change
  useEffect(() => {
    if (watchedDescription && watchedDescription.length >= 2) {
      const currentCategory = watch('category');
      if (!currentCategory) {
        const suggested = suggestCategoryFromRules(watchedDescription);
        if (suggested) setValue('category', suggested);
      }
    }
  }, [watchedDescription, setValue, watch]);

  // Auto-detect installment pattern in description (BACKLOG-25)
  useEffect(() => {
    if (!watchedDescription || watchedIsInstallment) return;
    const detected = detectInstallment(watchedDescription);
    if (detected && detected.total > 1) {
      setValue('isInstallment', true);
      setValue('installmentCount', detected.total);
    }
  }, [watchedDescription, watchedIsInstallment, setValue]);

  // Auto-detect refund pattern (BACKLOG-26)
  useEffect(() => {
    if (!watchedDescription || watchedType === 'income') return;
    if (isRefundOrPayment(watchedDescription, 0)) {
      setValue('type', 'income');
    }
  }, [watchedDescription, watchedType, setValue]);

  // Auto-set payment method when card selected
  useEffect(() => {
    if (watchedCardId && watchedCardId !== 'none') {
      setValue('paymentMethod', 'Crédito');
    }
  }, [watchedCardId, setValue]);

  const onSubmit = (data) => {
    const value = data.value;

    // If installment, create series
    if (data.isInstallment && data.installmentCount && data.installmentCount > 1) {
      const series = generateInstallmentSeries({
        description: data.description,
        date: data.date,
        perInstallmentValue: value,
        count: data.installmentCount,
        category: data.category,
        paymentMethod: watchedPaymentMethod,
        cardId: data.cardId,
        isFixed: false,
        goalId: data.goalId,
      });
      series.forEach(tx => onSave(tx, true));
      onClose();
      return;
    }

    onSave({
      ...data,
      value,
      paymentMethod: watchedPaymentMethod,
      cardId: data.cardId && data.cardId !== 'none' ? data.cardId : null,
      goalId: data.goalId && data.goalId !== 'none' ? data.goalId : null,
      isInstallment: false,
      installmentCount: null,
    });
  };

  const isCredit = watchedPaymentMethod === 'Crédito' || !!watchedCardId;
  const installmentCount = watchedInstallmentCount || 0;
  const installmentValue = watchedValue || 0;

  return (
    <AdaptiveModal
      open={open}
      onOpenChange={onClose}
      title={transaction ? 'Editar Transação' : 'Nova Transação'}
    >

        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Tabs value={field.value} onValueChange={field.onChange}>
              <TabsList className="w-full">
                {TYPE_TABS.map(t => (
                  <TabsTrigger key={t.value} value={t.value} className="flex-1 text-xs">
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
        />

        <form className="space-y-3 mt-2" onSubmit={handleSubmit(onSubmit)}>
          <div className="relative">
            <Label>Descrição *</Label>
            <Input
              {...register('description')}
              ref={(e) => {
                register('description').ref(e);
                descRef.current = e;
              }}
              placeholder="Ex: Supermercado"
              onFocus={() => setShowAuto(suggestions.length > 0)}
              onBlur={() => setTimeout(() => setShowAuto(false), 150)}
              onKeyDown={e => {
                if (!showAuto) return;
                if (e.key === 'ArrowDown') { e.preventDefault(); setAutoIdx(i => Math.min(i + 1, suggestions.length - 1)); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setAutoIdx(i => Math.max(i - 1, 0)); }
                else if (e.key === 'Enter' && suggestions[autoIdx]) { e.preventDefault(); applySuggestion(suggestions[autoIdx]); }
                else if (e.key === 'Escape') { setShowAuto(false); }
              }}
              className={cn("mt-1", errors.description && "border-red-500 focus-visible:ring-red-500")}
            />
            {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
            {showAuto && suggestions.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border rounded shadow-lg py-1 max-h-[160px] overflow-y-auto">
                {suggestions.map((tx, i) => (
                  <button
                    key={tx.id}
                    type="button"
                    onMouseDown={e => { e.preventDefault(); applySuggestion(tx); }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-left text-sm transition-colors",
                      i === autoIdx ? "bg-primary/10" : "hover:bg-muted/50"
                    )}
                  >
                    <span className="truncate">{tx.description}</span>
                    <span className="text-xs text-muted-foreground ml-2 shrink-0">{tx.category || '—'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{watchedIsInstallment ? 'Valor da Parcela (R$) *' : 'Valor (R$) *'}</Label>
              <Input
                {...register('value', { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                className={cn("mt-1", errors.value && "border-red-500 focus-visible:ring-red-500")}
              />
              {errors.value && <p className="text-sm text-destructive mt-1">{errors.value.message}</p>}
            </div>
            <div>
              <Label>Data *</Label>
              <Input
                {...register('date')}
                type="date"
                className={cn("mt-1", errors.date && "border-red-500 focus-visible:ring-red-500")}
              />
              {errors.date && <p className="text-sm text-destructive mt-1">{errors.date.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label>Pagamento</Label>
              <Select value={watchedPaymentMethod} onValueChange={v => {
                setValue('paymentMethod', v);
                if (v !== 'Crédito') setValue('cardId', '');
              }}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Credit Card Selection — only when payment method is Crédito */}
          {cards.length > 0 && (watchedPaymentMethod === 'Crédito' || !!watchedCardId) && (
            <div>
              <Label className="flex items-center gap-1.5">
                <CreditCard size={12} /> Cartão de Crédito
              </Label>
              <Controller
                name="cardId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={v => field.onChange(v === 'none' ? '' : v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecionar cartão" />
                    </SelectTrigger>
                    <SelectContent>
                      {cards.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-2 rounded-sm" style={{ background: c.color }} />
                            {c.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {/* Installment Toggle */}
          {watchedType === 'expense' && (
            <div className="border rounded p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Controller
                  name="isInstallment"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="isInstallment"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="isInstallment" className="cursor-pointer font-normal text-sm flex items-center gap-1.5">
                  <Layers size={12} /> Compra parcelada
                </Label>
              </div>

              {watchedIsInstallment && (
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">Número de Parcelas</Label>
                    <Input
                      {...register('installmentCount', { valueAsNumber: true })}
                      type="number"
                      min="2"
                      max="60"
                      placeholder="Ex: 12"
                      className={cn("mt-1 h-8 text-sm", errors.installmentCount && "border-red-500 focus-visible:ring-red-500")}
                    />
                    {errors.installmentCount && <p className="text-sm text-destructive mt-1">{errors.installmentCount.message}</p>}
                  </div>
                  {installmentCount > 0 && installmentValue > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-2.5 text-xs text-blue-800">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <Calendar size={12} /> Resumo do Parcelamento
                      </div>
                      <p className="mt-1">
                        <strong>{installmentCount}x</strong> de <strong>{formatCurrency(installmentValue)}</strong>
                        {' '}= Total: <strong>{formatCurrency(installmentValue * installmentCount)}</strong>
                      </p>
                      <p className="text-blue-600/70 mt-0.5">
                        Última parcela: {(() => {
                          const d = new Date(watchedDate + 'T00:00:00');
                          d.setMonth(d.getMonth() + installmentCount - 1);
                          return d.toLocaleDateString('pt-BR');
                        })()}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {watchedType === 'investment' && goals.length > 0 && (
            <div>
              <Label>Vincular à Meta</Label>
              <Controller
                name="goalId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Nenhuma meta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma meta</SelectItem>
                      {goals.map(g => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          <div>
            <Label>Observações</Label>
            <Input
              {...register('notes')}
              placeholder="Opcional..."
              className="mt-1"
            />
          </div>

          <div className="flex items-center gap-2">
            <Controller
              name="isFixed"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="isFixed"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="isFixed" className="cursor-pointer font-normal text-sm">
              Lançamento fixo mensal
            </Label>
          </div>
        </form>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" onClick={handleSubmit(onSubmit)}>
            {transaction ? 'Salvar' : watchedIsInstallment ? `Criar ${installmentCount || '?'} Parcelas` : 'Adicionar'}
          </Button>
        </div>
    </AdaptiveModal>
  );
}
