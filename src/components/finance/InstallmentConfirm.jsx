import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import MsIcon from '@/components/ui/ms-icon';

export default function InstallmentConfirm({ open, onClose, onConfirmSingle, onConfirmAll, transaction }) {
  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MsIcon name="warning" size={18} className="text-amber-500" />
            Excluir Parcela
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Esta transação faz parte de um parcelamento ({transaction.installmentCurrent}/{transaction.installmentCount}).
            O que deseja fazer?
          </p>
          <div className="bg-muted/50 rounded p-3 text-sm">
            <p className="font-medium">{transaction.description}</p>
            <p className="text-muted-foreground text-xs mt-1">
              {transaction.installmentCount}x de R$ {transaction.value?.toFixed(2)}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => { onConfirmSingle(); onClose(); }}
          >
            Excluir só esta parcela
          </Button>
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => { onConfirmAll(); onClose(); }}
          >
            Excluir toda a série ({transaction.installmentCount} parcelas)
          </Button>
          <Button variant="ghost" className="w-full text-xs" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
