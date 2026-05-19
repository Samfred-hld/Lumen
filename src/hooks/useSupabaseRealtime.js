import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/api/supabaseClient'

export function useSupabaseRealtime(table, queryKey, pauseRef = null) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel(`${table}-changes`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: table
      }, () => {
        if (pauseRef?.current) return
        queryClient.invalidateQueries({ queryKey: [queryKey] })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, queryKey, queryClient, pauseRef])
}
