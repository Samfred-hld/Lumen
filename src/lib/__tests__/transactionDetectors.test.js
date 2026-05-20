import { describe, it, expect } from 'vitest';
import { detectInstallment, isRefundOrPayment, suggestInstallment } from '@/lib/transactionDetectors';

describe('detectInstallment', () => {
  it('detects "Compra - Parcela 3/12"', () => {
    const result = detectInstallment('Compra - Parcela 3/12');
    expect(result.isInstallment).toBe(true);
    expect(result.index).toBe(3);
    expect(result.total).toBe(12);
    expect(result.cleanTitle).toBe('Compra');
  });
  it('detects "Compra 03/12"', () => {
    const result = detectInstallment('Compra 03/12');
    expect(result.isInstallment).toBe(true);
    expect(result.index).toBe(3);
    expect(result.total).toBe(12);
    expect(result.cleanTitle).toBe('Compra');
  });
  it('detects "Compra (3/12)"', () => {
    const result = detectInstallment('Compra (3/12)');
    expect(result.isInstallment).toBe(true);
    expect(result.index).toBe(3);
    expect(result.total).toBe(12);
  });
  it('detects "Compra 3x"', () => {
    const result = detectInstallment('Compra 3x');
    expect(result.isInstallment).toBe(true);
    expect(result.index).toBe(1);
    expect(result.total).toBe(3);
    expect(result.cleanTitle).toBe('Compra');
  });
  it('detects "Compra 3X" (uppercase)', () => {
    const result = detectInstallment('Compra 3X');
    expect(result.isInstallment).toBe(true);
    expect(result.total).toBe(3);
  });
  it('returns null for normal description', () => {
    expect(detectInstallment('Compra normal')).toBeNull();
  });
  it('returns null when total ≤ 1', () => {
    expect(detectInstallment('Compra 1/1')).toBeNull();
  });
  it('returns null for null input', () => {
    expect(detectInstallment(null)).toBeNull();
  });
  it('detects open paren "Compra (3/12"', () => {
    const result = detectInstallment('Compra (3/12');
    expect(result).not.toBeNull();
    expect(result.index).toBe(3);
    expect(result.total).toBe(12);
  });
  it('detects em-dash variant "Compra \u2013 Parcela 2/5"', () => {
    const result = detectInstallment('Compra \u2013 Parcela 2/5');
    expect(result).not.toBeNull();
    expect(result.total).toBe(5);
  });
});

describe('isRefundOrPayment', () => {
  it('"Estorno de compra" → true', () => {
    expect(isRefundOrPayment('Estorno de compra')).toBe(true);
  });
  it('"Reembolso" → true', () => {
    expect(isRefundOrPayment('Reembolso')).toBe(true);
  });
  it('"Cashback" → true', () => {
    expect(isRefundOrPayment('Cashback')).toBe(true);
  });
  it('"Pagamento de fatura" → true', () => {
    expect(isRefundOrPayment('Pagamento de fatura')).toBe(true);
  });
  it('"Pagamento recebido" → true', () => {
    expect(isRefundOrPayment('Pagamento recebido')).toBe(true);
  });
  it('"IOF" → false (excluded)', () => {
    expect(isRefundOrPayment('IOF')).toBe(false);
  });
  it('"Compra normal" → false', () => {
    expect(isRefundOrPayment('Compra normal')).toBe(false);
  });
  it('null → false', () => {
    expect(isRefundOrPayment(null)).toBe(false);
  });
  it('"Pagamento de cartão de crédito" → true (with accents)', () => {
    expect(isRefundOrPayment('Pagamento de cartão de crédito')).toBe(true);
  });
});

describe('suggestInstallment', () => {
  it('returns count and perValue for installment', () => {
    const result = suggestInstallment('Compra 3/12', 1200);
    expect(result).not.toBeNull();
    expect(result.count).toBe(12);
    expect(result.perValue).toBe(100);
  });
  it('returns null for non-installment', () => {
    expect(suggestInstallment('Compra normal', 100)).toBeNull();
  });
});
