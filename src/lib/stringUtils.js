/**
 * Normaliza string para comparação: lowercase, sem acentos, espaços colapsados.
 */
export function normalizeStr(str) {
  if (!str) return '';
  return str
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
