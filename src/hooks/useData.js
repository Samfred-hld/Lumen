import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { useSupabaseRealtime } from './useSupabaseRealtime';

export function useTransactions(limit = 2000, pauseSubscribeRef = null) {
  useSupabaseRealtime('transactions', 'transactions', pauseSubscribeRef);

  return useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

export function useBudgets() {
  useSupabaseRealtime('budgets', 'budgets');

  return useQuery({
    queryKey: ['budgets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*');
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

export function useGoals() {
  useSupabaseRealtime('goals', 'goals');

  return useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goals')
        .select('*');
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

export function useCards() {
  useSupabaseRealtime('cards', 'cards');

  return useQuery({
    queryKey: ['cards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cards')
        .select('*');
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}
