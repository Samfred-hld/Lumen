import React, { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Layers, Edit3, TrendingDown, TrendingUp } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { clampDateInput } from '@/lib/financeUtils';
import { getCategories } from '@/lib/categories';
import { suggestCategoryFromRules, getPaymentMethods } from '@/lib/store';
import { detectInstallment, isRefundOrPayment } from '@/lib/transactionDetectors';
import { getInvoiceMonth } from '@/lib/csvParser';
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

export default function TransactionInlineForm({ onSave, transaction, goals = [], defaultType = 'expense', onCancel }) {
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

  const { data: recentTx = [] } = useTransactions(200);

  const [showAuto, setShowAuto] = useState(false);
  const [autoIdx, setAutoIdx] = useState(0);
  const descRef = useRef(null);

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
  }, [transaction, reset, defaultType]);

  useEffect(() => {
    if (watchedDescription && watchedDescription.length >= 2) {
      const currentCategory = watch('category');
      if (!currentCategory) {
        const suggested = suggestCategoryFromRules(watchedDescription);
        if (suggested) setValue('category', suggested);
      }
    }
  }, [watchedDescription, setValue, watch]);

  useEffect(() => {
    if (!watchedDescription || watchedIsInstallment) return;
    const detected = detectInstallment(watchedDescription);
    if (detected && detected.total > 1) {
      setValue('isInstallment', true);
      setValue('installmentCount', detected.total);
    }
  }, [watchedDescription, watchedIsInstallment, setValue]);

  useEffect(() => {
    if (!watchedDescription || watchedType === 'income') return;
    if (isRefundOrPayment(watchedDescription, 0)) {
      setValue('type', 'income');
    }
  }, [watchedDescription, watchedType, setValue]);

  useEffect(() => {
    if (watchedCardId && watchedCardId !== 'none') {
      setValue('paymentMethod', 'Crédito');
    }
  }, [watchedCardId, setValue]);

  const onSubmit = (data) => {
    const value = data.value;

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
      if (onCancel) onCancel();
      return;
    }

    let invoiceMonth = null;
    const isCredit = watchedPaymentMethod === 'Crédito' && data.cardId && data.cardId !== 'none';
    
    if (isCredit) {
      const card = cards.find(c => c.id === data.cardId);
      if (card && card.closingDay) {
        invoiceMonth = getInvoiceMonth(data.date, card.closingDay);
      }
    }

    onSave({
      ...data,
      value,
      paymentMethod: watchedPaymentMethod,
      cardId: isCredit ? data.cardId : null,
      goalId: data.goalId && data.goalId !== 'none' ? data.goalId : null,
      isInstallment: false,
      installmentCount: null,
      invoiceMonth: invoiceMonth || undefined,
    });
    
    // Reset defaults after saving a new one
    if (!transaction) {
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
  };

  const isExpense = watchedType === 'expense';
  const isIncome = watchedType === 'income';

  return (
    <div className="bg-surface border border-surface-border p-card-padding h-fit relative">
      <h3 className="font-title text-title mb-md flex items-center gap-2">
        <Edit3 className="w-[18px] h-[18px] text-on-surface-variant" />
        {transaction ? 'Editar Lançamento' : 'Novo Lançamento'}
      </h3>
      
      <div className="editorial-rule-top pt-md space-y-md">
        
        {/* Toggle Despesa/Receita */}
        <div className="grid grid-cols-2 p-1 bg-surface-container rounded-lg">
          <button 
            type="button"
            onClick={() => setValue('type', 'expense')}
            className={cn(
              "py-2 font-bold rounded-lg text-sm flex items-center justify-center gap-2 transition-colors",
              isExpense ? "bg-kpi-expense text-on-primary" : "text-on-surface-variant hover:bg-surface-container-low"
            )}
          >
            <TrendingDown className="w-4 h-4" /> Despesa
          </button>
          <button 
            type="button"
            onClick={() => setValue('type', 'income')}
            className={cn(
              "py-2 font-bold rounded-lg text-sm flex items-center justify-center gap-2 transition-colors",
              isIncome ? "bg-kpi-income text-on-primary" : "text-on-surface-variant hover:bg-surface-container-low"
            )}
          >
            <TrendingUp className="w-4 h-4" /> Receita
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Value Input */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">
              {watchedIsInstallment ? 'Valor da Parcela (R$)' : 'Valor (R$)'}
            </label>
            <div className="relative group">
              <input
                {...register('value', { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                className={cn(
                  "w-full font-mono-number text-[32px] font-bold text-on-surface bg-surface-container-low border-b-2 p-md focus:border-primary-light focus:ring-0 transition-all text-right outline-none",
                  errors.value ? "border-red-500" : "border-surface-border"
                )}
              />
            </div>
            {errors.value && <p className="text-xs text-red-500 mt-1">{errors.value.message}</p>}
          </div>

          <div className="space-y-3">
            {/* Description */}
            <div className="relative">
              <label className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider block mb-1">Descrição</label>
              <input
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
                className={cn(
                  "w-full bg-surface border p-2 rounded-lg font-body-sm focus:ring-2 focus:ring-primary-light/10 outline-none",
                  errors.description ? "border-red-500" : "border-surface-border"
                )}
              />
              {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
              
              {showAuto && suggestions.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface border border-surface-border rounded shadow-lg py-1 max-h-[160px] overflow-y-auto">
                  {suggestions.map((tx, i) => (
                    <button
                      key={tx.id}
                      type="button"
                      onMouseDown={e => { e.preventDefault(); applySuggestion(tx); }}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 text-left text-sm transition-colors",
                        i === autoIdx ? "bg-surface-container-low" : "hover:bg-surface-container-low"
                      )}
                    >
                      <span className="truncate">{tx.description}</span>
                      <span className="text-[10px] uppercase text-on-surface-variant font-bold ml-2 shrink-0">{tx.category || '—'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider block mb-1">Data</label>
              <input
                {...register('date')}
                type="date"
                max="2099-12-31"
                min="1900-01-01"
                onChange={(e) => register('date').onChange({ target: { value: clampDateInput(e.target.value), name: 'date' } })}
                onBlur={(e) => {
                  const clamped = clampDateInput(e.target.value);
                  if (clamped !== e.target.value) register('date').onChange({ target: { value: clamped, name: 'date' } });
                }}
                className={cn(
                  "w-full bg-surface border p-2 rounded-lg font-body-sm outline-none",
                  errors.date ? "border-red-500" : "border-surface-border"
                )}
              />
              {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date.message}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider block mb-1">Categoria</label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <select 
                    value={field.value} 
                    onChange={field.onChange}
                    className="w-full bg-surface border border-surface-border p-2 rounded-lg font-body-sm outline-none"
                  >
                    <option value="">Selecione uma categoria</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
              />
            </div>

            {/* Payment Method / Quick selectors */}
            <div>
              <label className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider block mb-1">Pagamento</label>
              <div className="grid grid-cols-2 gap-2">
                <select 
                  value={watchedPaymentMethod} 
                  onChange={e => {
                    setValue('paymentMethod', e.target.value);
                    if (e.target.value !== 'Crédito') setValue('cardId', '');
                  }}
                  className="w-full bg-surface border border-surface-border p-2 rounded-lg font-body-sm outline-none"
                >
                  {paymentMethods.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                
                {watchedPaymentMethod === 'Crédito' && cards.length > 0 && (
                  <Controller
                    name="cardId"
                    control={control}
                    render={({ field }) => (
                      <select 
                        value={field.value} 
                        onChange={e => field.onChange(e.target.value === 'none' ? '' : e.target.value)}
                        className="w-full bg-surface border border-surface-border p-2 rounded-lg font-body-sm outline-none"
                      >
                        <option value="none">Selecione o cartão</option>
                        {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    )}
                  />
                )}
              </div>
            </div>

            {/* Fixa / Parcelada Options */}
            <div className="flex flex-col gap-2 pt-2">
              <div className="flex items-center gap-2">
                <Controller
                  name="isFixed"
                  control={control}
                  render={({ field }) => (
                    <Checkbox id="isFixedInline" checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
                <label htmlFor="isFixedInline" className="text-xs font-bold text-on-surface-variant cursor-pointer">
                  Lançamento fixo mensal
                </label>
              </div>

              {isExpense && (
                <div className="flex flex-col gap-2 border-t border-surface-border pt-2 mt-2">
                  <div className="flex items-center gap-2">
                    <Controller
                      name="isInstallment"
                      control={control}
                      render={({ field }) => (
                        <Checkbox id="isInstallmentInline" checked={field.value} onCheckedChange={field.onChange} />
                      )}
                    />
                    <label htmlFor="isInstallmentInline" className="text-xs font-bold text-on-surface-variant cursor-pointer flex items-center gap-1">
                      <Layers className="w-3 h-3" /> Compra parcelada
                    </label>
                  </div>
                  
                  {watchedIsInstallment && (
                    <div className="pl-6 space-y-2">
                      <input
                        {...register('installmentCount', { valueAsNumber: true })}
                        type="number"
                        min="2"
                        max="60"
                        placeholder="Parcelas (Ex: 12)"
                        className={cn(
                          "w-full bg-surface border p-2 rounded-lg font-body-sm outline-none",
                          errors.installmentCount ? "border-red-500" : "border-surface-border"
                        )}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
            
          </div>
          
          <div className="pt-2">
            <button 
              type="submit"
              className={cn(
                "w-full py-4 font-bold rounded-lg transition-all mt-4 text-on-primary",
                isExpense ? "bg-kpi-expense/80 hover:bg-kpi-expense" : "bg-kpi-income/80 hover:bg-kpi-income"
              )}
            >
              {transaction ? 'SALVAR EDIÇÃO' : isExpense ? 'LANÇAR DESPESA' : 'LANÇAR RECEITA'}
            </button>
            {transaction && onCancel && (
              <button 
                type="button" 
                onClick={onCancel}
                className="w-full py-2 text-on-surface-variant font-bold text-xs hover:underline mt-2"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}