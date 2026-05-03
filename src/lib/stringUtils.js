/**
 * Normaliza string para comparação: lowercase, sem acentos, sem aspas, espaços colapsados.
 */
export function normalizeStr(str) {
  if (!str) return '';
  return str
    .trim()
    .replace(/[""\u201C\u201D]/g, '') // remove aspas (incluindo curly quotes) para comparação
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
