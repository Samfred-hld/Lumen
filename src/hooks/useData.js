// ══════════════════════════════════════════
// LÚMEN — Hooks com real-time subscribe
// ══════════════════════════════════════════
// Hooks que combinam React Query (cache) com Base44 subscribe (real-time).
// Usar em vez de useQuery direto para dados que precisam de sync.

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Hook para transações com real-time subscribe.
 * Atualiza automaticamente quando dados mudam na nuvem.
 * @param {number} limit - Limite de registros por fetch
 * @param {React.RefObject|null} pauseSubscribeRef - Se .current === true, ignora invalidations (usado durante import em lote)
 */
export function useTransactions(limit = 2000, pauseSubscribeRef = null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-date', limit),
  });

  // Real-time subscription
  useEffect(() => {
    const unsub = base44.entities.Transaction.subscribe(() => {
      // Ignora invalidations durante importação em lote
      if (pauseSubscribeRef?.current) return;
      qc.invalidateQueries({ queryKey: ['transactions'] });
    });
    return unsub;
  }, [qc, pauseSubscribeRef]);

  return query;
}

/**
 * Hook para orçamentos com real-time subscribe.
 */
export function useBudgets() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['budgets'],
    queryFn: () => base44.entities.Budget.list(),
  });

  useEffect(() => {
    const unsub = base44.entities.Budget.subscribe(() => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
    });
    return unsub;
  }, [qc]);

  return query;
}

/**
 * Hook para metas com real-time subscribe.
 */
export function useGoals() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['goals'],
    queryFn: () => base44.entities.Goal.list(),
  });

  useEffect(() => {
    const unsub = base44.entities.Goal.subscribe(() => {
      qc.invalidateQueries({ queryKey: ['goals'] });
    });
    return unsub;
  }, [qc]);

  return query;
}

/**
 * Hook para cartões de crédito com real-time subscribe.
 */
export function useCards() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['cards'],
    queryFn: () => base44.entities.Card.list('', 1000),
  });

  useEffect(() => {
    const unsub = base44.entities.Card.subscribe(() => {
      qc.invalidateQueries({ queryKey: ['cards'] });
    });
    return unsub;
  }, [qc]);

  return query;
}
