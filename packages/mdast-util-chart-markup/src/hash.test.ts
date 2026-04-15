import { describe, expect, it } from 'vitest';
import {
  computePrintHash,
  isPrintDrifted,
  normalizePrintHash,
  stripPrintFields,
} from './hash.js';
import type { ChartConfig, ChartMarkupValue } from './types.js';

const baseConfig: ChartConfig = {
  type: 'bar',
  data: {
    labels: ['A', 'B', 'C'],
    datasets: [{ label: 'Test', data: [1, 2, 3] }],
  },
};

describe('computePrintHash', () => {
  it('is stable across key ordering', () => {
    const reordered: ChartConfig = {
      data: {
        datasets: [{ data: [1, 2, 3], label: 'Test' }],
        labels: ['A', 'B', 'C'],
      },
      type: 'bar',
    };
    expect(computePrintHash(reordered)).toBe(computePrintHash(baseConfig));
  });

  it('excludes print and printHash fields', () => {
    const withPrint: ChartMarkupValue = {
      ...baseConfig,
      print: 'https://cdn.example.com/x.png',
      printHash: 'sha256:dead',
    };
    expect(computePrintHash(withPrint)).toBe(computePrintHash(baseConfig));
  });

  it('changes when any semantic field changes', () => {
    const changed: ChartConfig = {
      ...baseConfig,
      data: { ...baseConfig.data, datasets: [{ label: 'Test', data: [1, 2, 4] }] },
    };
    expect(computePrintHash(changed)).not.toBe(computePrintHash(baseConfig));
  });

  it('returns a sha256:<hex> prefix', () => {
    expect(computePrintHash(baseConfig)).toMatch(/^sha256:[0-9a-f]{64}$/);
  });
});

describe('isPrintDrifted', () => {
  it('is false when print/printHash match the config hash', () => {
    const hash = computePrintHash(baseConfig);
    expect(
      isPrintDrifted({ ...baseConfig, print: 'https://x.png', printHash: hash }),
    ).toBe(false);
  });

  it('is true when config edited after hash recorded', () => {
    const hash = computePrintHash(baseConfig);
    const edited: ChartMarkupValue = {
      ...baseConfig,
      data: { ...baseConfig.data, datasets: [{ label: 'Test', data: [9, 9, 9] }] },
      print: 'https://x.png',
      printHash: hash,
    };
    expect(isPrintDrifted(edited)).toBe(true);
  });

  it('is false when no print is set yet', () => {
    expect(isPrintDrifted(baseConfig as ChartMarkupValue)).toBe(false);
  });
});

describe('normalizePrintHash', () => {
  it('strips the sha256: prefix and lowercases', () => {
    expect(normalizePrintHash('sha256:ABCDEF')).toBe('abcdef');
    expect(normalizePrintHash('ABCDEF')).toBe('abcdef');
    expect(normalizePrintHash('  sha256:abc  ')).toBe('abc');
  });
});

describe('isPrintDrifted with bare-hex stored hashes', () => {
  it('treats a bare-hex stored hash the same as sha256:-prefixed', () => {
    const prefixed = computePrintHash(baseConfig); // sha256:<hex>
    const bare = prefixed.slice('sha256:'.length);
    expect(
      isPrintDrifted({ ...baseConfig, print: 'https://x.png', printHash: bare }),
    ).toBe(false);
  });
});

describe('stripPrintFields', () => {
  it('removes both fields without mutating the input', () => {
    const input: ChartMarkupValue = { ...baseConfig, print: 'x', printHash: 'y' };
    const stripped = stripPrintFields(input);
    expect(stripped).not.toHaveProperty('print');
    expect(stripped).not.toHaveProperty('printHash');
    expect(input.print).toBe('x');
  });
});
