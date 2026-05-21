import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import MsIcon from '@/components/ui/ms-icon';

export default function SessionDisplay() {
  const { getSession } = useAuth();
  const [sessionInfo, setSessionInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const data = await getSession();
        setSessionInfo(data.session);
      } catch (err) {
        console.error('Failed to load session:', err);
      } finally {
        setLoading(false);
      }
    };
    loadSession();
  }, [getSession]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-body-lg">Carregando sessão...</span>
      </div>
    );
  }

  if (!sessionInfo) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <MsIcon name="devices_off" size={32} className="text-muted-foreground" />
        <p className="text-body-lg text-muted-foreground">Nenhuma sessão ativa</p>
        <p className="text-body-sm text-muted-foreground">Suas sessões ativas aparecerão aqui.</p>
      </div>
    );
  }

  const userAgent = navigator.userAgent || '';
  let deviceInfo = 'Dispositivo desconhecido';
  if (userAgent.includes('Windows')) deviceInfo = 'Windows';
  else if (userAgent.includes('Mac')) deviceInfo = 'macOS';
  else if (userAgent.includes('Linux')) deviceInfo = 'Linux';
  else if (userAgent.includes('Android')) deviceInfo = 'Android';
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) deviceInfo = 'iOS';

  const lastActive = sessionInfo.expires_at
    ? new Date(sessionInfo.expires_at * 1000).toLocaleString('pt-BR')
    : new Date().toLocaleString('pt-BR');

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 p-3 rounded-md border border-surface-border bg-surface-container-low">
        <MsIcon name="devices" size={20} className="text-primary mt-0.5" />
        <div className="space-y-1">
          <p className="text-label text-muted-foreground uppercase tracking-wider">Dispositivo</p>
          <p className="text-body-lg text-on-surface">{deviceInfo}</p>
        </div>
      </div>
      <div className="flex items-start gap-3 p-3 rounded-md border border-surface-border bg-surface-container-low">
        <MsIcon name="schedule" size={20} className="text-primary mt-0.5" />
        <div className="space-y-1">
          <p className="text-label text-muted-foreground uppercase tracking-wider">Última atividade</p>
          <p className="text-body-lg text-on-surface">{lastActive}</p>
        </div>
      </div>
    </div>
  );
}
