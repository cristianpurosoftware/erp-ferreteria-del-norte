import { describe, expect, it } from 'vitest';
import { buildInvoiceNumber, nextInvoiceSequenceFromNumbers } from '../../src/modules/invoices/invoices.service';

describe('invoice numbering helpers', () => {
  it('formats invoice numbers with invoice type, sales point and 8 digit sequence', () => {
    expect(buildInvoiceNumber('B', '1', 7)).toBe('B-0001-00000007');
    expect(buildInvoiceNumber(undefined, undefined, 12)).toBe('B-0001-00000012');
  });

  it('calculates the next sequence for a type and sales point only', () => {
    const existing = [
      'B-0001-00000001',
      'B-0001-00000009',
      'A-0001-00000020',
      'B-0002-00000030',
      'manual-legacy',
      null,
    ];

    expect(nextInvoiceSequenceFromNumbers(existing, 'B', '0001')).toBe(10);
    expect(nextInvoiceSequenceFromNumbers(existing, 'A', '0001')).toBe(21);
    expect(nextInvoiceSequenceFromNumbers(existing, 'B', '0002')).toBe(31);
  });
});
