/**
 * Keyboard bindings for the chart plugin. We expose them as a plain table so
 * host editors can register them into whatever keymap plugin they use and tests
 * can assert the wiring without instantiating ProseMirror.
 */
export const chartMarkupKeymap = {
  'Mod-Alt-c': 'insertDefaultChart',
  Escape: 'deselectChartWhenFocused',
  Backspace: 'removeChartWhenSelected',
  Delete: 'removeChartWhenSelected',
} as const;

export type ChartMarkupKeymapCommand = (typeof chartMarkupKeymap)[keyof typeof chartMarkupKeymap];
