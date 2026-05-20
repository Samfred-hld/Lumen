import React, { useState } from 'react';
import { CreditCard, Tag, Plus, Pencil, Trash2, Receipt, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/financeUtils';
import { CAT_COLORS, DEFAULT_CATEGORIES } from '@/lib/categories';
import { getExtraCats, saveExtraCats } from '@/lib/store';

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

export default function TabPersonalizacao({ cards, onEditCard, onDeleteCard, onShowStatement, onNewCard }) {
  const [newCategory, setNewCategory] = useState('');
  const [extraCats, setExtraCats] = useState(getExtraCats());
  const allCategories = [...DEFAULT_CATEGORIES, ...extraCats];

  const handleAddCategory = () => {
    if (newCategory.trim() && !allCategories.includes(newCategory.trim())) {
      const updated = [...extraCats, newCategory.trim()];
      saveExtraCats(updated); setExtraCats(updated); setNewCategory('');
    }
  };
  const handleRemoveCategory = (cat) => {
    if (DEFAULT_CATEGORIES.includes(cat)) return;
    const updated = extraCats.filter(c => c !== cat);
    saveExtraCats(updated); setExtraCats(updated);
  };

  return (
    <>
      {/* ── Credit Cards ── */}
      <Section icon={CreditCard} title="Cartões de Crédito" actions={<Button size="sm" variant="outline" onClick={onNewCard}><Plus size={12} className="mr-1" />Novo Cartão</Button>}>
        {cards.length === 0 ? <p className="text-muted-foreground text-sm text-center py-4">Nenhum cartão cadastrado</p> : (
          <div className="space-y-2">
            {cards.map(c => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded border border-border/60 hover:bg-muted/40 hover:shadow-card transition-all duration-200 group/card">
                <div className="w-12 h-8 rounded flex items-center justify-center text-white text-xs font-bold shadow-sm" style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}cc)` }}>
                  {c.brand === 'visa' ? 'VISA' : c.brand === 'mastercard' ? 'MC' : c.brand === 'elo' ? 'ELO' : c.brand === 'amex' ? 'AMEX' : 'CC'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{c.name}</p>
                  <p className="text-xs text-muted-foreground">Limite: {formatCurrency(c.limit)} · Fecha dia {c.closingDay} · Vence dia {c.dueDay}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                  <button onClick={() => onShowStatement(c)} className="p-1.5 hover:bg-muted rounded text-muted-foreground" title="Extrato" aria-label="Visualizar extrato"><Receipt size={12} /></button>
                  <button onClick={() => onEditCard(c)} className="p-1.5 hover:bg-muted rounded text-muted-foreground" aria-label="Editar cartão"><Pencil size={12} /></button>
                  <button onClick={() => onDeleteCard(c.id)} className="p-1.5 hover:bg-red-50 rounded text-red-400" aria-label="Excluir cartão"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Categories ── */}
      <Section icon={Tag} title="Categorias Personalizadas">
        <div className="flex gap-2 mb-3">
          <Input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Nova categoria..." className="h-8 text-sm" onKeyDown={e => e.key === 'Enter' && handleAddCategory()} />
          <Button size="sm" className="h-8" onClick={handleAddCategory}>Adicionar</Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {allCategories.map(cat => (
            <Badge key={cat} variant="secondary" className="gap-1 pr-1">
              <span className="w-2 h-2 rounded-full" style={{ background: CAT_COLORS[cat] || '#94a3b8' }} />{cat}
              {!DEFAULT_CATEGORIES.includes(cat) && <button onClick={() => handleRemoveCategory(cat)} className="ml-1 hover:text-destructive" aria-label={"Remover " + cat}><X size={10} /></button>}
            </Badge>
          ))}
        </div>
      </Section>
    </>
  );
}
