import { describe, expect, it, vi } from 'vitest';
import { chartMarkupPlugin } from './plugin.js';
import { chartMarkupKeymap } from './keymap.js';
import { chartMarkupNodeSpec, CHART_MARKUP_NODE_NAME } from './node-spec.js';

describe('chartMarkupPlugin', () => {
  it('returns a manifest referencing the chart node spec and keymap', () => {
    const manifest = chartMarkupPlugin();
    expect(manifest.name).toBe('chartMarkup');
    expect(manifest.nodeName).toBe(CHART_MARKUP_NODE_NAME);
    expect(manifest.nodeSpec).toBe(chartMarkupNodeSpec);
    expect(manifest.keymap).toBe(chartMarkupKeymap);
    expect(manifest.options.showDriftWarning).toBe(true);
  });

  it('lets the host override showDriftWarning', () => {
    const manifest = chartMarkupPlugin({ showDriftWarning: false });
    expect(manifest.options.showDriftWarning).toBe(false);
  });

  it('stores the onChartChange callback', () => {
    const onChartChange = vi.fn();
    const manifest = chartMarkupPlugin({ onChartChange });
    expect(manifest.options.onChartChange).toBe(onChartChange);
  });

  it('exposes the default chart template factory', () => {
    const cfg = chartMarkupPlugin().createDefaultChartConfig();
    expect(cfg.type).toBe('bar');
    expect(cfg.data.datasets).toHaveLength(1);
  });
});

describe('chartMarkupNodeSpec', () => {
  it('is atom + isolating + block group', () => {
    expect(chartMarkupNodeSpec.atom).toBe(true);
    expect(chartMarkupNodeSpec.isolating).toBe(true);
    expect(chartMarkupNodeSpec.group).toBe('block');
  });

  it('declares config/print/printHash/lang attrs', () => {
    expect(Object.keys(chartMarkupNodeSpec.attrs).sort()).toEqual([
      'config',
      'lang',
      'print',
      'printHash',
    ]);
  });

  it('toDOM emits data attributes', () => {
    const [tag, attrs] = chartMarkupNodeSpec.toDOM({
      attrs: { config: '{"type":"bar"}', print: null, printHash: null },
    });
    expect(tag).toBe('div');
    expect((attrs as Record<string, string>)['data-chart-markup']).toBe('true');
    expect((attrs as Record<string, string>)['data-config']).toBe('{"type":"bar"}');
  });
});

describe('chartMarkupKeymap', () => {
  it('binds Mod-Alt-c to insertDefaultChart', () => {
    expect(chartMarkupKeymap['Mod-Alt-c']).toBe('insertDefaultChart');
  });
});
