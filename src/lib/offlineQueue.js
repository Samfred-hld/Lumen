import { getPrefix } from '@/lib/store/helpers';

const QUEUE_KEY = 'offlineMutationQueue';
const MAX_QUEUE_SIZE = 500;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Add a mutation to the offline queue.
 * @param {Object} mutation - { table, action, data, match? }
 *   - table: Supabase table name
 *   - action: 'insert' | 'update' | 'delete'
 *   - data: row data
 *   - match: optional match conditions for update/delete (e.g. { id: '...' })
 */
export function enqueue(mutation) {
  const queue = getQueue();
  const item = {
    ...mutation,
    timestamp: Date.now(),
    id: crypto.randomUUID(),
  };
  queue.push(item);

  // FIFO eviction: remove oldest items if queue exceeds cap
  while (queue.length > MAX_QUEUE_SIZE) {
    queue.shift();
  }

  try {
    localStorage.setItem(getPrefix() + QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('[OfflineQueue] Failed to persist mutation:', err);
  }
}

/**
 * Read the current queue from localStorage.
 * @returns {Array} array of queued mutations
 */
export function getQueue() {
  try {
    const raw = localStorage.getItem(getPrefix() + QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Remove a specific mutation from the queue by id.
 * @param {string} id - mutation id to remove
 */
export function dequeue(id) {
  const queue = getQueue().filter(m => m.id !== id);
  try {
    localStorage.setItem(getPrefix() + QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('[OfflineQueue] Failed to update queue after dequeue:', err);
  }
}

/**
 * Process all queued mutations against a Supabase client.
 * Skips items older than MAX_AGE_MS. Stops on first failure.
 * @param {Object} supabaseClient - Supabase client instance
 * @returns {Promise<{processed: number, failed: number, skipped: number}>}
 */
export async function processQueue(supabaseClient) {
  const queue = getQueue();
  let processed = 0;
  let failed = 0;
  let skipped = 0;
  const now = Date.now();

  for (const mutation of queue) {
    // Skip stale items
    if (now - mutation.timestamp > MAX_AGE_MS) {
      dequeue(mutation.id);
      skipped++;
      continue;
    }

    try {
      const table = supabaseClient.from(mutation.table);

      if (mutation.action === 'insert') {
        const { error } = await table.insert(mutation.data);
        if (error) throw error;
      } else if (mutation.action === 'update') {
        const match = mutation.match || { id: mutation.data?.id };
        const { error } = await table.update(mutation.data).match(match);
        if (error) throw error;
      } else if (mutation.action === 'delete') {
        const match = mutation.match || { id: mutation.data?.id };
        const { error } = await table.delete().match(match);
        if (error) throw error;
      } else {
        console.warn('[OfflineQueue] Unknown action:', mutation.action, '— skipping');
        dequeue(mutation.id);
        skipped++;
        continue;
      }

      dequeue(mutation.id);
      processed++;
    } catch (err) {
      console.error('[OfflineQueue] Sync failed for mutation:', mutation.id, err);
      failed++;
      break; // stop processing on first failure
    }
  }

  return { processed, failed, skipped };
}
