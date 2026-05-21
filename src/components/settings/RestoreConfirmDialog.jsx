import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import MsIcon from '@/components/ui/ms-icon';

export default function RestoreConfirmDialog({ open, onClose, summary, onConfirm, loading, progress }) {
  const total = (summary?.transactions || 0) + (summary?.budgets || 0) + (summary?.goals || 0) + (summary?.cards || 0);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) onClose(v); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MsIcon name="restore" size={18} className="text-primary" />
            Restaurar dados
          </DialogTitle>
        </DialogHeader>

        {!loading && !progress && (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-on-surface-variant">
                {summary?.transactions || 0} transações, {summary?.budgets || 0} orçamentos, {summary?.goals || 0} metas, {summary?.cards || 0} cartões serão importados.
              </p>
              <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-700">
                <strong className="flex items-center gap-1">
                  <MsIcon name="warning" size={14} className="text-amber-500" />
                  Atenção:
                </strong>{' '}
                Isso substituirá todos os seus dados atuais. Esta ação não pode ser desfeita.
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => onClose(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={onConfirm} disabled={total === 0}>
                Restaurar dados
              </Button>
            </DialogFooter>
          </div>
        )}

        {loading && (
          <div className="space-y-3 py-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">{progress?.label || 'Restaurando...'}</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress?.percent || 0}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">{progress?.percent || 0}%</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
