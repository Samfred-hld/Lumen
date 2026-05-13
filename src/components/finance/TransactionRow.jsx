// ══════════════════════════════════════════
// LÚMEN — Transaction Row Component
// ══════════════════════════════════════════
import React from 'react';
import { Pencil, Trash2, Copy, Repeat, ArrowDownRight, ArrowUpRight, CheckCircle2, Wallet, Briefcase, CreditCard, Box, Tag, ShoppingCart, Coffee, Car, Stethoscope } from 'lucide-react';
import { formatCurrency, formatSmartDate, isToday } from '@/lib/financeUtils';
import { getCategoryColor } from '@/lib/categories';
import { cn } from '@/lib/utils';
import SwipeToDelete from '@/components/ui/swipe-to-delete';

// Map generic categories to lucide icons
const getCategoryIconComponent = (category, type) => {
  if (type === 'income') return <Briefcase size={20} />;
  if (type === 'investment') return <TrendingUp size={20} />;
  
  const c = (category || '').toLowerCase();
  if (c.includes('alimentação') || c.includes('restaurante')) return <Coffee size={20} />;
  if (c.includes('transporte') || c.includes('carro')) return <Car size={20} />;
  if (c.includes('saúde') || c.includes('farmácia')) return <Stethoscope size={20} />;
  if (c.includes('compras')) return <ShoppingCart size={20} />;
  
  return <Box size={20} />;
};

export default function TransactionRow({ t, index, onDelete, onEdit, onDuplicate }) {
  const isIncome = t.type === 'income';
  const isExpense = t.type === 'expense';
  const isInvestment = t.type === 'investment';

  const valueColor = isIncome ? 'text-emerald-600' : isExpense ? 'text-slate-900' : 'text-sky-600';
  const valuePrefix = isIncome ? '+' : isExpense ? '-' : '';
  const subLabel = t.isFixed ? 'Fixa' : t.isInstallment ? 'Parcelada' : isIncome ? 'Receita' : isExpense ? 'Despesa' : 'Investimento';

  // The icon block styles based on transaction type
  const iconBgClass = isIncome 
    ? 'bg-emerald-50 text-emerald-600' 
    : isInvestment 
      ? 'bg-sky-50 text-sky-600'
      : 'bg-red-50 text-red-500';

  const mainIcon = isIncome ? <ArrowUpRight size={24} /> : isExpense ? <ArrowDownRight size={24} /> : <ArrowUpRight size={24} />;

  return (
    <>
      {/* ── Mobile ── */}
      <SwipeToDelete onDelete={() => onDelete(t.id)} className="lg:hidden">
        <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-all border-b border-slate-100 last:border-b-0 cursor-pointer" onClick={() => onEdit(t)}>
          <div className={cn("w-10 h-10 flex items-center justify-center rounded-lg shrink-0", iconBgClass)}>
            {mainIcon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <h5 className="font-bold text-sm text-slate-900 truncate pr-2">{t.description}</h5>
              <span className={cn("font-bold tabular-nums text-sm shrink-0", valueColor)}>
                {valuePrefix}{formatCurrency(t.value)}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                {isToday(t.date) ? 'HOJE' : formatSmartDate(t.date).toUpperCase()}
              </span>
              {t.category && (
                <span className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getCategoryColor(t.category) }}></span> {t.category}
                </span>
              )}
            </div>
          </div>
        </div>
      </SwipeToDelete>

      {/* ── Desktop ── */}
      <div className="group px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-all cursor-pointer border-b border-slate-100 last:border-0 hidden lg:flex">
        
        {/* Icon block */}
        <div className={cn("w-12 h-12 flex items-center justify-center rounded-lg shrink-0", iconBgClass)}>
          {getCategoryIconComponent(t.category, t.type)}
        </div>
        
        {/* Data block */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <h5 className="font-bold text-base text-slate-900 truncate pr-4 flex items-center gap-2">
              {t.description}
              {t.isFixed && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider border border-slate-200">
                  <Repeat size={10} className="mr-1"/> Fixa
                </span>
              )}
              {t.isInstallment && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider border border-slate-200">
                  <Layers size={10} className="mr-1"/> {t.installmentCurrent}/{t.installmentCount}
                </span>
              )}
            </h5>
            <span className={cn("font-bold tabular-nums text-base shrink-0", valueColor)}>
              {valuePrefix}{formatCurrency(t.value)}
            </span>
          </div>
          
          <div className="flex items-center gap-4 mt-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
              {isToday(t.date) && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
              {formatSmartDate(t.date).toUpperCase()}
            </span>
            
            {t.category && (
              <span className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getCategoryColor(t.category) }}></span> {t.category}
              </span>
            )}
            
            {t.paymentMethod && (
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                {t.paymentMethod === 'Crédito' ? <CreditCard size={12} /> : <Wallet size={12} />}
                {t.paymentMethod} {t.cardId && `- CARTÃO`}
              </span>
            )}
          </div>
        </div>
        
        {/* Actions block (on hover) */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all shrink-0 ml-2">
          <button onClick={(e) => { e.stopPropagation(); onDuplicate(t); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-500 transition-colors" title="Duplicar">
            <Copy size={16} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onEdit(t); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-500 transition-colors" title="Editar">
            <Pencil size={16} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(t.id); }} className="p-1.5 hover:bg-red-100 rounded text-red-600 transition-colors" title="Excluir">
            <Trash2 size={16} />
          </button>
        </div>
        
      </div>
    </>
  );
}
