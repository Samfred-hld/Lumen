import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  CreditCard, Tag, FileText, Download, Upload, Plus, Trash2, Pencil,
  Moon, Sun, Wand2, DollarSign, Check, AlertCircle, X, ChevronDown, ChevronRight, History,
  Wallet, Layers, Receipt, Eye, ChevronLeft, Cloud
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/financeUtils';
import { CAT_COLORS, DEFAULT_CATEGORIES, MONTH_NAMES } from '@/lib/categories';
import { lsSet, lsGet, addCard, updateCard, deleteCard, getExtraCats, saveExtraCats, getRules, saveRules, addRule, deleteRule, getChangelog, addChangelogEntry, getSalaryConfig, saveSalaryConfig, getCustomPaymentMethods, saveCustomPaymentMethods, getTemplates, saveTemplates, addTemplate, deleteTemplate, syncTemplatesToCloud, clearAllData } from '@/lib/store';
import { getCategories } from '@/lib/categories';
import { useCards, useTransactions, useBudgets, useGoals } from '@/hooks/useData';

// ═══ Section wrapper ═══
function Section({ icon: Icon, title, children, actions }) {
  return (
    <Card className="border-0 shadow-card overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-primary/10"><Icon size={16} className="text-primary" /></div>
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          </div>
          {actions}
        </div>
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  );
}

// ═══ Card Modal ═══
function CardModal({ open, onClose, onSave, card }) {
  const [form, setForm] = useState({ name:'', color:'#3b82f6', limit:'', closingDay:'', dueDay:'', brand:'other' });
  const set = (f,v) => setForm(p=>({...p,[f]:v}));
  useEffect(() => {
    if(card) setForm({ name:card.name||'', color:card.color||'#3b82f6', limit:card.limit?.toString()||'', closingDay:card.closingDay?.toString()||'', dueDay:card.dueDay?.toString()||'', brand:card.brand||'other' });
    else setForm({ name:'', color:'#3b82f6', limit:'', closingDay:'', dueDay:'', brand:'other' });
  }, [card, open]);
  const COLORS = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#f97316','#1e293b'];
  const BRANDS = [{value:'visa',label:'Visa'},{value:'mastercard',label:'Mastercard'},{value:'elo',label:'Elo'},{value:'amex',label:'Amex'},{value:'other',label:'Outro'}];
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{card?'Editar Cartão':'Novo Cartão de Crédito'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome do Cartão</Label><Input value={form.name} onChange={e=>set('name',e.target.value)} className="mt-1" placeholder="Ex: Nubank, Itaú..."/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Bandeira</Label><Select value={form.brand} onValueChange={v=>set('brand',v)}><SelectTrigger className="mt-1"><SelectValue/></SelectTrigger><SelectContent>{BRANDS.map(b=><SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Limite (R$)</Label><Input type="number" min="0" step="0.01" value={form.limit} onChange={e=>set('limit',e.target.value)} className="mt-1" placeholder="0,00"/></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Dia Fechamento</Label><Input type="number" min="1" max="31" value={form.closingDay} onChange={e=>set('closingDay',e.target.value)} className="mt-1" placeholder="Ex: 3"/></div>
            <div><Label>Dia Vencimento</Label><Input type="number" min="1" max="31" value={form.dueDay} onChange={e=>set('dueDay',e.target.value)} className="mt-1" placeholder="Ex: 10"/></div>
          </div>
          <div><Label>Cor</Label><div className="flex gap-2 mt-1 flex-wrap">{COLORS.map(c => (
            <button key={c} onClick={() => set('color', c)} className={cn("w-7 h-7 rounded-full transition-transform", form.color === c && "ring-2 ring-offset-2 ring-ring scale-110")} style={{ background: c }} aria-label={"Selecionar cor " + c} />
          ))}</div></div>
        </div>
        <div className="flex gap-2 pt-2"><Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button><Button className="flex-1" onClick={()=>onSave(form)}>{card?'Salvar':'Criar'}</Button></div>
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
          <div><Label>Palavra-chave</Label><Input value={keyword} onChange={e=>setKeyword(e.target.value)} className="mt-1" placeholder="Ex: Uber, iFood, Netflix..."/></div>
          <div><Label>Categoria</Label><Select value={category} onValueChange={setCategory}><SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar"/></SelectTrigger><SelectContent>{cats.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
        </div>
        <div className="flex gap-2 pt-2"><Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button><Button className="flex-1" onClick={()=>{onSave({keyword,category});setKeyword('');setCategory('');}}>Salvar</Button></div>
      </DialogContent>
    </Dialog>
  );
}

// ═══ Template Modal (BACKLOG-11) ═══
function TemplateModal({ open, onClose, onSave, template }) {
  const [form, setForm] = useState({ description: '', value: '', category: '', paymentMethod: '', type: 'expense' });
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));
  const cats = getCategories();

  useEffect(() => {
    if (template) setForm({ description: template.description || '', value: template.value?.toString() || '', category: template.category || '', paymentMethod: template.paymentMethod || '', type: template.type || 'expense' });
    else setForm({ description: '', value: '', category: '', paymentMethod: '', type: 'expense' });
  }, [template, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{template ? 'Editar Template' : 'Novo Template'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Tipo</Label>
            <div className="flex gap-2 mt-1">
              <Button size="sm" variant={form.type === 'expense' ? 'default' : 'outline'} onClick={() => set('type', 'expense')} className="flex-1">Despesa</Button>
              <Button size="sm" variant={form.type === 'income' ? 'default' : 'outline'} onClick={() => set('type', 'income')} className="flex-1">Receita</Button>
            </div>
          </div>
          <div><Label>Descrição</Label><Input value={form.description} onChange={e => set('description', e.target.value)} className="mt-1" placeholder="Ex: Aluguel" /></div>
          <div><Label>Valor (R$)</Label><Input type="number" min="0" step="0.01" value={form.value} onChange={e => set('value', e.target.value)} className="mt-1" placeholder="0,00" /></div>
          <div>
            <Label>Categoria</Label>
            <Select value={form.category} onValueChange={v => set('category', v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>{cats.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Forma de Pagamento</Label><Input value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)} className="mt-1" placeholder="Ex: Pix" /></div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" onClick={() => onSave({ ...form, value: parseFloat(form.value) || 0 })}>{template ? 'Salvar' : 'Criar'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═══ Card Statement Modal (BACKLOG-12) ═══
function CardStatementModal({ open, onClose, card, transactions }) {
  const [stmtMonth, setStmtMonth] = useState(new Date().getMonth());
  const [stmtYear, setStmtYear] = useState(new Date().getFullYear());

  if (!card) return null;

  // Filter transactions for this card in the selected month
  const stmtTx = (transactions || [])
    .filter(t => t.cardId === card.id && t.type === 'expense' && t.date)
    .filter(t => {
      const [y, m] = t.date.split('-');
      return parseInt(y) === stmtYear && parseInt(m) === stmtMonth + 1;
    })
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const total = stmtTx.reduce((s, t) => s + (t.value || 0), 0);

  const changeStmtMonth = (delta) => {
    let m = stmtMonth + delta, y = stmtYear;
    if (m > 11) { m = 0; y++; }
    if (m < 0) { m = 11; y--; }
    setStmtMonth(m);
    setStmtYear(y);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt size={18} className="text-primary" /> Extrato: {card.name}
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-between mb-3">
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
                <div className="w-8 h-8 rounded gradient-red flex items-center justify-center text-xs font-bold text-red-700 shrink-0">
                  {(t.description || '?')[0].toUpperCase()}
                </div>
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
  const [darkMode, setDarkMode] = useState(() => document.documentElement.getAttribute('data-theme') === 'dark');
  const [showCardModal, setShowCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const { data: cards = [] } = useCards();
  const [rules, setRules] = useState(getRules());
  const [extraCats, setExtraCats] = useState(getExtraCats());
  const [salaryConfig, setSalaryConfig] = useState(getSalaryConfig());
  const [importMsg, setImportMsg] = useState('');
  const [showChangelog, setShowChangelog] = useState(false);
  const [customPMs, setCustomPMs] = useState(getCustomPaymentMethods());
  const [showPMModal, setShowPMModal] = useState(false);
  const [newPM, setNewPM] = useState('');
  const [templates, setTemplates] = useState(getTemplates());
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showCardStatement, setShowCardStatement] = useState(null);
  const [activeTab, setActiveTab] = useState('personalizacao');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearStep, setClearStep] = useState('');
  const [clearProgress, setClearProgress] = useState(0);
  const [confirmText, setConfirmText] = useState('');

  const TABS = [
    { id: 'personalizacao', label: 'Personalização', icon: '🎨' },
    { id: 'automacao', label: 'Automação', icon: '⚡' },
    { id: 'backup', label: 'Backup & Dados', icon: '💾' },
  ];

  const { data: transactions = [] } = useTransactions(500);
  const { data: budgets = [] } = useBudgets();
  const { data: goals = [] } = useGoals();

  const allCategories = [...DEFAULT_CATEGORIES, ...extraCats];

  // ── Theme ──
  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    lsSet('theme', next ? 'dark' : 'light');
  };

  // ── Cards ──
  const handleSaveCard = (data) => {
    if (editingCard) updateCard(editingCard.id, data); else addCard(data);
    setShowCardModal(false); setEditingCard(null);
  };
  const handleDeleteCard = (id) => { deleteCard(id); };

  // ── Categories ──
  const handleAddCategory = () => {
    if (newCategory.trim() && !allCategories.includes(newCategory.trim())) {
      const updated = [...extraCats, newCategory.trim()];
      saveExtraCats(updated); setExtraCats(updated); setNewCategory('');
    }
  };
  const handleRemoveCategory = (cat) => {
    if (DEFAULT_CATEGORIES.includes(cat)) return;
    const updated = extraCats.filter(c=>c!==cat);
    saveExtraCats(updated); setExtraCats(updated);
  };

  // ── Rules ──
  const handleSaveRule = (data) => { addRule(data); setRules(getRules()); setShowRuleModal(false); };
  const handleDeleteRule = (id) => { deleteRule(id); setRules(getRules()); };

  // ── Salary ──
  const handleSaveSalary = () => { saveSalaryConfig(salaryConfig); };

  // ── Export ──
  const handleExportCSV = () => {
    if (!transactions.length) return;
    const header = 'Data,Descrição,Tipo,Valor,Categoria,Pagamento,Fixo,Observações\n';
    const rows = transactions.map(t=>[t.date,`"${(t.description||'').replace(/"/g,'""')}"`,t.type,t.value,t.category||'',t.paymentMethod||'',t.isFixed?'Sim':'Não',`"${(t.notes||'').replace(/"/g,'""')}"`].join(',')).join('\n');
    const blob = new Blob(['\ufeff'+header+rows],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`lumen_transacoes_${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const data = { version:1, exportedAt:new Date().toISOString(), transactions, budgets, goals, cards, categories:getExtraCats(), rules:getRules(), salaryConfig:getSalaryConfig(), changelog:getChangelog() };
    const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`lumen_backup_${new Date().toISOString().split('T')[0]}.json`; a.click(); URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      doc.setFontSize(18); doc.text('Lúmen — Relatório Financeiro',14,22);
      doc.setFontSize(10); doc.setTextColor(100); doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`,14,30);
      const income = transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.value,0);
      const expense = transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.value,0);
      doc.setFontSize(12); doc.setTextColor(0);
      doc.text(`Receitas: ${formatCurrency(income)}  |  Despesas: ${formatCurrency(expense)}  |  Saldo: ${formatCurrency(income-expense)}`,14,42);
      let y=50; doc.setFontSize(9);
      transactions.slice(0,60).forEach(t=>{
        if(y>270){doc.addPage();y=20;}
        doc.text(`${(t.date||'').split('-').reverse().join('/')}  ${(t.description||'').substring(0,30).padEnd(32)}  ${t.type==='income'?'Receita':t.type==='expense'?'Despesa':'Invest.'}  ${formatCurrency(t.value)}`,14,y);
        y+=6;
      });
      doc.save(`lumen_relatorio_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch(e){ console.error('PDF error:',e); }
  };

  const handleImportJSON = (e) => {
    const file = e.target.files?.[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if(data.cards) { for (const c of data.cards) addCard(c); }
        if(data.categories) { saveExtraCats(data.categories); setExtraCats(getExtraCats()); }
        if(data.rules) { saveRules(data.rules); setRules(getRules()); }
        if(data.salaryConfig) { saveSalaryConfig(data.salaryConfig); setSalaryConfig(getSalaryConfig()); }
        if(data.changelog) lsSet('changelog', data.changelog);
        setImportMsg('Backup restaurado com sucesso! Atualize a página para ver os dados do Base44.');
        setTimeout(()=>setImportMsg(''),5000);
      } catch { setImportMsg('Erro ao importar. Verifique o formato JSON.'); setTimeout(()=>setImportMsg(''),3000); }
    };
    reader.readAsText(file); e.target.value='';
  };

  const changelog = getChangelog();

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Cartões, categorias, regras, backup e preferências</p>
        </div>
        <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
          <Sun size={14} className={cn("transition-colors",!darkMode?'text-amber-500':'text-muted-foreground')}/>
          <Switch checked={darkMode} onCheckedChange={toggleTheme}/>
          <Moon size={14} className={cn("transition-colors",darkMode?'text-blue-400':'text-muted-foreground')}/>
        </div>
      </div>

      {importMsg && (
        <div className={cn("flex items-center gap-2 p-3 rounded text-sm font-medium",importMsg.includes('sucesso')?'bg-emerald-50 text-emerald-700 border border-emerald-200':'bg-red-50 text-red-700 border border-red-200')}>
          {importMsg.includes('sucesso')?<Check size={16}/>:<AlertCircle size={16}/>}{importMsg}
        </div>
      )}

      {/* Tab Navigation (BACKLOG-22) */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded text-sm font-medium transition-all duration-200",
              activeTab === tab.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab: Personalização */}
      {activeTab === 'personalizacao' && <>
      {/* ── Credit Cards ── */}
      <Section icon={CreditCard} title="Cartões de Crédito" actions={<Button size="sm" variant="outline" onClick={()=>{setEditingCard(null);setShowCardModal(true);}}><Plus size={12} className="mr-1"/>Novo Cartão</Button>}>
        {cards.length===0?<p className="text-muted-foreground text-sm text-center py-4">Nenhum cartão cadastrado</p>:(
          <div className="space-y-2">
            {cards.map(c=>(
              <div key={c.id} className="flex items-center gap-3 p-3 rounded border border-border/60 hover:bg-muted/40 hover:shadow-card transition-all duration-200 group/card">
                <div className="w-12 h-8 rounded flex items-center justify-center text-white text-xs font-bold shadow-sm" style={{background:`linear-gradient(135deg, ${c.color}, ${c.color}cc)`}}>
                  {c.brand==='visa'?'VISA':c.brand==='mastercard'?'MC':c.brand==='elo'?'ELO':c.brand==='amex'?'AMEX':'CC'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{c.name}</p>
                  <p className="text-xs text-muted-foreground">Limite: {formatCurrency(c.limit)} · Fecha dia {c.closingDay} · Vence dia {c.dueDay}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                  <button onClick={()=>setShowCardStatement(c)} className="p-1.5 hover:bg-muted rounded text-muted-foreground" title="Extrato" aria-label="Visualizar extrato"><Receipt size={12}/></button>
                  <button onClick={()=>{setEditingCard(c);setShowCardModal(true);}} className="p-1.5 hover:bg-muted rounded text-muted-foreground" aria-label="Editar cartão"><Pencil size={12}/></button>
                  <button onClick={()=>handleDeleteCard(c.id)} className="p-1.5 hover:bg-red-50 rounded text-red-400" aria-label="Excluir cartão"><Trash2 size={12}/></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Categories ── */}
      <Section icon={Tag} title="Categorias Personalizadas">
        <div className="flex gap-2 mb-3">
          <Input value={newCategory} onChange={e=>setNewCategory(e.target.value)} placeholder="Nova categoria..." className="h-8 text-sm" onKeyDown={e=>e.key==='Enter'&&handleAddCategory()}/>
          <Button size="sm" className="h-8" onClick={handleAddCategory}>Adicionar</Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {allCategories.map(cat=>(
            <Badge key={cat} variant="secondary" className="gap-1 pr-1">
              <span className="w-2 h-2 rounded-full" style={{background:CAT_COLORS[cat]||'#94a3b8'}}/>{cat}
              {!DEFAULT_CATEGORIES.includes(cat)&&<button onClick={()=>handleRemoveCategory(cat)} className="ml-1 hover:text-destructive" aria-label={"Remover "+cat}><X size={10}/></button>}
            </Badge>
          ))}
        </div>
      </Section>
      </>}

      {/* Tab: Automação */}
      {activeTab === 'automacao' && <>
      {/* ── Rules ── */}
      <Section icon={Wand2} title="Regras de Categorização Automática" actions={<Button size="sm" variant="outline" onClick={()=>setShowRuleModal(true)}><Plus size={12} className="mr-1"/>Nova Regra</Button>}>
        <p className="text-xs text-muted-foreground mb-3">Quando uma transação contiver a palavra-chave, será categorizada automaticamente.</p>
        {rules.length===0?<p className="text-muted-foreground text-sm text-center py-3">Nenhuma regra cadastrada</p>:(
          <div className="space-y-1.5">
            {rules.map(r=>(
              <div key={r.id} className="flex items-center gap-3 p-2 rounded border border-border text-sm">
                <Wand2 size={14} className="text-muted-foreground shrink-0"/>
                <span className="font-medium flex-1">"{r.keyword}"</span>
                <span className="text-muted-foreground">→</span>
                <Badge variant="outline">{r.category}</Badge>
                <button onClick={()=>handleDeleteRule(r.id)} className="p-1 hover:bg-red-50 rounded text-red-400" aria-label="Excluir regra"><Trash2 size={12}/></button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Salary ── */}
      <Section icon={DollarSign} title="Configuração de Salário">
        <div className="grid grid-cols-3 gap-3 items-end">
          <div><Label className="text-xs">Valor do Salário (R$)</Label><Input type="number" min="0" step="0.01" value={salaryConfig.value} onChange={e=>setSalaryConfig(p=>({...p,value:parseFloat(e.target.value)||0}))} className="mt-1 h-8 text-sm"/></div>
          <div><Label className="text-xs">Dia do Pagamento</Label><Input type="number" min="1" max="31" value={salaryConfig.day} onChange={e=>setSalaryConfig(p=>({...p,day:parseInt(e.target.value)||5}))} className="mt-1 h-8 text-sm"/></div>
          <Button size="sm" className="h-8" onClick={handleSaveSalary}>Salvar</Button>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Switch checked={salaryConfig.autoGenerate} onCheckedChange={v=>setSalaryConfig(p=>({...p,autoGenerate:v}))}/>
          <Label className="text-sm font-normal">Gerar receita de salário automaticamente todo mês</Label>
        </div>
      </Section>

      {/* ── Payment Methods (BACKLOG-10) ── */}
      <Section icon={Wallet} title="Meios de Pagamento" actions={<Button size="sm" variant="outline" onClick={()=>setShowPMModal(true)}><Plus size={12} className="mr-1"/>Novo</Button>}>
        <p className="text-xs text-muted-foreground mb-3">Formas de pagamento padrão: Débito, Dinheiro, Pix, Transferência, Crédito. Adicione as suas.</p>
        {customPMs.length===0?<p className="text-muted-foreground text-sm text-center py-3">Nenhum meio personalizado</p>:(
          <div className="space-y-1.5">
            {customPMs.map((pm,i)=>(
              <div key={i} className="flex items-center gap-3 p-2 rounded border border-border text-sm">
                <Wallet size={14} className="text-muted-foreground shrink-0"/>
                <span className="font-medium flex-1">{pm}</span>
                <button onClick={()=>{const updated=customPMs.filter((_,idx)=>idx!==i);saveCustomPaymentMethods(updated);setCustomPMs(updated);}} className="p-1 hover:bg-red-50 rounded text-red-400" aria-label="Excluir meio de pagamento"><Trash2 size={12}/></button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Templates (BACKLOG-11) ── */}
      <Section icon={Layers} title="Templates de Transação" actions={<Button size="sm" variant="outline" onClick={()=>{setEditingTemplate(null);setShowTemplateModal(true);}}><Plus size={12} className="mr-1"/>Novo</Button>}>
        <p className="text-xs text-muted-foreground mb-3">Modelos para lançamentos recorrentes. Use no Quick Entry ou gere automaticamente.</p>
        {templates.length===0?<p className="text-muted-foreground text-sm text-center py-3">Nenhum template cadastrado</p>:(
          <div className="space-y-1.5">
            {templates.map(t=>(
              <div key={t.id} className="flex items-center gap-3 p-3 rounded border border-border/60 hover:bg-muted/40 transition-all duration-200 group/tpl">
                <div className={cn("w-9 h-9 rounded flex items-center justify-center text-xs font-bold shrink-0 shadow-sm",
                  t.type==='income'?'gradient-emerald text-emerald-700':'gradient-red text-red-700')}>
                  {(t.description||'?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{t.description}</p>
                  <p className="text-xs text-muted-foreground">{t.category} · {t.paymentMethod}</p>
                </div>
                <span className={cn("text-sm font-bold shrink-0",t.type==='income'?'text-emerald-600':'text-red-500')}>
                  {t.type==='income'?'+':'-'}{formatCurrency(t.value)}
                </span>
                <div className="flex gap-1 opacity-0 group-hover/tpl:opacity-100 transition-opacity">
                  <button onClick={()=>{setEditingTemplate(t);setShowTemplateModal(true);}} className="p-1.5 hover:bg-muted rounded text-muted-foreground" aria-label="Editar template"><Pencil size={12}/></button>
                  <button onClick={()=>{deleteTemplate(t.id);setTemplates(getTemplates());syncTemplatesToCloud(base44);}} className="p-1.5 hover:bg-red-50 rounded text-red-400" aria-label="Excluir template"><Trash2 size={12}/></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
      </>}

      {/* Tab: Backup & Dados */}
      {activeTab === 'backup' && <>
      {/* ── Cloud Sync Setup ── */}
      <Section icon={Cloud} title="Sincronização na Nuvem">
        <p className="text-xs text-muted-foreground mb-3">Seus dados são sincronizados automaticamente via entidades Base44 (Card, Rule, Template, Setting).</p>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="text-xs" onClick={async()=>{
            setImportMsg('Testando entidades...');
            try {
              const { lumenSetup } = await import('@/lib/entitySetup');
              const status = await lumenSetup.run();
              const ok = Object.values(status).every(v => v.exists);
              setImportMsg(ok ? 'Todas as entidades OK!' : 'Algumas entidades falharam. Verifique o console.');
            } catch(e) { setImportMsg('Erro: ' + e.message); }
            setTimeout(()=>setImportMsg(''),5000);
          }}>
            <Cloud size={12} className="mr-1"/>Testar Entidades
          </Button>
          <Button size="sm" variant="outline" className="text-xs" onClick={async()=>{
            setImportMsg('Migrando para entidades próprias...');
            try {
              const { lumenSetup } = await import('@/lib/entitySetup');
              const result = await lumenSetup.migrateToEntities();
              const total = result.cards + result.rules + result.templates + result.settings;
              setImportMsg(result.errors.length
                ? `Migrados: ${total}. Erros: ${result.errors.join(', ')}`
                : `Migrado! ${result.cards} cartões, ${result.rules} regras, ${result.templates} templates, ${result.settings} configs.`
              );
            } catch(e) { setImportMsg('Erro: ' + e.message); }
            setTimeout(()=>setImportMsg(''),8000);
          }}>
            <Wand2 size={12} className="mr-1"/>Migrar para Entidades
          </Button>
        </div>
      </Section>

      {/* ── Export / Import ── */}
      <Section icon={Download} title="Exportar / Importar Dados">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={handleExportCSV}><FileText size={12} className="mr-1"/>CSV Transações</Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={handleExportPDF}><FileText size={12} className="mr-1"/>PDF Relatório</Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={handleExportJSON}><Download size={12} className="mr-1"/>Backup JSON</Button>
          <label className="inline-flex">
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" id="import-json-settings"/>
            <Button variant="outline" size="sm" className="text-xs w-full" asChild><label htmlFor="import-json-settings" className="cursor-pointer inline-flex items-center justify-center"><Upload size={12} className="mr-1"/>Restaurar Backup</label></Button>
          </label>
        </div>
      </Section>

      {/* ── Changelog ── */}
      <Section icon={History} title="Histórico de Alterações">
        <Button size="sm" variant="outline" className="text-xs mb-3" onClick={()=>setShowChangelog(!showChangelog)}>
          {showChangelog?<ChevronDown size={12} className="mr-1"/>:<ChevronRight size={12} className="mr-1"/>}
          {showChangelog?'Ocultar':'Ver'} Histórico ({changelog.length})
        </Button>
        {showChangelog&&(
          <div className="max-h-[300px] overflow-y-auto space-y-1.5">
            {changelog.length===0?<p className="text-muted-foreground text-sm text-center py-3">Nenhuma alteração registrada</p>:
              changelog.slice(0,100).map(l=>(
                <div key={l.id} className="flex items-start gap-2 p-2 rounded border border-border text-xs">
                  <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",l.action==='create'?'bg-emerald-500':l.action==='update'?'bg-blue-500':'bg-red-500')}/>
                  <div className="flex-1">
                    <p><span className="font-semibold capitalize">{l.action==='create'?'Criou':l.action==='update'?'Editou':'Deletou'}</span> <span className="text-muted-foreground">{l.entityType}</span>{l.entityName&&<span className="font-medium"> — {l.entityName}</span>}</p>
                    <p className="text-muted-foreground">{new Date(l.timestamp).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              ))
            }
          </div>
        )}
      </Section>

      {/* ── Danger Zone: Clear All Data ── */}
      <Section icon={Trash2} title="Limpar Todos os Dados">
        <p className="text-xs text-muted-foreground mb-3">
          Remove todas as transações, metas, orçamentos, cartões, regras e configurações.
          <strong className="text-red-600"> Esta ação é irreversível.</strong> Faça um backup antes.
        </p>
        <Button
          size="sm"
          variant="destructive"
          className="text-xs"
          onClick={() => setShowClearConfirm(true)}
        >
          <Trash2 size={12} className="mr-1"/> Limpar Tudo
        </Button>
      </Section>
      </>}

      {/* ── Modals ── */}
      <CardModal open={showCardModal} onClose={()=>{setShowCardModal(false);setEditingCard(null);}} onSave={handleSaveCard} card={editingCard}/>
      <RuleModal open={showRuleModal} onClose={()=>setShowRuleModal(false)} onSave={handleSaveRule}/>

      {/* Payment Method Modal */}
      <Dialog open={showPMModal} onOpenChange={setShowPMModal}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>Novo Meio de Pagamento</DialogTitle></DialogHeader>
          <div>
            <Label>Nome</Label>
            <Input value={newPM} onChange={e=>setNewPM(e.target.value)} className="mt-1" placeholder="Ex: Vale Refeição..." onKeyDown={e=>{
              if(e.key==='Enter'&&newPM.trim()){
                const updated=[...customPMs,newPM.trim()];
                saveCustomPaymentMethods(updated);
                setCustomPMs(updated);
                setNewPM('');
                setShowPMModal(false);
              }
            }}/>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={()=>{setShowPMModal(false);setNewPM('');}}>Cancelar</Button>
            <Button className="flex-1" onClick={()=>{
              if(newPM.trim()){
                const updated=[...customPMs,newPM.trim()];
                saveCustomPaymentMethods(updated);
                setCustomPMs(updated);
                setNewPM('');
                setShowPMModal(false);
              }
            }}>Adicionar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Modal */}
      <TemplateModal open={showTemplateModal} onClose={()=>{setShowTemplateModal(false);setEditingTemplate(null);}} onSave={async (data)=>{
        if(editingTemplate){
          const tpls=getTemplates().map(t=>t.id===editingTemplate.id?{...t,...data}:t);
          saveTemplates(tpls);
        } else {
          addTemplate(data);
        }
        setTemplates(getTemplates());
        setShowTemplateModal(false);
        setEditingTemplate(null);
        syncTemplatesToCloud(base44);
      }} template={editingTemplate}/>

      {/* Card Statement Modal */}
      <CardStatementModal open={!!showCardStatement} onClose={()=>setShowCardStatement(null)} card={showCardStatement} transactions={transactions}/>

      {/* Clear All Data Confirmation — two-step */}
      <Dialog open={showClearConfirm} onOpenChange={(v) => { if (!clearing) { setShowClearConfirm(v); setConfirmText(''); setClearStep(''); setClearProgress(0); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle size={18} /> Limpar Todos os Dados
            </DialogTitle>
          </DialogHeader>

          {!clearing && !clearStep && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Isso vai <strong>apagar permanentemente</strong>:
              </p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Todas as transações</li>
                <li>• Todas as metas</li>
                <li>• Todos os orçamentos</li>
                <li>• Todos os cartões</li>
                <li>• Todas as regras de categorização</li>
                <li>• Todas as configurações</li>
                <li>• Dados sincronizados na nuvem</li>
              </ul>
              <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300">
                <strong>⚠️ Esta ação é irreversível.</strong> Recomendamos fazer um backup JSON antes de continuar.
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Digite <strong>EXCLUIR TUDO</strong> para continuar:</Label>
                <Input
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder="EXCLUIR TUDO"
                  className="h-8 text-sm"
                  onKeyDown={e => { if (e.key === 'Enter' && confirmText === 'EXCLUIR TUDO') { setConfirmText(''); } }}
                />
                <p className="text-[11px] text-muted-foreground">Esta ação é irreversível e apagará todos os seus dados permanentemente.</p>
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => { setShowClearConfirm(false); setConfirmText(''); }}>Cancelar</Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={confirmText !== 'EXCLUIR TUDO'}
                  onClick={async () => {
                    setClearing(true);
                    setClearProgress(0);
                    try {
                      const result = await clearAllData(base44, (step, total, label) => {
                        setClearProgress(Math.round((step / total) * 100));
                        setClearStep(label);
                      });
                      setClearStep('Concluído!');
                      addChangelogEntry({ action: 'delete', entityType: 'todos os dados', entityName: 'Limpeza completa' });
                      const entitySummary = Object.entries(result.entities)
                        .filter(([, v]) => v.deleted > 0)
                        .map(([k, v]) => `${v.deleted} ${k}`)
                        .join(', ');
                      const hasCloudErrors = result.errors.length > 0;
                      let msg = `Cache limpo: ${result.localStorage.cleared} chaves.`;
                      if (entitySummary) msg = `Dados removidos: ${entitySummary}. ${msg}`;
                      if (hasCloudErrors) {
                        msg += ` ⚠️ ${result.errors.length} item(s) pode(m) não ter sido removido(s) da nuvem.`;
                      }
                      setImportMsg(msg + ' Atualize a página.');
                      setTimeout(() => window.location.reload(), 2500);
                    } catch (e) {
                      setImportMsg('Erro ao limpar dados: ' + e.message);
                      setClearStep('');
                    }
                    setClearing(false);
                  }}
                >
                  Confirmar limpeza
                </Button>
              </div>
            </div>
          )}

          {clearing && (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">{clearStep}</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full transition-all duration-300"
                  style={{ width: `${clearProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">{clearProgress}%</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}