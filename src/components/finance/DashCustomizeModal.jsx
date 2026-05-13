import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GripVertical, Eye, EyeOff, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDashSections, saveDashSections } from '@/lib/store';

const DEFAULT_SECTIONS = [
  { id: 'resumo', label: 'Resumo (KPIs)', visible: true },
  { id: 'graficos', label: 'Gráficos', visible: true },
  { id: 'gastos', label: 'Gastos por Categoria', visible: true },
  { id: 'metas', label: 'Metas', visible: true },
  { id: 'parcelas', label: 'Parcelas Ativas', visible: true },
  { id: 'planejado', label: 'Planejado vs Real', visible: true },
  { id: 'previsao', label: 'Previsão', visible: true },
  { id: 'vencimentos', label: 'Próximos Vencimentos', visible: true },
  { id: 'patrimonio', label: 'Patrimônio Total', visible: true },
  { id: 'tendencia', label: 'Tendência vs Mês Anterior', visible: true },
];

export default function DashCustomizeModal({ open, onClose, onUpdate }) {
  const [sections, setSections] = useState([]);

  useEffect(() => {
    if (open) {
      const saved = getDashSections();
      // Merge with defaults to ensure new sections appear
      const safe = Array.isArray(saved) ? saved : [];
      const merged = DEFAULT_SECTIONS.map(def => {
        const found = safe.find(s => s.id === def.id);
        return found || { ...def };
      });
      setSections(merged);
    }
  }, [open]);

  const moveUp = (idx) => {
    if (idx <= 0) return;
    const next = [...sections];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setSections(next);
  };

  const moveDown = (idx) => {
    if (idx >= sections.length - 1) return;
    const next = [...sections];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    setSections(next);
  };

  const toggle = (idx) => {
    const next = [...sections];
    next[idx] = { ...next[idx], visible: !next[idx].visible };
    setSections(next);
  };

  const reset = () => {
    setSections(DEFAULT_SECTIONS.map(s => ({ ...s })));
  };

  const handleSave = () => {
    saveDashSections(sections);
    onUpdate?.(sections);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-primary">⚙️</span> Personalizar Dashboard
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">
          Escolha quais seções exibir e arraste para reordenar.
        </p>

        <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
          {sections.map((s, i) => (
            <div
              key={s.id}
              className={cn(
                "flex items-center gap-2 p-3 rounded border transition-all duration-150",
                s.visible
                  ? "bg-card border-border/60 shadow-sm"
                  : "bg-muted/30 border-border/30 opacity-60"
              )}
            >
              <GripVertical size={14} className="text-muted-foreground/50 shrink-0" />
              <span className={cn("flex-1 text-sm font-medium", !s.visible && "text-muted-foreground line-through")}>
                {s.label}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => moveUp(i)}
                  disabled={i === 0}
                  className="p-1 hover:bg-muted rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Mover para cima"
                >
                  <ArrowUp size={12} />
                </button>
                <button
                  onClick={() => moveDown(i)}
                  disabled={i === sections.length - 1}
                  className="p-1 hover:bg-muted rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Mover para baixo"
                >
                  <ArrowDown size={12} />
                </button>
                <button
                  onClick={() => toggle(i)}
                  className={cn(
                    "p-1.5 rounded transition-colors",
                    s.visible ? "hover:bg-muted text-foreground" : "hover:bg-muted text-muted-foreground"
                  )}
                  aria-label={s.visible ? 'Ocultar' : 'Mostrar'}
                >
                  {s.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={reset}>
            <RotateCcw size={12} className="mr-1" /> Restaurar Padrão
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Aplicar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}