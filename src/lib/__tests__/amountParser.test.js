import { describe, it, expect } from 'vitest';
import { parseAmount, parseAmountWithSign } from '@/lib/amountParser';

describe('parseAmount', () => {
  it('parses Brazilian format "1.234,56" → 1234.56', () => {
    expect(parseAmount('1.234,56')).toBe(1234.56);
  });
  it('parses US format "1,234.56" → 1234.56', () => {
    expect(parseAmount('1,234.56')).toBe(1234.56);
  });
  it('parses accounting format "(1.234,56)" → -1234.56', () => {
    expect(parseAmount('(1.234,56)')).toBe(-1234.56);
  });
  it('parses plain number "42" → 42', () => {
    expect(parseAmount('42')).toBe(42);
  });
  it('returns 0 for "0"', () => {
    expect(parseAmount('0')).toBe(0);
  });
  it('returns 0 for empty string', () => {
    expect(parseAmount('')).toBe(0);
  });
  it('returns 0 for null', () => {
    expect(parseAmount(null)).toBe(0);
  });
  it('returns 0 for undefined', () => {
    expect(parseAmount(undefined)).toBe(0);
  });
  it('handles comma-thousands ambiguity: "1,234" with 3 digits → 1234', () => {
    expect(parseAmount('1,234')).toBe(1234);
  });
  it('handles comma-decimal: "1,23" with 2 digits → 1.23', () => {
    expect(parseAmount('1,23')).toBe(1.23);
  });
  it('parses negative with BR format: uses accounting parens for negativity', () => {
    expect(parseAmount('(1.234,56)')).toBe(-1234.56);
  });
  it('handles number with trailing dot', () => {
    expect(parseAmount('100.')).toBe(100);
  });
  it('handles R$ prefix', () => {
    expect(parseAmount('R$ 50,00')).toBe(50);
  });
  it('handles value with trailing whitespace', () => {
    expect(parseAmount('  42,50  ')).toBe(42.5);
  });
});

describe('parseAmountWithSign', () => {
  it('"1.234,56" → { value: 1234.56, isNegative: false }', () => {
    const result = parseAmountWithSign('1.234,56');
    expect(result.value).toBe(1234.56);
    expect(result.isNegative).toBe(false);
  });
  it('"-50,00" → { value: 50, isNegative: true }', () => {
    const result = parseAmountWithSign('-50,00');
    expect(result.value).toBe(50);
    expect(result.isNegative).toBe(true);
  });
  it('"(100,00)" → { value: 100, isNegative: true }', () => {
    const result = parseAmountWithSign('(100,00)');
    expect(result.value).toBe(100);
    expect(result.isNegative).toBe(true);
  });
  it('null → { value: 0, isNegative: false }', () => {
    const result = parseAmountWithSign(null);
    expect(result.value).toBe(0);
    expect(result.isNegative).toBe(false);
  });
  it('positive plain number', () => {
    const result = parseAmountWithSign('500');
    expect(result.value).toBe(500);
    expect(result.isNegative).toBe(false);
  });
});
