import React, { useState } from 'react';
import { Wand2, DollarSign, Wallet, Layers, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/financeUtils';
import { getCategories } from '@/lib/categories';
import { getCustomPaymentMethods, saveCustomPaymentMethods, getTemplates, saveTemplates, addTemplate, deleteTemplate, syncTemplatesToCloud } from '@/lib/store';

// ═══ Section wrapper ═══
function Section({ icon: Icon, title, children, actions }) {
  return (
    <div className="rounded border border-border/60 bg-card shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded bg-primary/10"><Icon size={16} className="text-primary" /></div>
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default function TabAutomacao({ rules, salaryConfig, setSalaryConfig, onSaveSalary, onDeleteRule, onNewRule }) {
  const [customPMs, setCustomPMs] = useState(getCustomPaymentMethods());
  const [showPMModal, setShowPMModal] = useState(false);
  const [newPM, setNewPM] = useState('');
  const [templates, setTemplates] = useState(getTemplates());
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  return (
    <>
      {/* ── Rules ── */}
      <Section icon={Wand2} title="Regras de Categorização Automática" actions={<Button size="sm" variant="outline" onClick={onNewRule}><Plus size={12} className="mr-1" />Nova Regra</Button>}>
        <p className="text-xs text-muted-foreground mb-3">Quando uma transação contiver a palavra-chave, será categorizada automaticamente.</p>
        {rules.length === 0 ? <p className="text-muted-foreground text-sm text-center py-3">Nenhuma regra cadastrada</p> : (
          <div className="space-y-1.5">
            {rules.map(r => (
              <div key={r.id} className="flex items-center gap-3 p-2 rounded border border-border text-sm">
                <Wand2 size={14} className="text-muted-foreground shrink-0" />
                <span className="font-medium flex-1">"{r.keyword}"</span>
                <span className="text-muted-foreground">→</span>
                <Badge variant="outline">{r.category}</Badge>
                <button onClick={() => onDeleteRule(r.id)} className="p-1 hover:bg-red-50 rounded text-red-400" aria-label="Excluir regra"><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Salary ── */}
      <Section icon={DollarSign} title="Configuração de Renda">
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Tipo de Renda</Label>
            <Select
              value={salaryConfig.incomeType || 'clt'}
              onValueChange={(v) => setSalaryConfig(p => ({ ...p, incomeType: v }))}
            >
              <SelectTrigger className="mt-1 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="clt">CLT — Salário fixo mensal</SelectItem>
                <SelectItem value="freelancer">Autônomo / Freelancer</SelectItem>
                <SelectItem value="entrepreneur">Empresário / Sócio</SelectItem>
                <SelectItem value="investor">Investidor</SelectItem>
                <SelectItem value="multiple">Múltiplas fontes de renda</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <Label className="text-xs">
                {salaryConfig.incomeType === 'clt' || !salaryConfig.incomeType
                  ? 'Salário Bruto Mensal (R$)'
                  : 'Referência de Renda Mensal (R$)'}
              </Label>
              <Input type="number" min="0" step="100" value={salaryConfig.value} onChange={e => setSalaryConfig(p => ({ ...p, value: parseFloat(e.target.value) || 0 }))} className="mt-1 h-8 text-sm" />
              {salaryConfig.incomeType && salaryConfig.incomeType !== 'clt' && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Para renda variável, este valor serve de referência para calcular sua taxa de poupança.
                </p>
              )}
            </div>
            <div><Label className="text-xs">Dia do Pagamento</Label><Input type="number" min="1" max="31" value={salaryConfig.day} onChange={e => setSalaryConfig(p => ({ ...p, day: parseInt(e.target.value) || 5 }))} className="mt-1 h-8 text-sm" /></div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={salaryConfig.autoGenerate} onCheckedChange={v => setSalaryConfig(p => ({ ...p, autoGenerate: v }))} />
            <Label className="text-sm font-normal">Gerar receita automaticamente todo mês</Label>
          </div>
          <Button size="sm" className="h-8" onClick={onSaveSalary}>Salvar</Button>
        </div>
      </Section>

      {/* ── Payment Methods ── */}
      <Section icon={Wallet} title="Meios de Pagamento" actions={<Button size="sm" variant="outline" onClick={() => setShowPMModal(true)}><Plus size={12} className="mr-1" />Novo</Button>}>
        <p className="text-xs text-muted-foreground mb-3">Formas de pagamento padrão: Débito, Dinheiro, Pix, Transferência, Crédito. Adicione as suas.</p>
        {customPMs.length === 0 ? <p className="text-muted-foreground text-sm text-center py-3">Nenhum meio personalizado</p> : (
          <div className="space-y-1.5">
            {customPMs.map((pm, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded border border-border text-sm">
                <Wallet size={14} className="text-muted-foreground shrink-0" />
                <span className="font-medium flex-1">{pm}</span>
                <button onClick={() => { const updated = customPMs.filter((_, idx) => idx !== i); saveCustomPaymentMethods(updated); setCustomPMs(updated); }} className="p-1 hover:bg-red-50 rounded text-red-400" aria-label="Excluir meio de pagamento"><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Templates ── */}
      <Section icon={Layers} title="Templates de Transação" actions={<Button size="sm" variant="outline" onClick={() => { setEditingTemplate(null); setShowTemplateModal(true); }}><Plus size={12} className="mr-1" />Novo</Button>}>
        <p className="text-xs text-muted-foreground mb-3">Modelos para lançamentos recorrentes. Use no Quick Entry ou gere automaticamente.</p>
        {templates.length === 0 ? <p className="text-muted-foreground text-sm text-center py-3">Nenhum template cadastrado</p> : (
          <div className="space-y-1.5">
            {templates.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded border border-border/60 hover:bg-muted/40 transition-all duration-200 group/tpl">
                <div className={cn("w-9 h-9 rounded flex items-center justify-center text-xs font-bold shrink-0 shadow-sm",
                  t.type === 'income' ? 'gradient-emerald text-emerald-700' : 'gradient-red text-red-700')}>
                  {(t.description || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{t.description}</p>
                  <p className="text-xs text-muted-foreground">{t.category} · {t.paymentMethod}</p>
                </div>
                <span className={cn("text-sm font-bold shrink-0", t.type === 'income' ? 'text-emerald-600' : 'text-red-500')}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.value)}
                </span>
                <div className="flex gap-1 opacity-0 group-hover/tpl:opacity-100 transition-opacity">
                  <button onClick={() => { setEditingTemplate(t); setShowTemplateModal(true); }} className="p-1.5 hover:bg-muted rounded text-muted-foreground" aria-label="Editar template"><Pencil size={12} /></button>
                  <button onClick={() => { deleteTemplate(t.id); setTemplates(getTemplates()); syncTemplatesToCloud(); }} className="p-1.5 hover:bg-red-50 rounded text-red-400" aria-label="Excluir template"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Payment Method Modal ── */}
      <Dialog open={showPMModal} onOpenChange={setShowPMModal}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>Novo Meio de Pagamento</DialogTitle></DialogHeader>
          <div>
            <Label>Nome</Label>
            <Input value={newPM} onChange={e => setNewPM(e.target.value)} className="mt-1" placeholder="Ex: Vale Refeição..." onKeyDown={e => {
              if (e.key === 'Enter' && newPM.trim()) {
                const updated = [...customPMs, newPM.trim()];
                saveCustomPaymentMethods(updated); setCustomPMs(updated); setNewPM(''); setShowPMModal(false);
              }
            }} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => { setShowPMModal(false); setNewPM(''); }}>Cancelar</Button>
            <Button className="flex-1" onClick={() => {
              if (newPM.trim()) {
                const updated = [...customPMs, newPM.trim()];
                saveCustomPaymentMethods(updated); setCustomPMs(updated); setNewPM(''); setShowPMModal(false);
              }
            }}>Adicionar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Template Modal ── */}
      <TemplateModal open={showTemplateModal} onClose={() => { setShowTemplateModal(false); setEditingTemplate(null); }} onSave={async (data) => {
        if (editingTemplate) {
          const tpls = getTemplates().map(t => t.id === editingTemplate.id ? { ...t, ...data } : t);
          saveTemplates(tpls);
        } else {
          addTemplate(data);
        }
        setTemplates(getTemplates());
        setShowTemplateModal(false);
        setEditingTemplate(null);
        syncTemplatesToCloud();
      }} template={editingTemplate} />
    </>
  );
}

// ═══ Template Modal ═══
function TemplateModal({ open, onClose, onSave, template }) {
  const [form, setForm] = useState({ description: '', value: '', category: '', paymentMethod: '', type: 'expense' });
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));
  const cats = getCategories();

  React.useEffect(() => {
    if (template) setForm({ description: template.description || '', value: template.value?.toString() || '', category: template.category || '', paymentMethod: template.paymentMethod || '', type: template.type || 'expense' });
    else setForm({ description: '', value: '', category: '', paymentMethod: '', type: 'expense' });
  }, [template, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{template ? 'Editar Template' : 'Novo Template'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Descrição</Label><Input value={form.description} onChange={e => set('description', e.target.value)} className="mt-1" placeholder="Ex: Aluguel, Netflix..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Valor (R$)</Label><Input type="number" min="0" step="0.01" value={form.value} onChange={e => set('value', e.target.value)} className="mt-1" /></div>
            <div><Label>Tipo</Label>
              <select value={form.type} onChange={e => set('type', e.target.value)} className="mt-1 w-full h-9 rounded border border-input bg-background px-2 text-sm">
                <option value="expense">Despesa</option>
                <option value="income">Receita</option>
              </select>
            </div>
          </div>
          <div><Label>Categoria</Label>
            <select value={form.category} onChange={e => set('category', e.target.value)} className="mt-1 w-full h-9 rounded border border-input bg-background px-2 text-sm">
              <option value="">Selecionar</option>
              {cats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><Label>Meio de Pagamento</Label><Input value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)} className="mt-1" placeholder="Ex: Pix, Crédito..." /></div>
        </div>
        <div className="flex gap-2 pt-2"><Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button><Button className="flex-1" onClick={() => onSave(form)}>{template ? 'Salvar' : 'Criar'}</Button></div>
      </DialogContent>
    </Dialog>
  );
}
