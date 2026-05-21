import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import MsIcon from '@/components/ui/ms-icon';

export default function EmailUpdateForm() {
  const { user, updateEmail } = useAuth();
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setError('Digite um e-mail válido.');
      return;
    }

    if (newEmail === user?.email) {
      setError('O novo e-mail é igual ao atual.');
      return;
    }

    setLoading(true);
    try {
      await updateEmail(newEmail);
      toast({
        title: `E-mail de confirmação enviado para ${newEmail}. Confirme para atualizar.`
      });
      setNewEmail('');
    } catch (err) {
      setError('Não foi possível atualizar o e-mail. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>E-mail atual</Label>
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-surface-container-low border border-surface-border">
          <MsIcon name="mail" size={16} className="text-muted-foreground" />
          <span className="text-body-lg text-on-surface">{user?.email || '—'}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-email">Novo e-mail</Label>
          <Input
            id="new-email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="novo@email.com"
            required
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-danger">
            <MsIcon name="error" size={16} />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
              Enviando...
            </>
          ) : (
            'Atualizar e-mail'
          )}
        </Button>
      </form>

      <p className="text-body-sm text-muted-foreground">
        Você receberá um e-mail de confirmação no novo endereço. O e-mail só será alterado após a confirmação.
      </p>
    </div>
  );
}
