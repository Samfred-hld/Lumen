import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import MsIcon from '@/components/ui/ms-icon';
import { exportBackup, importBackup, restoreBackupData } from '@/lib/backupRestore';
import RestoreConfirmDialog from '@/components/settings/RestoreConfirmDialog';

export default function BackupSection({ transactions, budgets, goals, cards }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingData, setPendingData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(null);
  const fileInputRef = useRef(null);

  const handleExport = () => {
    if (!transactions?.length && !budgets?.length && !goals?.length && !cards?.length) {
      toast({ title: 'Nenhum dado para exportar', description: 'Adicione transações, orçamentos ou metas antes de fazer um backup.', variant: 'destructive' });
      return;
    }
    exportBackup(transactions, budgets, goals, cards);
    toast({ title: 'Backup exportado', description: 'Seu arquivo de backup foi baixado com sucesso.' });
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await importBackup(file);

    if (!result.success) {
      toast({ title: 'Erro ao importar', description: result.error, variant: 'destructive' });
      e.target.value = '';
      return;
    }

    setPendingData(result.data);
    setSummary(result.summary);
    setConfirmOpen(true);
    e.target.value = '';
  };

  const handleConfirmRestore = async () => {
    if (!pendingData) return;

    setRestoring(true);
    setRestoreProgress({ percent: 0, label: 'Iniciando restauração...' });

    try {
      await restoreBackupData(pendingData, (percent, label) => {
        setRestoreProgress({ percent, label });
      });

      toast({ title: 'Dados restaurados', description: 'Seus dados foram restaurados com sucesso. A página será atualizada.' });
      setConfirmOpen(false);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      toast({ title: 'Erro na restauração', description: err.message || 'Ocorreu um erro ao restaurar os dados.', variant: 'destructive' });
    } finally {
      setRestoring(false);
      setRestoreProgress(null);
      setPendingData(null);
    }
  };

  const hasData = transactions?.length > 0 || budgets?.length > 0 || goals?.length > 0 || cards?.length > 0;

  return (
    <div className="space-y-4">
      {!hasData && (
        <div className="text-center py-6">
          <div className="mx-auto w-12 h-12 rounded bg-surface-low border border-surface-border flex items-center justify-center mb-3">
            <MsIcon name="backup" size={24} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-on-surface">Nenhum backup encontrado</p>
          <p className="text-xs text-muted-foreground mt-1">
            Crie um backup para proteger seus dados financeiros. O arquivo será salvo no seu dispositivo.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button variant="outline" className="w-full justify-start bg-surface hover:bg-surface-low" onClick={handleExport}>
          <MsIcon name="download" size={16} className="mr-2 text-emerald-600" />
          Fazer backup
        </Button>

        <Button variant="outline" className="w-full justify-start bg-surface hover:bg-surface-low" onClick={() => fileInputRef.current?.click()}>
          <MsIcon name="upload" size={16} className="mr-2 text-blue-600" />
          Restaurar dados
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
      />

      <RestoreConfirmDialog
        open={confirmOpen}
        onClose={(v) => { if (!restoring) { setConfirmOpen(v); setPendingData(null); setSummary(null); } }}
        summary={summary}
        onConfirm={handleConfirmRestore}
        loading={restoring}
        progress={restoreProgress}
      />
    </div>
  );
}
