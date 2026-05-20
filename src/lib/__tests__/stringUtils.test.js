import { describe, it, expect } from 'vitest';
import { normalizeStr } from '@/lib/stringUtils';

describe('normalizeStr', () => {
  it('removes accents: áéíóú → aeiou', () => {
    expect(normalizeStr('áéíóú')).toBe('aeiou');
  });
  it('removes ç → c', () => {
    expect(normalizeStr('ação')).toBe('acao');
  });
  it('removes ã → a', () => {
    expect(normalizeStr('não')).toBe('nao');
  });
  it('collapses whitespace', () => {
    expect(normalizeStr('a   b\tc')).toBe('a b c');
  });
  it('lowercases', () => {
    expect(normalizeStr('ABC')).toBe('abc');
  });
  it('removes curly quotes', () => {
    expect(normalizeStr('\u201Cteste\u201D')).toBe('teste');
  });
  it('removes regular double quotes', () => {
    expect(normalizeStr('"teste"')).toBe('teste');
  });
  it('returns empty string for null', () => {
    expect(normalizeStr(null)).toBe('');
  });
  it('returns empty string for empty input', () => {
    expect(normalizeStr('')).toBe('');
  });
  it('trims whitespace', () => {
    expect(normalizeStr('  hello  ')).toBe('hello');
  });
});
