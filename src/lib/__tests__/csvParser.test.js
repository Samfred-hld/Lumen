import { describe, it, expect } from 'vitest';
import {
  detectEncoding,
  detectSeparator,
  parseCSVText,
  stripBOM,
  detectDateFormat,
  normalizeDate,
  validateDateRange,
  detectColumns,
  validateColumns,
  hasEssentialColumns,
  shiftMonths,
  expandInstallmentSeries,
  getInvoiceMonth,
} from '@/lib/csvParser';

const encoder = new TextEncoder();

describe('detectEncoding', () => {
  it('detects UTF-8 BOM (EF BB BF)', () => {
    const buf = new Uint8Array([0xEF, 0xBB, 0xBF, ...encoder.encode('test')]);
    expect(detectEncoding(buf.buffer)).toBe('utf-8');
  });
  it('detects UTF-16LE BOM (FF FE)', () => {
    const buf = new Uint8Array([0xFF, 0xFE]);
    expect(detectEncoding(buf.buffer)).toBe('utf-16le');
  });
  it('detects UTF-16BE BOM (FE FF)', () => {
    const buf = new Uint8Array([0xFE, 0xFF]);
    expect(detectEncoding(buf.buffer)).toBe('utf-16be');
  });
  it('returns utf-8 for valid UTF-8 text without BOM', () => {
    const buf = encoder.encode('data,descrição,valor\n2024-01-15,Mercado,100,50');
    expect(detectEncoding(buf.buffer)).toBe('utf-8');
  });
  it('returns windows-1252 for bytes in 0x80-0x9F range (invalid UTF-8)', () => {
    const buf = new Uint8Array([0x93, 0x41, 0x42, 0x43]);
    expect(detectEncoding(buf.buffer)).toBe('windows-1252');
  });
  it('returns iso-8859-1 for invalid UTF-8 without win1252 bytes', () => {
    const buf = new Uint8Array([0x80, 0x80, 0x80]);
    expect(detectEncoding(buf.buffer)).toBe('windows-1252');
  });
});

describe('detectSeparator', () => {
  it('detects comma as separator', () => {
    expect(detectSeparator('a,b,c\nd,e,f')).toBe(',');
  });
  it('detects semicolon as separator', () => {
    expect(detectSeparator('a;b;c\nd;e;f')).toBe(';');
  });
  it('detects tab as separator', () => {
    expect(detectSeparator('a\tb\tc\nd\te\tf')).toBe('\t');
  });
  it('ignores separators inside quoted fields', () => {
    const text = 'a,"b,c",d\ne,"f,g",h';
    expect(detectSeparator(text)).toBe(',');
  });
});

describe('parseCSVText', () => {
  it('parses simple CSV', () => {
    const result = parseCSVText('a,b,c\nd,e,f', ',');
    expect(result).toEqual([['a', 'b', 'c'], ['d', 'e', 'f']]);
  });
  it('handles quoted fields with commas inside', () => {
    const result = parseCSVText('a,"b,c",d', ',');
    expect(result).toEqual([['a', 'b,c', 'd']]);
  });
  it('handles escaped quotes "" inside quoted field', () => {
    const result = parseCSVText('a,"b""c",d', ',');
    expect(result).toEqual([['a', 'b"c', 'd']]);
  });
  it('handles multiline quoted fields', () => {
    const result = parseCSVText('a,"b\nc",d', ',');
    expect(result).toEqual([['a', 'b\nc', 'd']]);
  });
  it('handles CRLF line endings', () => {
    const result = parseCSVText('a,b\r\nc,d', ',');
    expect(result).toEqual([['a', 'b'], ['c', 'd']]);
  });
  it('trims trailing empty rows', () => {
    const result = parseCSVText('a,b,c\n,d,', ',');
    expect(result).toEqual([['a', 'b', 'c'], ['', 'd', '']]);
  });
  it('handles file without trailing newline', () => {
    const result = parseCSVText('a,b,c', ',');
    expect(result).toEqual([['a', 'b', 'c']]);
  });
});

describe('stripBOM', () => {
  it('removes U+FEFF from beginning of text', () => {
    expect(stripBOM('\uFEFFdata,value\n')).toBe('data,value\n');
  });
  it('does not remove mid-text U+FEFF', () => {
    expect(stripBOM('data\uFEFFvalue')).toBe('data\uFEFFvalue');
  });
  it('returns unchanged if no BOM', () => {
    expect(stripBOM('hello')).toBe('hello');
  });
});

describe('detectDateFormat', () => {
  it('detects DMY format (Brazilian default)', () => {
    const result = detectDateFormat(['15/03/2024', '01/12/2023', '31/01/2024']);
    expect(result.format).toBe('DMY');
  });
  it('detects YMD format', () => {
    const result = detectDateFormat(['2024-03-15', '2023-12-01']);
    expect(result.format).toBe('YMD');
  });
  it('detects MDY format', () => {
    const result = detectDateFormat(['12/31/2024', '01/15/2023']);
    expect(result.format).toBe('MDY');
  });
  it('defaults to DMY for ambiguous (both ≤12)', () => {
    const result = detectDateFormat(['05/03/2024', '02/08/2023']);
    expect(result.format).toBe('DMY');
  });
  it('defaults to DMY for empty samples', () => {
    const result = detectDateFormat([]);
    expect(result.format).toBe('DMY');
  });
});

describe('normalizeDate', () => {
  it('normalizes DMY to ISO', () => {
    const fmt = detectDateFormat(['15/03/2024']);
    expect(normalizeDate('15/03/2024', fmt)).toBe('2024-03-15');
  });
  it('normalizes MDY to ISO', () => {
    const fmt = { format: 'MDY', separator: '/', order: (s) => {
      const [m, d, y] = s.split('/');
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }};
    expect(normalizeDate('12/31/2024', fmt)).toBe('2024-12-31');
  });
  it('expands 2-digit year ≤30 to 20xx', () => {
    const fmt = detectDateFormat(['15/03/24']);
    expect(normalizeDate('15/03/24', fmt)).toBe('2024-03-15');
  });
  it('expands 2-digit year >30 to 19xx', () => {
    const fmt = detectDateFormat(['15/03/99']);
    expect(normalizeDate('15/03/99', fmt)).toBe('1999-03-15');
  });
  it('passes already-ISO dates through unchanged', () => {
    expect(normalizeDate('2024-03-15', null)).toBe('2024-03-15');
  });
  it('returns null for empty input', () => {
    expect(normalizeDate('', null)).toBeNull();
    expect(normalizeDate(null, null)).toBeNull();
  });
  it('fallback tries all formats when no detected format helps', () => {
    expect(normalizeDate('01/01/2024', { format: 'YMD' })).toBe('2024-01-01');
  });
});

describe('validateDateRange', () => {
  it('returns no warning for valid date', () => {
    const result = validateDateRange('2024-06-15');
    expect(result.warning).toBe(false);
  });
  it('warns for date before 2000', () => {
    const result = validateDateRange('1999-12-31');
    expect(result.warning).toBe(true);
  });
  it('warns for date far in future', () => {
    const nextYear = new Date().getFullYear() + 2;
    const result = validateDateRange(`${nextYear}-01-01`);
    expect(result.warning).toBe(true);
  });
  it('warns for null input', () => {
    const result = validateDateRange(null);
    expect(result.warning).toBe(true);
    expect(result.reason).toBe('Data inválida');
  });
  it('warns for invalid date', () => {
    const result = validateDateRange('not-a-date');
    expect(result.warning).toBe(true);
  });
});

describe('detectColumns', () => {
  it('detects Brazilian headers (data, descrição, valor)', () => {
    const result = detectColumns(['Data', 'Descrição', 'Valor']);
    expect(result.dateIdx).toBe(0);
    expect(result.descIdx).toBe(1);
    expect(result.valIdx).toBe(2);
  });
  it('detects English headers (date, description, amount)', () => {
    const result = detectColumns(['Date', 'Description', 'Amount']);
    expect(result.dateIdx).toBe(0);
    expect(result.descIdx).toBe(1);
    expect(result.valIdx).toBe(2);
  });
  it('detects credit and debit column indices', () => {
    const result = detectColumns(['Data', 'Descrição', 'Crédito', 'Débito']);
    expect(result.creditIdx).toBe(2);
    expect(result.debitIdx).toBe(3);
  });
  it('detects split columns when crédito+débito but no valor (débito also matches valIdx)', () => {
    const result = detectColumns(['Data', 'Descrição', 'Crédito', 'Saída']);
    expect(result.hasSplitColumns).toBe(true);
  });
  it('detects merchant/estabelecimento as description', () => {
    const result = detectColumns(['Data', 'Estabelecimento', 'Valor']);
    expect(result.descIdx).toBe(1);
  });
});

describe('validateColumns', () => {
  it('returns valid when description and value found', () => {
    const colInfo = { descIdx: 1, valIdx: 2, hasSplitColumns: false };
    expect(validateColumns(colInfo).valid).toBe(true);
  });
  it('returns valid for split columns', () => {
    const colInfo = { descIdx: 1, valIdx: -1, hasSplitColumns: true };
    expect(validateColumns(colInfo).valid).toBe(true);
  });
  it('returns invalid when no description or value', () => {
    const colInfo = { descIdx: -1, valIdx: -1, hasSplitColumns: false };
    expect(validateColumns(colInfo).valid).toBe(false);
  });
});

describe('hasEssentialColumns', () => {
  it('returns true for valid headers', () => {
    expect(hasEssentialColumns(['Data', 'Descrição', 'Valor'])).toBe(true);
  });
  it('returns false for unrecognized headers', () => {
    expect(hasEssentialColumns(['Foo', 'Bar', 'Baz'])).toBe(false);
  });
});

describe('getInvoiceMonth', () => {
  it('closingDay=26, date 2024-04-25 → invoice May (M+1)', () => {
    expect(getInvoiceMonth('2024-04-25', 26)).toBe('2024-05');
  });
  it('closingDay=26, date 2024-04-26 → invoice June (M+2)', () => {
    expect(getInvoiceMonth('2024-04-26', 26)).toBe('2024-06');
  });
  it('closingDay=26, date 2024-04-27 → invoice June (M+2)', () => {
    expect(getInvoiceMonth('2024-04-27', 26)).toBe('2024-06');
  });
  it('handles December rollover (closingDay=26, date 2024-12-27)', () => {
    expect(getInvoiceMonth('2024-12-27', 26)).toBe('2025-02');
  });
  it('handles December rollover (closingDay=26, date 2024-12-15)', () => {
    expect(getInvoiceMonth('2024-12-15', 26)).toBe('2025-01');
  });
  it('returns null for null closingDay', () => {
    expect(getInvoiceMonth('2024-04-25', null)).toBeNull();
  });
  it('returns null for null date', () => {
    expect(getInvoiceMonth(null, 26)).toBeNull();
  });
  it('returns null for invalid date format', () => {
    expect(getInvoiceMonth('04/25/2024', 26)).toBeNull();
  });
});

describe('shiftMonths', () => {
  it('shifts forward by 1 month', () => {
    expect(shiftMonths('2024-01-15', 1)).toBe('2024-02-15');
  });
  it('shifts backward by 1 month', () => {
    expect(shiftMonths('2024-03-15', -1)).toBe('2024-02-15');
  });
  it('handles year rollover', () => {
    expect(shiftMonths('2024-12-15', 1)).toBe('2025-01-15');
  });
  it('clamps day for month with fewer days', () => {
    expect(shiftMonths('2024-01-31', 1)).toBe('2024-02-29');
  });
});

describe('expandInstallmentSeries', () => {
  it('generates correct number of rows for 3/12 installment', () => {
    const row = {
      installmentIndex: 3, installmentTotal: 12, cleanTitle: 'Compra',
      value: 100, date: '2024-06-15', category: 'Test', selected: true,
    };
    const result = expandInstallmentSeries(row, 26);
    expect(result).toHaveLength(12);
  });
  it('marks retroactive installments with _seriesLabel "retroativa"', () => {
    const row = {
      installmentIndex: 3, installmentTotal: 6, cleanTitle: 'Compra',
      value: 100, date: '2024-06-15', category: 'Test', selected: true,
    };
    const result = expandInstallmentSeries(row, 26);
    expect(result[0]._seriesLabel).toBe('retroativa');
    expect(result[1]._seriesLabel).toBe('retroativa');
    expect(result[2]._seriesLabel).toBe('esta_fatura');
  });
  it('marks future installments with _seriesLabel "futura"', () => {
    const row = {
      installmentIndex: 1, installmentTotal: 3, cleanTitle: 'Compra',
      value: 100, date: '2024-06-15', category: 'Test', selected: true,
    };
    const result = expandInstallmentSeries(row, 26);
    expect(result[1]._seriesLabel).toBe('futura');
    expect(result[2]._seriesLabel).toBe('futura');
  });
});
