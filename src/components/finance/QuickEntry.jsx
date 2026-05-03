import React, { useState, useEffect } from 'react';
import { Plus, TrendingDown, TrendingUp, QrCode, CreditCard, Banknote, FileText, Barcode, ArrowRightLeft, History, Bookmark, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCategories } from '@/lib/categories';
import { getCards, suggestCategoryFromRules, getQuickDraft, saveQuickDraft, clearQuickDraft } from '@/lib/store';

const PM_OPTIONS = [
  { value: 'Pix', icon: QrCode },
  { value: 'Débito', icon: CreditCard },
  { value: 'Crédito', icon: CreditCard },
  { value: 'Dinheiro', icon: Banknote },
  { value: 'Transferência', icon: ArrowRightLeft },
];

export default function QuickEntry({ onSave }) {
  const [type, setType] = useState('expense');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [pm, setPm] = useState('Pix');
  const [cardId, setCardId] = useState('');
  const [category, setCategory] = useState('');
  const [expanded, setExpanded] = useState(false);

  const categories = getCategories();
  const cards = getCards();

  // Restore draft
  useEffect(() => {
    const draft = getQuickDraft();
    if (draft) {
      setType(draft.type || 'expense');
      setValue(draft.value || '');
      setDescription(draft.description || '');
      setDate(draft.date || new Date().toISOString().split('T')[0]);
      setPm(draft.pm || 'Pix');
      setCardId(draft.cardId || '');
      setCategory(draft.category || '');
      if (draft.value || draft.description) setExpanded(true);
    }
  }, []);

  // Auto-save draft
  useEffect(() => {
    if (expanded) {
      saveQuickDraft({ type, value, description, date, pm, cardId, category });
    }
  }, [type, value, description, date, pm, cardId, category, expanded]);

  // Auto-categorize on description change
  useEffect(() => {
    if (description.length >= 2) {
      const suggested = suggestCategoryFromRules(description);
      if (suggested && suggested !== 'Outros' && !category) {
        setCategory(suggested);
      }
    }
  }, [description]);

  const handleLastCategory = () => {
    // This would need access to transactions - fallback to empty
    const lastCat = localStorage.getItem('rattio_lastCategory');
    if (lastCat) setCategory(lastCat);
  };

  const handleSubmit = async () => {
    if (!value || parseFloat(value) <= 0) return;

    const finalCat = category || suggestCategoryFromRules(description) || 'Outros';
    const isCredit = pm === 'Crédito';

    await onSave({
      type,
      description: description.trim() || (type === 'income' ? 'Receita' : 'Despesa'),
      value: parseFloat(value),
      date,
      category: finalCat,
      paymentMethod: pm,
      cardId: isCredit && cardId ? cardId : null,
      isFixed: false,
      isInstallment: false,
    });

    // Save last category
    localStorage.setItem('rattio_lastCategory', finalCat);

    // Reset
    setValue('');
    setDescription('');
    setCategory('');
    setCardId('');
    setDate(new Date().toISOString().split('T')[0]);
    clearQuickDraft();
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full flex items-center gap-3 p-3.5 rounded-lg border border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/30 transition-all text-sm text-muted-foreground"
      >
        <Plus size={16} />
        <span className="font-medium">Novo Lançamento</span>
        <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-muted border font-mono">N</kbd>
      </button>
    );
  }

  return (
    <div className="bg-card rounded-lg border shadow-card p-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center">
          <Plus size={14} className="text-primary" />
        </div>
        <span className="font-extrabold text-base">Novo Lançamento</span>
      </div>

      {/* Type toggle */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          type="button"
          onClick={() => setType('expense')}
          className={cn(
            "py-2.5 rounded font-bold text-sm flex items-center justify-center gap-2 transition-all",
            type === 'expense'
              ? 'bg-red-500 text-white shadow-sm'
              : 'bg-muted text-muted-foreground border border-border hover:border-red-300'
          )}
        >
          <TrendingDown size={14} /> Despesa
        </button>
        <button
          type="button"
          onClick={() => setType('income')}
          className={cn(
            "py-2.5 rounded font-bold text-sm flex items-center justify-center gap-2 transition-all",
            type === 'income'
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'bg-muted text-muted-foreground border border-border hover:border-emerald-300'
          )}
        >
          <TrendingUp size={14} /> Receita
        </button>
      </div>

      {/* Inputs */}
      <div className="space-y-2.5 mb-4">
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="R$ 0,00"
          className="w-full h-11 rounded border border-border bg-muted/50 px-3.5 text-sm font-medium outline-none focus:border-primary transition-colors"
          autoFocus
        />
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Descrição (opcional)"
          maxLength={100}
          className="w-full h-11 rounded border border-border bg-muted/50 px-3.5 text-sm outline-none focus:border-primary transition-colors"
        />
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full h-11 rounded border border-border bg-muted/50 px-3.5 text-sm outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* Payment Methods */}
      <p className="text-xs font-semibold text-muted-foreground mb-2">Forma de Pagamento</p>
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {PM_OPTIONS.map(opt => {
          const Icon = opt.icon;
          const isActive = pm === opt.value;
          const isCredit = opt.value === 'Crédito' && isActive;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPm(opt.value)}
              className={cn(
                "flex-1 min-w-[60px] py-2 rounded text-[11px] font-bold flex flex-col items-center gap-1 transition-all border",
                isCredit
                  ? 'border-red-300 bg-red-50 text-red-600'
                  : isActive
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-muted text-muted-foreground hover:border-primary/40'
              )}
            >
              <Icon size={15} />
              {opt.value}
            </button>
          );
        })}
      </div>

      {/* Card selector (when Crédito) */}
      {pm === 'Crédito' && cards.length > 0 && (
        <select
          value={cardId}
          onChange={e => setCardId(e.target.value)}
          className="w-full h-11 rounded border border-border bg-muted/50 px-3.5 text-sm outline-none focus:border-primary transition-colors mb-3 cursor-pointer"
        >
          <option value="">— Selecione o cartão —</option>
          {cards.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}

      {/* Category */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-muted-foreground">Categoria</p>
      </div>
      <div className="flex gap-2 mb-4">
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="flex-1 h-11 rounded border border-border bg-muted/50 px-3.5 text-sm outline-none focus:border-primary transition-colors cursor-pointer"
        >
          <option value="">Selecione uma categoria</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleLastCategory}
          title="Última categoria usada"
          aria-label="Última categoria usada"
          className="w-11 h-11 rounded border border-border bg-muted flex items-center justify-center text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
        >
          <History size={16} />
        </button>
      </div>

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!value || parseFloat(value) <= 0}
        className={cn(
          "w-full py-3 rounded font-extrabold text-sm flex items-center justify-center gap-2 transition-all",
          type === 'expense'
            ? 'bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed'
            : 'bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        <Plus size={15} />
        {type === 'expense' ? 'Lançar Despesa' : 'Lançar Receita'}
      </button>

      {/* Cancel */}
      <button
        type="button"
        onClick={() => { setExpanded(false); clearQuickDraft(); }}
        className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
      >
        Cancelar
      </button>
    </div>
  );
}
