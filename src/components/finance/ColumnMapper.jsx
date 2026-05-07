import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Columns3 } from 'lucide-react';

/**
 * Manual column mapping UI for CSV imports when auto-detection fails.
 *
 * Props:
 *   headers: string[] — raw header names
 *   onApply: ({ dateIdx, descIdx, valIdx, creditIdx, debitIdx }) => void
 *   onCancel: () => void
 */
export default function ColumnMapper({ headers, onApply, onCancel }) {
  const [dateIdx, setDateIdx] = React.useState('-1');
  const [descIdx, setDescIdx] = React.useState('-1');
  const [valIdx, setValIdx] = React.useState('-1');
  const [mode, setMode] = React.useState('single'); // single | split
  const [creditIdx, setCreditIdx] = React.useState('-1');
  const [debitIdx, setDebitIdx] = React.useState('-1');

  const idxOptions = [
    { value: '-1', label: 'Não mapeado' },
    ...headers.map((h, i) => ({ value: String(i), label: `Col ${i + 1}: ${h || '(vazio)'}` })),
  ];

  const canApply = mode === 'single'
    ? parseInt(dateIdx) >= 0 && parseInt(descIdx) >= 0 && parseInt(valIdx) >= 0
    : parseInt(dateIdx) >= 0 && parseInt(descIdx) >= 0 && parseInt(creditIdx) >= 0 && parseInt(debitIdx) >= 0;

  const handleApply = () => {
    const mapping = {
      dateIdx: parseInt(dateIdx),
      descIdx: parseInt(descIdx),
    };
    if (mode === 'single') {
      mapping.valIdx = parseInt(valIdx);
    } else {
      mapping.creditIdx = parseInt(creditIdx);
      mapping.debitIdx = parseInt(debitIdx);
      mapping.valIdx = -1; // força hasSplitColumns no parseCSV
    }
    onApply(mapping);
  };

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Columns3 size={16} />
        Mapeamento Manual de Colunas
      </div>

      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded px-3 py-2 text-xs text-amber-700">
        <AlertTriangle size={13} />
        <span>Não foi possível detectar as colunas automaticamente. Mapeie manualmente abaixo.</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Date */}
        <div>
          <Label className="text-xs font-semibold">Data *</Label>
          <Select value={dateIdx} onValueChange={setDateIdx}>
            <SelectTrigger className="h-8 text-xs mt-1">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {idxOptions.map(o => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div>
          <Label className="text-xs font-semibold">Descrição *</Label>
          <Select value={descIdx} onValueChange={setDescIdx}>
            <SelectTrigger className="h-8 text-xs mt-1">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {idxOptions.map(o => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Value mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('single')}
          className={`px-3 py-1.5 rounded text-xs font-medium border transition-all ${
            mode === 'single'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-muted-foreground border-border hover:border-primary/50'
          }`}
        >
          Coluna única de valor
        </button>
        <button
          onClick={() => setMode('split')}
          className={`px-3 py-1.5 rounded text-xs font-medium border transition-all ${
            mode === 'split'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-muted-foreground border-border hover:border-primary/50'
          }`}
        >
          Crédito / Débito separados
        </button>
      </div>

      {mode === 'single' ? (
        <div>
          <Label className="text-xs font-semibold">Valor *</Label>
          <Select value={valIdx} onValueChange={setValIdx}>
            <SelectTrigger className="h-8 text-xs mt-1">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {idxOptions.map(o => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-semibold">Crédito (entradas) *</Label>
            <Select value={creditIdx} onValueChange={setCreditIdx}>
              <SelectTrigger className="h-8 text-xs mt-1">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {idxOptions.map(o => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-semibold">Débito (saídas) *</Label>
            <Select value={debitIdx} onValueChange={setDebitIdx}>
              <SelectTrigger className="h-8 text-xs mt-1">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {idxOptions.map(o => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={onCancel}>
          Cancelar
        </Button>
        <Button size="sm" className="flex-1 h-8 text-xs" onClick={handleApply} disabled={!canApply}>
          Aplicar mapeamento
        </Button>
      </div>
    </div>
  );
}
