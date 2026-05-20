import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/api/supabaseClient'

export function useSupabaseRealtime(table, queryKey, pauseRef = null) {
  const queryClient = useQueryClient()

  useEffect(() => {
    let channel
    try {
      channel = supabase
        .channel(`${table}-changes`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: table
        }, () => {
          if (pauseRef?.current) return
          queryClient.invalidateQueries({ queryKey: [queryKey] })
        })
        .subscribe((status, err) => {
          if (err) {
            console.warn(`Realtime subscription warning for "${table}":`, err.message)
          }
        })
    } catch (e) {
      console.warn(`Realtime subscription failed for "${table}":`, e.message)
    }

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [table, queryKey, queryClient, pauseRef])
}
