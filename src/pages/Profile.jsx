import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import ProfileSection from '@/components/profile/ProfileSection';
import PasswordChangeForm from '@/components/profile/PasswordChangeForm';
import EmailUpdateForm from '@/components/profile/EmailUpdateForm';
import AccountDeletionDialog from '@/components/profile/AccountDeletionDialog';
import SessionDisplay from '@/components/profile/SessionDisplay';

export default function Profile() {
  const { user } = useAuth();

  return (
    <div className="px-lg py-xl max-w-2xl mx-auto space-y-6">
      <h1 className="text-display-sm font-bold text-on-surface">Perfil</h1>

      <ProfileSection icon="person" title="Informações pessoais">
        <EmailUpdateForm />
      </ProfileSection>

      <ProfileSection icon="security" title="Seguranca">
        <PasswordChangeForm />
      </ProfileSection>

      <ProfileSection icon="devices" title="Sessões">
        <SessionDisplay />
      </ProfileSection>

      <ProfileSection icon="warning" title="Zona de perigo" variant="danger">
        <p className="text-body-lg text-muted-foreground mb-4">
          Ações irreversíveis que afetam sua conta permanentemente.
        </p>
        <AccountDeletionDialog />
      </ProfileSection>
    </div>
  );
}
