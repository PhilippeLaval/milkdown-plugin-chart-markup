import {
  canonicalizeChartMarkupBody,
  computePrintHash,
  type ChartConfig,
  type ChartMarkupValue,
} from 'mdast-util-chart-markup';

/**
 * Document model used by the pure command layer. It intentionally mirrors the
 * shape we care about (an ordered list of chart blocks with an optional
 * selection) so commands can be unit-tested without a real ProseMirror editor.
 *
 * The Milkdown binding (see `plugin.ts`) wraps these pure transitions in
 * actual transactions.
 */
export interface ChartBlock {
  config: ChartConfig;
  print: string | null;
  printHash: string | null;
}

export interface ChartDocState {
  blocks: ChartBlock[];
  selectedIndex: number | null;
}

export interface ChartCommandEffects {
  onChartChange: (index: number, config: ChartConfig) => void;
}

const NOOP_EFFECTS: ChartCommandEffects = { onChartChange: () => {} };

export function emptyState(): ChartDocState {
  return { blocks: [], selectedIndex: null };
}

export function insertChart(
  state: ChartDocState,
  config: ChartConfig,
  effects: ChartCommandEffects = NOOP_EFFECTS,
): ChartDocState {
  const block: ChartBlock = { config, print: null, printHash: null };
  const insertAt = state.selectedIndex != null ? state.selectedIndex + 1 : state.blocks.length;
  const blocks = [...state.blocks.slice(0, insertAt), block, ...state.blocks.slice(insertAt)];
  effects.onChartChange(insertAt, config);
  return { blocks, selectedIndex: insertAt };
}

export function updateChartConfig(
  state: ChartDocState,
  pos: number,
  config: ChartConfig,
  effects: ChartCommandEffects = NOOP_EFFECTS,
): ChartDocState {
  assertPos(state, pos);
  const blocks = state.blocks.slice();
  blocks[pos] = { ...blocks[pos]!, config };
  effects.onChartChange(pos, config);
  return { ...state, blocks };
}

export function updateChartPrint(
  state: ChartDocState,
  pos: number,
  print: string,
  printHash: string,
): ChartDocState {
  assertPos(state, pos);
  const blocks = state.blocks.slice();
  blocks[pos] = { ...blocks[pos]!, print, printHash };
  return { ...state, blocks };
}

export function removeChart(state: ChartDocState, pos: number): ChartDocState {
  assertPos(state, pos);
  const blocks = state.blocks.filter((_, i) => i !== pos);
  let selectedIndex: number | null;
  if (state.selectedIndex == null) {
    selectedIndex = null;
  } else if (state.selectedIndex === pos) {
    selectedIndex = null;
  } else if (state.selectedIndex > pos) {
    // Indices after the removed block shift down by one.
    selectedIndex = state.selectedIndex - 1;
  } else {
    selectedIndex = state.selectedIndex;
  }
  return { blocks, selectedIndex };
}

export function selectChart(state: ChartDocState, pos: number | null): ChartDocState {
  if (pos !== null) assertPos(state, pos);
  return { ...state, selectedIndex: pos };
}

/**
 * Convenience: after the host runs `onChartChange` and gets back a print URL,
 * attach it to the block and compute the expected hash so subsequent edits can
 * detect drift without a round-trip to the server.
 */
export function recordPrintResult(
  state: ChartDocState,
  pos: number,
  print: string,
): ChartDocState {
  assertPos(state, pos);
  const block = state.blocks[pos]!;
  return updateChartPrint(state, pos, print, computePrintHash(block.config));
}

/** Serialize a block back to the on-disk JSON string (print fields last). */
export function serializeBlock(block: ChartBlock): string {
  const value: ChartMarkupValue = { ...block.config };
  if (block.print) value.print = block.print;
  if (block.printHash) value.printHash = block.printHash;
  return canonicalizeChartMarkupBody(JSON.stringify(value));
}

function assertPos(state: ChartDocState, pos: number): void {
  if (pos < 0 || pos >= state.blocks.length) {
    throw new RangeError(`chart position ${pos} out of range (have ${state.blocks.length})`);
  }
}
