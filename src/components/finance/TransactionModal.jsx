import React, { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AdaptiveModal } from '@/components/ui/adaptive-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MsIcon from '@/components/ui/ms-icon';
import { CreditCard, Calendar, Layers, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, clampDateInput } from '@/lib/financeUtils';
import { getCategories } from '@/lib/categories';
import { suggestCategoryFromRules, getTemplates, getPaymentMethods } from '@/lib/store';
import { detectInstallment, isRefundOrPayment } from '@/lib/transactionDetectors';
import { getInvoiceMonth } from '@/lib/csvParser';
import { Checkbox } from '@/components/ui/checkbox';
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

    >
      <div className="space-y-md">
        <h3 className="font-title text-title flex items-center gap-2 mb-2">
          <MsIcon name="edit_note" size={20} />
          {transaction ? 'Editar Lançamento' : 'Novo Lançamento'}
        </h3>

        <div className="editorial-rule-top pt-md space-y-md">
          {/* Toggle Despesa/Receita */}
          <div className="grid grid-cols-2 p-1 bg-surface-container rounded-lg">
            <button 
              type="button"
              onClick={() => setValue('type', 'expense')}
              className={cn(
                "py-2 font-bold rounded-lg text-sm flex items-center justify-center gap-2 transition-all",
                watchedType === 'expense' ? "bg-danger text-white shadow-sm" : "text-on-surface-variant hover:bg-surface-container-high"
              )}
            >
              <MsIcon name="south_east" size={16} /> Despesa
            </button>
            <button 
              type="button"
              onClick={() => setValue('type', 'income')}
              className={cn(
                "py-2 font-bold rounded-lg text-sm flex items-center justify-center gap-2 transition-all",
                watchedType === 'income' ? "bg-success text-white shadow-sm" : "text-on-surface-variant hover:bg-surface-container-high"
              )}
            >
              <MsIcon name="north_east" size={16} /> Receita
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            {/* Value Input - Hero Style */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Valor (R$)</label>
              <div className="relative group">
                <input 
                  {...register('value', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  className={cn(
                    "w-full font-mono-number text-[32px] font-bold text-on-surface bg-surface-container-low border-b-2 border-surface-border p-md focus:border-primary-light focus:ring-0 transition-all text-right outline-none rounded-t-lg",
                    errors.value && "border-danger text-danger bg-danger/5"
                  )}
                />
              </div>
              {errors.value && <p className="text-[10px] text-danger font-bold uppercase tracking-wider text-right">{errors.value.message}</p>}
            </div>

            <div className="space-y-3">
              <div className="relative">
                <label className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider block mb-1">Descrição</label>
                <Input
                  {...register('description')}
                  ref={(e) => {
                    register('description').ref(e);
                    descRef.current = e;
                  }}
                  placeholder="Ex: Supermercado"
                  className={cn("bg-surface border border-surface-border p-2 rounded-lg font-body-sm focus:ring-2 focus:ring-primary-light/10 outline-none", errors.description && "border-danger")}
                />
                {showAuto && suggestions.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface border border-surface-border rounded-lg shadow-xl py-1 max-h-[160px] overflow-y-auto">
                    {suggestions.map((tx, i) => (
                      <button
                        key={tx.id}
                        type="button"
                        onMouseDown={e => { e.preventDefault(); applySuggestion(tx); }}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 text-left text-sm transition-colors",
                          i === autoIdx ? "bg-primary/10 text-primary font-bold" : "hover:bg-surface-container-low"
                        )}
                      >
                        <span className="truncate">{tx.description}</span>
                        <span className="text-[10px] font-bold text-muted-foreground ml-2 shrink-0">{tx.category?.toUpperCase() || '—'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider block mb-1">Data</label>
                  <input 
                    {...register('date')}
                    type="date"
                    className="w-full bg-surface border border-surface-border p-2 rounded-lg font-body-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider block mb-1">Categoria</label>
                  <Controller
                    name="category"
                    control={control}
                    render={({ field }) => (
                      <select 
                        value={field.value} 
                        onChange={(e) => field.onChange(e.target.value)}
                        className="w-full bg-surface border border-surface-border p-2 rounded-lg font-body-sm outline-none"
                      >
                        <option value="">Selecione uma categoria</option>
                        {categories.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    )}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider block mb-1">Pagamento</label>
                <div className="grid grid-cols-3 gap-1">
                  <button 
                    type="button"
                    onClick={() => { setValue('paymentMethod', 'Pix'); setValue('cardId', ''); }}
                    className={cn(
                      "p-2 border text-[10px] font-bold rounded-lg flex flex-col items-center gap-1 transition-all",
                      watchedPaymentMethod === 'Pix' ? "border-primary-light bg-primary-light/5 text-primary" : "border-surface-border text-on-surface-variant hover:bg-surface-container-low"
                    )}
                  >
                    <MsIcon name="qr_code_2" size={16} /> PIX
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setValue('paymentMethod', 'Dinheiro'); setValue('cardId', ''); }}
                    className={cn(
                      "p-2 border text-[10px] font-bold rounded-lg flex flex-col items-center gap-1 transition-all",
                      watchedPaymentMethod === 'Dinheiro' ? "border-primary-light bg-primary-light/5 text-primary" : "border-surface-border text-on-surface-variant hover:bg-surface-container-low"
                    )}
                  >
                    <MsIcon name="payments" size={16} /> Dinheiro
                  </button>
                  <button 
                    type="button"
                    onClick={() => setValue('paymentMethod', 'Crédito')}
                    className={cn(
                      "p-2 border text-[10px] font-bold rounded-lg flex flex-col items-center gap-1 transition-all",
                      watchedPaymentMethod === 'Crédito' ? "border-primary-light bg-primary-light/5 text-primary" : "border-surface-border text-on-surface-variant hover:bg-surface-container-low"
                    )}
                  >
                    <MsIcon name="credit_card" size={16} /> Cartão
                  </button>
                </div>
              </div>

              {/* Credit Card Selection */}
              {watchedPaymentMethod === 'Crédito' && cards.length > 0 && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider block mb-1">Escolha o Cartão</label>
                  <Controller
                    name="cardId"
                    control={control}
                    render={({ field }) => (
                      <select 
                        value={field.value} 
                        onChange={(e) => field.onChange(e.target.value)}
                        className="w-full bg-surface border border-surface-border p-2 rounded-lg font-body-sm outline-none"
                      >
                        <option value="">Selecionar cartão</option>
                        {cards.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    )}
                  />
                </div>
              )}
              
              {/* Extra options */}
              <div className="flex flex-col gap-2 pt-2 border-t border-surface-border mt-4">
                <div className="flex items-center gap-2">
                  <Controller
                    name="isFixed"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        id="isFixed"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="border-surface-border data-[state=checked]:bg-primary"
                      />
                    )}
                  />
                  <label htmlFor="isFixed" className="cursor-pointer text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                    Lançamento fixo mensal
                  </label>
                </div>

                {watchedType === 'expense' && (
                  <div className="flex items-center gap-2">
                    <Controller
                      name="isInstallment"
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          id="isInstallment"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="border-surface-border data-[state=checked]:bg-primary"
                        />
                      )}
                    />
                    <label htmlFor="isInstallment" className="cursor-pointer text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                      Compra parcelada
                    </label>
                  </div>
                )}
              </div>

              {watchedIsInstallment && (
                <div className="animate-in zoom-in-95 duration-300 bg-surface-container-low border border-surface-border p-3 rounded-lg space-y-2">
                  <label className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider block">Número de Parcelas</label>
                  <Input
                    {...register('installmentCount', { valueAsNumber: true })}
                    type="number"
                    min="2"
                    max="60"
                    placeholder="Ex: 12"
                    className="h-8 text-sm"
                  />
                  {installmentCount > 0 && installmentValue > 0 && (
                    <div className="text-[10px] text-muted-foreground">
                      <p>Resumo: {installmentCount}x de {formatCurrency(installmentValue)} = Total: {formatCurrency(installmentValue * installmentCount)}</p>
                    </div>
                  )}
                </div>
              )}

              <button 
                type="submit"
                className={cn(
                  "w-full py-4 text-white font-bold rounded-lg shadow-sm transition-all mt-6 uppercase tracking-[0.1em] text-xs",
                  watchedType === 'expense' ? "bg-danger hover:bg-danger/90" : "bg-success hover:bg-success/90"
                )}
              >
                {transaction ? 'Salvar Alterações' : watchedType === 'expense' ? 'LANÇAR DESPESA' : 'LANÇAR RECEITA'}
              </button>
              
              <button 
                type="button"
                onClick={onClose}
                className="w-full py-2 text-on-surface-variant font-bold text-[10px] hover:underline uppercase tracking-widest"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdaptiveModal>
  );
}
