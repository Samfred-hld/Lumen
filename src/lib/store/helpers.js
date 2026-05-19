import { supabase } from '@/api/supabaseClient';

export const LS_PREFIX = 'rattio_';

function getCurrentUserId() {
  try {
    return supabase.auth.getUser?.()?.id || 'anonymous';
  } catch {
    return 'anonymous';
  }
}

export function getPrefix() {
  return `rattio_${getCurrentUserId()}_`;
}

let _migratedThisSession = false;

export function migrateToUserPrefix() {
  if (_migratedThisSession) return;
  _migratedThisSession = true;

  try {
    const userId = getCurrentUserId();
    if (userId === 'anonymous') return;

    const legacyMarked = localStorage.getItem('rattio_lastUserId');
    if (legacyMarked === userId) return;

    const userPrefix = `rattio_${userId}_`;
    const allKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('rattio_') && !k.startsWith(userPrefix) && k !== 'rattio_lastUserId') {
        allKeys.push(k);
      }
    }

    for (const oldKey of allKeys) {
      const suffix = oldKey.slice('rattio_'.length);
      const newKey = userPrefix + suffix;
      try {
        const val = localStorage.getItem(oldKey);
        if (val !== null && localStorage.getItem(newKey) === null) {
          localStorage.setItem(newKey, val);
        }
      } catch {}
    }

    localStorage.setItem('rattio_lastUserId', userId);
  } catch (err) {
    console.error('[Store] Erro na migração de prefix:', err);
  }
}

export function getLocal(key, fallback = null) {
  try {
    const r = localStorage.getItem(getPrefix() + key);
    return r ? JSON.parse(r) : fallback;
  } catch (err) {
    return fallback;
  }
}

export function setLocal(key, val) {
  try { localStorage.setItem(getPrefix() + key, JSON.stringify(val)); } catch {}
}

export function removeLocal(key) {
  try { localStorage.removeItem(getPrefix() + key); } catch {}
}

export function lsGet(key, fallback = null) { return getLocal(key, fallback); }
export function lsSet(key, val) { setLocal(key, val); }
export function lsRemove(key) { removeLocal(key); }
