import React, { useState, useEffect } from 'react';
import {
  Moon, Sun, Check, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/financeUtils';
import { MONTH_NAMES } from '@/lib/categories';
import { addCard, updateCard, deleteCard, getRules, addRule, deleteRule, getSalaryConfig, saveSalaryConfig, getTheme, setTheme } from '@/lib/store';
import { getCategories } from '@/lib/categories';
import { useCards, useTransactions, useBudgets, useGoals } from '@/hooks/useData';
import { ChevronLeft, ChevronRight, Receipt } from 'lucide-react';

import TabPersonalizacao from '@/components/settings/TabPersonalizacao';
import TabAutomacao from '@/components/settings/TabAutomacao';
import TabDados from '@/components/settings/TabDados';
import MsIcon from '@/components/ui/ms-icon';

// ═══ Card Modal ═══
function CardModal({ open, onClose, onSave, card }) {
  const [form, setForm] = useState({ name: '', color: '#3b82f6', limit: '', closingDay: '', dueDay: '', brand: 'other' });
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));
  useEffect(() => {
    if (card) setForm({ name: card.name || '', color: card.color || '#3b82f6', limit: card.limit?.toString() || '', closingDay: card.closingDay?.toString() || '', dueDay: card.dueDay?.toString() || '', brand: card.brand || 'other' });
    else setForm({ name: '', color: '#3b82f6', limit: '', closingDay: '', dueDay: '', brand: 'other' });
  }, [card, open]);
  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#1e293b'];
  const BRANDS = [{ value: 'visa', label: 'Visa' }, { value: 'mastercard', label: 'Mastercard' }, { value: 'elo', label: 'Elo' }, { value: 'amex', label: 'Amex' }, { value: 'other', label: 'Outro' }];
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{card ? 'Editar Cartão' : 'Novo Cartão de Crédito'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome do Cartão</Label><Input value={form.name} onChange={e => set('name', e.target.value)} className="mt-1" placeholder="Ex: Nubank, Itaú..." /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Bandeira</Label><Select value={form.brand} onValueChange={v => set('brand', v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{BRANDS.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Limite (R$)</Label><Input type="number" min="0" step="0.01" value={form.limit} onChange={e => set('limit', e.target.value)} className="mt-1" placeholder="0,00" /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Dia Fechamento</Label><Input type="number" min="1" max="31" value={form.closingDay} onChange={e => set('closingDay', e.target.value)} className="mt-1" placeholder="Ex: 3" /></div>
            <div><Label>Dia Vencimento</Label><Input type="number" min="1" max="31" value={form.dueDay} onChange={e => set('dueDay', e.target.value)} className="mt-1" placeholder="Ex: 10" /></div>
          </div>
          <div><Label>Cor</Label><div className="flex gap-2 mt-1 flex-wrap">{COLORS.map(c => (
            <button key={c} onClick={() => set('color', c)} className={cn("w-7 h-7 rounded-full transition-transform", form.color === c && "ring-2 ring-offset-2 ring-ring scale-110")} style={{ background: c }} aria-label={"Selecionar cor " + c} />
          ))}</div></div>
        </div>
        <div className="flex gap-2 pt-2"><Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button><Button className="flex-1" onClick={() => onSave(form)}>{card ? 'Salvar' : 'Criar'}</Button></div>
      </DialogContent>
    </Dialog>
  );
}

// ═══ Rule Modal ═══
function RuleModal({ open, onClose, onSave }) {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const cats = getCategories();
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Nova Regra de Categorização</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Palavra-chave</Label><Input value={keyword} onChange={e => setKeyword(e.target.value)} className="mt-1" placeholder="Ex: Uber, iFood, Netflix..." /></div>
          <div><Label>Categoria</Label><Select value={category} onValueChange={setCategory}><SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent>{cats.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
        </div>
        <div className="flex gap-2 pt-2"><Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button><Button className="flex-1" onClick={() => { onSave({ keyword, category }); setKeyword(''); setCategory(''); }}>Salvar</Button></div>
      </DialogContent>
    </Dialog>
  );
}

// ═══ Card Statement Modal ═══
function CardStatementModal({ open, onClose, card, transactions }) {
  const [stmtMonth, setStmtMonth] = useState(new Date().getMonth());
  const [stmtYear, setStmtYear] = useState(new Date().getFullYear());
  if (!card) return null;
  const stmtTx = (transactions || [])
    .filter(t => t.cardId === card.id && t.type === 'expense' && t.date)
    .filter(t => {
      const stmtKey = `${stmtYear}-${String(stmtMonth + 1).padStart(2, '0')}`;
      if (t.invoiceMonth) return t.invoiceMonth === stmtKey;
      const [y, m] = t.date.split('-'); 
      return parseInt(y) === stmtYear && parseInt(m) === stmtMonth + 1;
    })
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const total = stmtTx.reduce((s, t) => s + (t.value || 0), 0);
  const changeStmtMonth = (delta) => {
    let m = stmtMonth + delta, y = stmtYear;
    if (m > 11) { m = 0; y++; } if (m < 0) { m = 11; y--; }
    setStmtMonth(m); setStmtYear(y);
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Receipt size={18} className="text-primary" /> Extrato: {card.name}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-1 bg-card border rounded px-2 py-1">
            <button onClick={() => changeStmtMonth(-1)} className="p-1 hover:bg-muted rounded" aria-label="Mês anterior"><ChevronLeft size={14} /></button>
            <span className="text-sm font-medium px-2 min-w-[110px] text-center">{MONTH_NAMES[stmtMonth]} {stmtYear}</span>
            <button onClick={() => changeStmtMonth(1)} className="p-1 hover:bg-muted rounded" aria-label="Próximo mês"><ChevronRight size={14} /></button>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total da Fatura</p>
            <p className="text-lg font-bold text-red-500 tabular-nums">{formatCurrency(total)}</p>
          </div>
        </div>
        {stmtTx.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Sem transações neste mês</div>
        ) : (
          <div className="space-y-1">
            {stmtTx.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-2.5 rounded border border-border/60 hover:bg-muted/40 transition-colors">
                <div className="w-8 h-8 rounded gradient-red flex items-center justify-center text-xs font-bold text-red-700 shrink-0">{(t.description || '?')[0].toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.description}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(t.date)} · {t.category}</p>
                </div>
                <span className="text-sm font-bold text-red-500 tabular-nums shrink-0">{formatCurrency(t.value)}</span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ═══ Main Settings Page ═══
export default function SettingsPage() {
  const [darkMode, setDarkMode] = useState(() => getTheme() === 'dark');
  const [activeTab, setActiveTab] = useState('personalizacao');
  const [showCardModal, setShowCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showCardStatement, setShowCardStatement] = useState(null);
  const [rules, setRules] = useState(() => getRules());
  const [salaryConfig, setSalaryConfig] = useState(() => getSalaryConfig() || {});
  const [importMsg, setImportMsg] = useState('');

  const { data: cards = [] } = useCards();

  const TABS = [
    { id: 'personalizacao', label: 'Personalização', icon: 'palette' },
    { id: 'automacao', label: 'Automação', icon: 'bolt' },
    { id: 'backup', label: 'Backup & Dados', icon: 'save' },
  ];

  const { data: transactions = [] } = useTransactions(500);
  const { data: budgets = [] } = useBudgets();
  const { data: goals = [] } = useGoals();

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    setTheme(next ? 'dark' : 'light');
  };

  const handleSaveCard = (data) => {
    if (editingCard) updateCard(editingCard.id, data); else addCard(data);
    setShowCardModal(false); setEditingCard(null);
  };

  const handleSaveRule = (data) => { addRule(data); setRules(getRules()); setShowRuleModal(false); };
  const handleDeleteRule = (id) => { deleteRule(id); setRules(getRules()); };
  const handleSaveSalary = () => { saveSalaryConfig(salaryConfig); };

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Cartões, categorias, regras, backup e preferências</p>
        </div>
        <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
          <Sun size={14} className={cn("transition-colors", !darkMode ? 'text-amber-500' : 'text-muted-foreground')} />
          <Switch checked={darkMode} onCheckedChange={toggleTheme} />
          <Moon size={14} className={cn("transition-colors", darkMode ? 'text-blue-400' : 'text-muted-foreground')} />
        </div>
      </div>

      {importMsg && (
        <div className={cn("flex items-center gap-2 p-3 rounded text-sm font-medium", importMsg.includes('sucesso') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200')}>
          {importMsg.includes('sucesso') ? <Check size={16} /> : <AlertCircle size={16} />}{importMsg}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded text-sm font-medium transition-all duration-200",
              activeTab === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <MsIcon name={tab.icon} size={18} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'personalizacao' && (
        <TabPersonalizacao
          cards={cards}
          onEditCard={(c) => { setEditingCard(c); setShowCardModal(true); }}
          onDeleteCard={(id) => deleteCard(id)}
          onShowStatement={setShowCardStatement}
          onNewCard={() => { setEditingCard(null); setShowCardModal(true); }}
        />
      )}

      {activeTab === 'automacao' && (
        <TabAutomacao
          rules={rules}
          salaryConfig={salaryConfig}
          setSalaryConfig={setSalaryConfig}
          onSaveSalary={handleSaveSalary}
          onDeleteRule={handleDeleteRule}
          onNewRule={() => setShowRuleModal(true)}
        />
      )}

      {activeTab === 'backup' && (
        <TabDados
          transactions={transactions}
          budgets={budgets}
          goals={goals}
          cards={cards}
          importMsg={importMsg}
          setImportMsg={setImportMsg}
        />
      )}

      {/* Shared Modals */}
      <CardModal open={showCardModal} onClose={() => { setShowCardModal(false); setEditingCard(null); }} onSave={handleSaveCard} card={editingCard} />
      <RuleModal open={showRuleModal} onClose={() => setShowRuleModal(false)} onSave={handleSaveRule} />
      <CardStatementModal open={!!showCardStatement} onClose={() => setShowCardStatement(null)} card={showCardStatement} transactions={transactions} />
    </div>
  );
}