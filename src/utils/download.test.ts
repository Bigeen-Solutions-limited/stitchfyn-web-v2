import { describe, it, expect } from 'vitest';
import { toCsv, type CsvColumn } from './download';

interface Row { name: string; qty: number | null }
const columns: CsvColumn<Row>[] = [
  { header: 'Name', value: (r) => r.name },
  { header: 'Qty', value: (r) => r.qty },
];

describe('toCsv', () => {
  it('writes a header and one line per row', () => {
    expect(toCsv([{ name: 'Ada', qty: 2 }], columns)).toBe('Name,Qty\r\nAda,2');
  });

  it('quotes commas, quotes and line breaks', () => {
    expect(toCsv([{ name: 'Okafor, "Chi"\nJr', qty: 1 }], columns)).toBe('Name,Qty\r\n"Okafor, ""Chi""\nJr",1');
  });

  it('leaves empty values blank', () => {
    expect(toCsv([{ name: 'Ada', qty: null }], columns)).toBe('Name,Qty\r\nAda,');
  });

  it('stops typed text being run as a spreadsheet formula', () => {
    expect(toCsv([{ name: '=HYPERLINK("x")', qty: -3 }], columns)).toBe('Name,Qty\r\n"\'=HYPERLINK(""x"")",-3');
  });
});
