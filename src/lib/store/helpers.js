// ══════════════════════════════════════════
// LÚMEN — Store Helpers (localStorage + entity connectivity)
// ══════════════════════════════════════════

import { base44 } from '@/api/base44Client';

// ── Legacy prefix (backward compat) ──
export const LS_PREFIX = 'rattio_';

// ── Dynamic per-user prefix ──
function getCurrentUserId() {
  try {
    const user = base44.auth?.currentUser;
    return user?.id || user?.uid || 'anonymous';
  } catch {
    return 'anonymous';
  }
}

function getPrefix() {
  return `rattio_${getCurrentUserId()}_`;
}

// ── Migration: copy legacy prefix → user-specific prefix ──
// Called once per session from initStore(). Cloud sync will correct any stale data.
let _migratedThisSession = false;

export function migrateToUserPrefix() {
  if (_migratedThisSession) return;
  _migratedThisSession = true;

  try {
    const userId = getCurrentUserId();
    if (userId === 'anonymous') return; // no user logged in — skip

    const legacyMarked = localStorage.getItem('rattio_lastUserId');
    if (legacyMarked === userId) return; // already migrated for this user

    const userPrefix = `rattio_${userId}_`;
    const allKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('rattio_') && !k.startsWith(userPrefix) && k !== 'rattio_lastUserId') {
        allKeys.push(k);
      }
    }

    for (const oldKey of allKeys) {
      const suffix = oldKey.slice('rattio_'.length); // e.g. "cards", "theme"
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

// ── Internal helpers ──
const _entityValid = new Map(); // name → true|false (connectivity cache)

export function hasEntity(name) {
  // Duck-type check + cached connectivity result
  if (!base44?.entities?.[name]) return false;
  if (_entityValid.has(name)) return _entityValid.get(name);
  // Assume valid until proven otherwise (async ops will update cache)
  return true;
}

/**
 * Testa conectividade real com a entidade (async).
 * Cacheia resultado para que hasEntity() possa consultar depois.
 */
export async function ensureEntity(name) {
  if (!base44?.entities?.[name]) { _entityValid.set(name, false); return false; }
  try {
    await base44.entities[name].list('', 1);
    _entityValid.set(name, true);
    return true;
  } catch (err) {
    console.error('[Store] Erro em ensureEntity:', err);
    return false;
  }
}

export function getLocal(key, fallback = null) {
  try {
    const r = localStorage.getItem(getPrefix() + key);
    return r ? JSON.parse(r) : fallback;
  } catch (err) {
    console.error('[Store] Erro em getLocal:', err);
    return fallback;
  }
}

export function setLocal(key, val) {
  try { localStorage.setItem(getPrefix() + key, JSON.stringify(val)); } catch (err) { console.error('[Store] Erro em setLocal:', err); }
}

export function removeLocal(key) {
  try { localStorage.removeItem(getPrefix() + key); } catch (err) { console.error('[Store] Erro em removeLocal:', err); }
}

// ── Primitivos (localStorage direto) ──
export function lsGet(key, fallback = null) {
  return getLocal(key, fallback);
}

export function lsSet(key, val) {
  setLocal(key, val);
}

export function lsRemove(key) {
  removeLocal(key);
}
