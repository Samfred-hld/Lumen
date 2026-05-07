// ══════════════════════════════════════════
// LÚMEN — Store Helpers (localStorage + entity connectivity)
// ══════════════════════════════════════════

import { base44 } from '@/api/base44Client';

export const LS_PREFIX = 'rattio_'; // Mantido como 'rattio_' para compatibilidade com dados existentes — não alterar

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
    const r = localStorage.getItem(LS_PREFIX + key);
    return r ? JSON.parse(r) : fallback;
  } catch (err) {
    console.error('[Store] Erro em getLocal:', err);
    return fallback;
  }
}

export function setLocal(key, val) {
  try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(val)); } catch (err) { console.error('[Store] Erro em setLocal:', err); }
}

export function removeLocal(key) {
  try { localStorage.removeItem(LS_PREFIX + key); } catch (err) { console.error('[Store] Erro em removeLocal:', err); }
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
