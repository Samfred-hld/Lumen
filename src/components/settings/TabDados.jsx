import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/financeUtils';
import MsIcon from '@/components/ui/ms-icon';
import { getChangelog, addChangelogEntry, clearAllData, getExtraCats, getRules, getSalaryConfig, addCard, saveExtraCats, saveRules, saveSalaryConfig } from '@/lib/store';
import BackupSection from '@/components/settings/BackupSection';

// ═══ Section wrapper ═══
function Section({ icon, title, children, actions }) {
  return (
    <div className="rounded border border-border/60 bg-card shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded bg-primary/10"><MsIcon name={icon} size={16} className="text-primary" /></div>
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default function TabDados({ transactions, budgets, goals, cards, importMsg, setImportMsg }) {
  const [fixProgress, setFixProgress] = useState(null);
  const [fixResult, setFixResult] = useState(null);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearStep, setClearStep] = useState('');
  const [clearProgress, setClearProgress] = useState(0);
  const [confirmText, setConfirmText] = useState('');

  const changelog = getChangelog();

  const handleExportCSV = () => {
    if (!transactions.length) return;
    const header = 'Data,Descrição,Tipo,Valor,Categoria,Pagamento,Fixo,Observações\n';
    const rows = transactions.map(t => [t.date, `"${(t.description || '').replace(/"/g, '""')}"`, t.type, t.value, t.category || '', t.paymentMethod || '', t.isFixed ? 'Sim' : 'Não', `"${(t.notes || '').replace(/"/g, '""')}"`].join(',')).join('\n');
    const blob = new Blob(['\ufeff' + header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `lumen_transacoes_${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      doc.setFontSize(18); doc.text('Lúmen — Relatório Financeiro', 14, 22);
      doc.setFontSize(10); doc.setTextColor(100); doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);
      const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.value, 0);
      const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.value, 0);
      doc.setFontSize(12); doc.setTextColor(0);
      doc.text(`Receitas: ${formatCurrency(income)}  |  Despesas: ${formatCurrency(expense)}  |  Saldo: ${formatCurrency(income - expense)}`, 14, 42);
      let y = 50; doc.setFontSize(9);
      transactions.slice(0, 60).forEach(t => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(`${(t.date || '').split('-').reverse().join('/')}  ${(t.description || '').substring(0, 30).padEnd(32)}  ${t.type === 'income' ? 'Receita' : t.type === 'expense' ? 'Despesa' : 'Invest.'}  ${formatCurrency(t.value)}`, 14, y);
        y += 6;
      });
      doc.save(`lumen_relatorio_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) { console.error('PDF error:', e); }
  };


  return (
    <>
      {/* ── Export Dados ── */}
      <Section icon="download" title="Exportar Dados">
        <p className="text-xs text-muted-foreground mb-4">
          Exporte seu histórico em formato CSV (para Excel/Google Sheets) ou gere um relatório em PDF.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button variant="outline" size="sm" className="w-full justify-start bg-surface hover:bg-surface-low" onClick={handleExportCSV}>
            <MsIcon name="description" size={14} className="mr-2 text-emerald-600" /> CSV (Planilha)
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start bg-surface hover:bg-surface-low" onClick={handleExportPDF}>
            <MsIcon name="receipt" size={14} className="mr-2 text-red-600" /> PDF (Relatório Mensal)
          </Button>
        </div>
      </Section>

      {/* ── Backup e Restauração ── */}
      <Section icon="backup" title="Backup e Restauração">
        <p className="text-xs text-muted-foreground mb-4">
          Faça um backup completo dos seus dados em JSON ou restaure a partir de um arquivo de backup anterior.
        </p>
        <BackupSection transactions={transactions} budgets={budgets} goals={goals} cards={cards} />
      </Section>

      {/* ── Changelog ── */}
      <Section icon="history" title="Histórico de Alterações">
        <Button size="sm" variant="outline" className="text-xs mb-3" onClick={() => setShowChangelog(!showChangelog)}>
          {showChangelog ? <MsIcon name="expand_more" size={12} className="mr-1" /> : <MsIcon name="chevron_right" size={12} className="mr-1" />}
          {showChangelog ? 'Ocultar' : 'Ver'} Histórico ({changelog.length})
        </Button>
        {showChangelog && (
          <div className="max-h-[300px] overflow-y-auto space-y-1.5">
            {changelog.length === 0 ? <p className="text-muted-foreground text-sm text-center py-3">Nenhuma alteração registrada</p> :
              changelog.slice(0, 100).map(l => (
                <div key={l.id} className="flex items-start gap-2 p-2 rounded border border-border text-xs">
                  <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", l.action === 'create' ? 'bg-emerald-500' : l.action === 'update' ? 'bg-blue-500' : 'bg-red-500')} />
                  <div className="flex-1">
                    <p><span className="font-semibold capitalize">{l.action === 'create' ? 'Criou' : l.action === 'update' ? 'Editou' : 'Deletou'}</span> <span className="text-muted-foreground">{l.entityType}</span>{l.entityName && <span className="font-medium"> — {l.entityName}</span>}</p>
                    <p className="text-muted-foreground">{new Date(l.timestamp).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              ))
            }
          </div>
        )}
      </Section>

      {/* ── Danger Zone ── */}
      <Section icon="delete" title="Limpar Todos os Dados">
        <p className="text-xs text-muted-foreground mb-3">
          Remove todas as transações, metas, orçamentos, cartões, regras e configurações.
          <strong className="text-red-600"> Esta ação é irreversível.</strong> Faça um backup antes.
        </p>
        <Button size="sm" variant="destructive" className="text-xs" onClick={() => setShowClearConfirm(true)}>
          <MsIcon name="delete" size={12} className="mr-1" /> Limpar Tudo
        </Button>
      </Section>

      {/* ── Clear Confirmation Dialog ── */}
      <Dialog open={showClearConfirm} onOpenChange={(v) => { if (!clearing) { setShowClearConfirm(v); setConfirmText(''); setClearStep(''); setClearProgress(0); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <MsIcon name="error" size={18} /> Limpar Todos os Dados
            </DialogTitle>
          </DialogHeader>
          {!clearing && !clearStep && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Isso vai <strong>apagar permanentemente</strong>:</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Todas as transações</li><li>• Todas as metas</li><li>• Todos os orçamentos</li>
                <li>• Todos os cartões</li><li>• Todas as regras</li><li>• Todas as configurações locais</li>
              </ul>
              <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-700">
                <strong><MsIcon name="warning" size={14} className="align-middle mr-1 text-amber-500" />Esta ação é irreversível.</strong> Recomendamos fazer um backup JSON antes.
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Digite <strong>EXCLUIR TUDO</strong> para continuar:</Label>
                <Input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="EXCLUIR TUDO" className="h-8 text-sm" />
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => { setShowClearConfirm(false); setConfirmText(''); }}>Cancelar</Button>
                <Button variant="destructive" className="flex-1" disabled={confirmText !== 'EXCLUIR TUDO'} onClick={async () => {
                  setClearing(true); setClearProgress(0);
                  try {
                    const result = await clearAllData((step, total, label) => {
                      setClearProgress(Math.round((step / total) * 100)); setClearStep(label);
                    });
                    setClearStep('Concluído!');
                    addChangelogEntry({ action: 'delete', entityType: 'todos os dados', entityName: 'Limpeza completa' });
                    const entitySummary = Object.entries(result.entities).filter(([, v]) => v.deleted > 0).map(([k, v]) => `${v.deleted} ${k}`).join(', ');
                    let msg = `Cache local limpo: ${result.localStorage.cleared} chaves.`;
                    if (entitySummary) msg = `Dados removidos: ${entitySummary}. ${msg}`;
                    setImportMsg(msg + ' Atualize a página.');
                    setTimeout(() => window.location.reload(), 2500);
                  } catch (e) { setImportMsg('Erro ao limpar dados: ' + e.message); setClearStep(''); }
                  setClearing(false);
                }}>Confirmar limpeza</Button>
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
                <div className="h-full bg-red-500 rounded-full transition-all duration-300" style={{ width: `${clearProgress}%` }} />
              </div>
              <p className="text-xs text-muted-foreground text-center">{clearProgress}%</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
