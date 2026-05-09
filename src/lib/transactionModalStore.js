// ══════════════════════════════════════════
// LÚMEN — Transaction Modal Store
// ══════════════════════════════════════════
// Replaces CustomEvent 'lumen-new-transaction' with a typed pub/sub store.

let _isOpen = false;
let _defaultType = 'expense';
const _listeners = new Set();

export const useTransactionModal = {
  get isOpen() { return _isOpen; },
  get defaultType() { return _defaultType; },

  open(type = 'expense') {
    _isOpen = true;
    _defaultType = type;
    _listeners.forEach(fn => fn({ isOpen: true, defaultType: type }));
  },

  close() {
    _isOpen = false;
    _listeners.forEach(fn => fn({ isOpen: false, defaultType: _defaultType }));
  },

  subscribe(fn) {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },
};
