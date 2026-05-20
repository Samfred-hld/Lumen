import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/api/supabaseClient'

export function useSupabaseRealtime(table, queryKey, pauseRef = null) {
  const queryClient = useQueryClient()
  const channelRef = useRef(null)

  useEffect(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const channelName = `${table}-changes-${Math.random().toString(36).slice(2, 8)}`
    const channel = supabase.channel(channelName)
    channelRef.current = channel

    channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: table
      }, () => {
        if (pauseRef?.current) return
        queryClient.invalidateQueries({ queryKey: [queryKey] })
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn(`Realtime subscription error for "${table}"`)
        }
      })

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [table, queryKey, queryClient, pauseRef])
}
