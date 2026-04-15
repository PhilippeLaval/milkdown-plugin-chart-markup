import { describe, expect, it, vi } from 'vitest';
import { computePrintHash, type ChartConfig } from 'mdast-util-chart-markup';
import {
  emptyState,
  insertChart,
  recordPrintResult,
  removeChart,
  selectChart,
  serializeBlock,
  updateChartConfig,
  updateChartPrint,
} from './commands.js';

const cfg = (type = 'bar'): ChartConfig => ({
  type,
  data: { labels: ['A'], datasets: [{ label: 'x', data: [1] }] },
});

describe('insertChart', () => {
  it('appends at end and selects inserted block', () => {
    const onChartChange = vi.fn();
    const s = insertChart(emptyState(), cfg(), { onChartChange });
    expect(s.blocks).toHaveLength(1);
    expect(s.selectedIndex).toBe(0);
    expect(onChartChange).toHaveBeenCalledWith(0, cfg());
  });

  it('inserts after the currently selected block', () => {
    let s = insertChart(emptyState(), cfg('bar'));
    s = insertChart(s, cfg('line')); // selected now index 1 → next insert at 2
    s = insertChart({ ...s, selectedIndex: 0 }, cfg('pie'));
    expect(s.blocks.map((b) => b.config.type)).toEqual(['bar', 'pie', 'line']);
    expect(s.selectedIndex).toBe(1);
  });
});

describe('updateChartConfig', () => {
  it('replaces the config and notifies onChartChange', () => {
    const onChartChange = vi.fn();
    let s = insertChart(emptyState(), cfg());
    s = updateChartConfig(s, 0, cfg('line'), { onChartChange });
    expect(s.blocks[0]!.config.type).toBe('line');
    expect(onChartChange).toHaveBeenCalledWith(0, cfg('line'));
  });

  it('throws on out-of-range position', () => {
    expect(() => updateChartConfig(emptyState(), 0, cfg())).toThrow(RangeError);
  });
});

describe('updateChartPrint', () => {
  it('updates print and printHash without triggering onChartChange', () => {
    const onChartChange = vi.fn();
    let s = insertChart(emptyState(), cfg(), { onChartChange });
    onChartChange.mockClear();
    s = updateChartPrint(s, 0, 'https://cdn.example.com/x.png', 'sha256:abc');
    expect(s.blocks[0]!.print).toBe('https://cdn.example.com/x.png');
    expect(s.blocks[0]!.printHash).toBe('sha256:abc');
    expect(onChartChange).not.toHaveBeenCalled();
  });
});

describe('recordPrintResult', () => {
  it('computes a fresh hash that matches the config', () => {
    let s = insertChart(emptyState(), cfg());
    s = recordPrintResult(s, 0, 'https://cdn.example.com/x.png');
    expect(s.blocks[0]!.printHash).toBe(computePrintHash(cfg()));
  });
});

describe('removeChart', () => {
  it('drops the block and clears selection when removing the selected block', () => {
    let s = insertChart(emptyState(), cfg());
    s = removeChart(s, 0);
    expect(s.blocks).toHaveLength(0);
    expect(s.selectedIndex).toBeNull();
  });

  it('decrements selectedIndex when removing a block before the selection', () => {
    let s = insertChart(emptyState(), cfg('bar'));
    s = insertChart(s, cfg('line'));
    s = insertChart(s, cfg('pie'));
    // selection now at index 2 (pie)
    s = removeChart(s, 0);
    expect(s.blocks.map((b) => b.config.type)).toEqual(['line', 'pie']);
    expect(s.selectedIndex).toBe(1);
  });

  it('leaves selectedIndex unchanged when removing a block after the selection', () => {
    let s = insertChart(emptyState(), cfg('bar'));
    s = insertChart(s, cfg('line'));
    s = insertChart(s, cfg('pie'));
    s = { ...s, selectedIndex: 0 };
    s = removeChart(s, 2);
    expect(s.blocks.map((b) => b.config.type)).toEqual(['bar', 'line']);
    expect(s.selectedIndex).toBe(0);
  });
});

describe('selectChart', () => {
  it('sets and clears selection', () => {
    let s = insertChart(emptyState(), cfg());
    s = selectChart(s, null);
    expect(s.selectedIndex).toBeNull();
    s = selectChart(s, 0);
    expect(s.selectedIndex).toBe(0);
  });

  it('validates index range', () => {
    expect(() => selectChart(emptyState(), 0)).toThrow(RangeError);
  });
});

describe('serializeBlock', () => {
  it('emits canonical JSON with print fields last when set', () => {
    let s = insertChart(emptyState(), cfg());
    s = updateChartPrint(s, 0, 'https://y', 'sha256:1');
    const out = serializeBlock(s.blocks[0]!);
    const keys = Object.keys(JSON.parse(out));
    expect(keys[keys.length - 2]).toBe('print');
    expect(keys[keys.length - 1]).toBe('printHash');
  });
});
