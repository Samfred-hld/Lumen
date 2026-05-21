import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import MsIcon from '@/components/ui/ms-icon';

export default function AccountDeletionDialog() {
  const { deleteAccount } = useAuth();
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setError('');
    setLoading(true);
    try {
      await deleteAccount();
    } catch (err) {
      setError('Não foi possível excluir a conta. Tente novamente ou entre em contato com o suporte.');
      setLoading(false);
    }
  };

  const handleOpenChange = (open) => {
    if (!open) {
      setConfirmText('');
      setError('');
    }
  };

  return (
    <AlertDialog onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="w-full sm:w-auto">
          <MsIcon name="delete_forever" size={16} className="mr-2" />
          Excluir conta
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-danger">
            <MsIcon name="warning" size={20} />
            Excluir conta
          </AlertDialogTitle>
          <AlertDialogDescription className="text-body-lg">
            Sua conta será desativada por 30 dias. Após esse período, todos os seus dados serão permanentemente excluídos.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="confirm-delete">
              Digite <strong>EXCLUIR</strong> para confirmar
            </Label>
            <Input
              id="confirm-delete"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="EXCLUIR"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-danger">
              <MsIcon name="error" size={16} />
              <span>{error}</span>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={confirmText !== 'EXCLUIR' || loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-destructive-foreground border-t-transparent rounded-full animate-spin mr-2" />
                Excluindo...
              </>
            ) : (
              'Excluir conta'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
