import { useEffect, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  Chart,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  ArcElement,
  DoughnutController,
  PieController,
  RadarController,
  RadialLinearScale,
  PolarAreaController,
  BubbleController,
  ScatterController,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import {
  CHART_MARKUP_NODE_TYPE,
  canonicalStringify,
  computePrintHash,
  extractChartBlocks,
  isPrintDrifted,
  parseChartMarkup,
  type ChartConfig,
} from 'mdast-util-chart-markup';
import { ChartToolbar, type ChartType } from '@philippe-laval/plugin-chart-markup-react';
import {
  chartMarkupNodeSpec,
  mountChartNodeView,
  type ChartNodeViewHandle,
} from '@philippe-laval/plugin-chart-markup';
import { EditorState } from 'prosemirror-state';
import { EditorView, type NodeView as PMNodeView } from 'prosemirror-view';
import { Schema, type Node as PMNode } from 'prosemirror-model';
import { schema as basicSchema } from 'prosemirror-schema-basic';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap } from 'prosemirror-commands';
import { history, redo, undo } from 'prosemirror-history';
import { SAMPLES, type Sample } from './samples.js';

Chart.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  ArcElement,
  DoughnutController,
  PieController,
  RadarController,
  RadialLinearScale,
  PolarAreaController,
  BubbleController,
  ScatterController,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const PALETTE = ['#38bdf8', '#f472b6', '#fbbf24', '#34d399', '#a78bfa', '#fb923c'];
Chart.defaults.color = '#e2e8f0';
Chart.defaults.borderColor = 'rgba(148, 163, 184, 0.35)';
Chart.defaults.font.family = 'system-ui, -apple-system, "Segoe UI", sans-serif';
Chart.defaults.plugins.title.color = '#f8fafc';
Chart.defaults.plugins.title.font = { size: 16, weight: 'bold' };

function applyPalette(config: any) {
  const datasets = Array.isArray(config?.data?.datasets) ? config.data.datasets : [];
  datasets.forEach((ds: any, i: number) => {
    const color = PALETTE[i % PALETTE.length];
    if (ds.backgroundColor == null) {
      if (config.type === 'pie' || config.type === 'doughnut' || config.type === 'polarArea') {
        ds.backgroundColor = PALETTE.slice(0, (ds.data ?? []).length);
      } else {
        ds.backgroundColor = color;
      }
    }
    if (ds.borderColor == null) ds.borderColor = color;
    if (ds.borderWidth == null) ds.borderWidth = 2;
    if ((config.type === 'line' || config.type === 'radar') && ds.pointBackgroundColor == null) {
      ds.pointBackgroundColor = color;
    }
  });
  return config;
}

const schema = new Schema({
  nodes: (basicSchema.spec.nodes as any).addToEnd('chartMarkup', chartMarkupNodeSpec),
  marks: basicSchema.spec.marks,
});

function parseMarkdownToDoc(markdown: string): PMNode {
  const blocks = extractChartBlocks(markdown);
  const lines = markdown.split('\n');
  const nodes: PMNode[] = [];
  let cursor = 0;
  for (const block of blocks) {
    if (block.startLine > cursor) {
      nodes.push(...proseLinesToNodes(lines.slice(cursor, block.startLine)));
    }
    const parsed = block.parsed;
    if (parsed.type === CHART_MARKUP_NODE_TYPE) {
      nodes.push(
        schema.nodes.chartMarkup.create({
          config: canonicalStringify(parsed.config),
          print: parsed.print ?? null,
          printHash: parsed.printHash ?? null,
        }),
      );
    } else {
      // Keep the bad body verbatim so the NodeView can surface the error state.
      nodes.push(
        schema.nodes.chartMarkup.create({
          config: block.raw,
          print: null,
          printHash: null,
        }),
      );
    }
    cursor = block.endLine + 1;
  }
  if (cursor < lines.length) {
    nodes.push(...proseLinesToNodes(lines.slice(cursor)));
  }
  if (nodes.length === 0) {
    nodes.push(schema.nodes.paragraph.create());
  }
  return schema.nodes.doc.create(null, nodes);
}

function proseLinesToNodes(lines: string[]): PMNode[] {
  const nodes: PMNode[] = [];
  let buffer: string[] = [];
  const flush = () => {
    const text = buffer.join(' ').trim();
    if (text) nodes.push(schema.nodes.paragraph.create(null, schema.text(text)));
    buffer = [];
  };
  for (const line of lines) {
    const heading = /^(#{1,6})\s+(.*)/.exec(line);
    if (heading) {
      flush();
      const level = heading[1]!.length;
      nodes.push(schema.nodes.heading.create({ level }, schema.text(heading[2]!)));
      continue;
    }
    if (line.trim() === '') {
      flush();
    } else {
      buffer.push(line);
    }
  }
  flush();
  return nodes;
}

function computeChartIndex(doc: PMNode, targetPos: number): number {
  let index = 0;
  doc.descendants((node, pos) => {
    if (pos >= targetPos) return false;
    if (node.type.name === 'chartMarkup') index += 1;
    return false;
  });
  return index;
}

export interface EditConfigRequest {
  initial: string;
  onCommit: (next: string) => void;
}

export type EditConfigOpener = (request: EditConfigRequest) => void;

class ChartMarkupNodeView implements PMNodeView {
  dom: HTMLElement;
  private handle: ChartNodeViewHandle;
  private toolbarContainer: HTMLDivElement;
  private toolbarRoot: Root;
  private node: PMNode;
  private view: EditorView;
  private getPos: () => number | undefined;
  private openEditor: EditConfigOpener;

  constructor(
    node: PMNode,
    view: EditorView,
    getPos: () => number | undefined,
    openEditor: EditConfigOpener,
  ) {
    this.node = node;
    this.view = view;
    this.getPos = getPos;
    this.openEditor = openEditor;

    this.handle = mountChartNodeView(
      document,
      {
        rawJson: node.attrs.config,
        print: node.attrs.print,
        printHash: node.attrs.printHash,
      },
      {
        chartFactory: (canvas, config) =>
          new Chart(canvas, applyPalette(structuredClone(config)) as any) as any,
        showDriftWarning: true,
      },
    );
    this.dom = this.handle.dom;
    this.dom.contentEditable = 'false';

    this.toolbarContainer = document.createElement('div');
    this.dom.appendChild(this.toolbarContainer);
    this.toolbarRoot = createRoot(this.toolbarContainer);

    this.refreshDomMetadata();
    this.renderToolbar();
  }

  private refreshDomMetadata(): void {
    const pos = this.getPos();
    const index = pos == null ? 0 : computeChartIndex(this.view.state.doc, pos);
    this.dom.setAttribute('data-testid', `chart-${index}`);

    const parsed = parseChartMarkup(this.node.attrs.config);
    if (parsed.type === CHART_MARKUP_NODE_TYPE) {
      this.dom.setAttribute('data-chart-type', parsed.config.type);
    } else {
      this.dom.removeAttribute('data-chart-type');
    }

    const driftBadge = this.dom.querySelector<HTMLElement>('.chart-markup-drift-badge');
    if (driftBadge) driftBadge.setAttribute('data-testid', `chart-${index}-drift`);
  }

  private renderToolbar(): void {
    const parsed = parseChartMarkup(this.node.attrs.config);
    if (parsed.type !== CHART_MARKUP_NODE_TYPE) {
      this.toolbarRoot.render(<></>);
      return;
    }
    const drifted = !!(
      this.node.attrs.print &&
      this.node.attrs.printHash &&
      isPrintDrifted({
        ...parsed.config,
        print: this.node.attrs.print,
        printHash: this.node.attrs.printHash,
      })
    );
    this.toolbarRoot.render(
      <ChartToolbar
        config={parsed.config}
        driftWarning={drifted}
        onTypeChange={(t) => this.changeType(t)}
        onEditConfig={() => this.editConfig()}
        onRefreshPrint={() => this.refreshPrint()}
        onDelete={() => this.deleteSelf()}
      />,
    );
  }

  private updateAttrs(patch: Partial<PMNode['attrs']>): void {
    const pos = this.getPos();
    if (pos == null) return;
    const tr = this.view.state.tr.setNodeMarkup(pos, undefined, {
      ...this.node.attrs,
      ...patch,
    });
    this.view.dispatch(tr);
  }

  private changeType(type: ChartType): void {
    const parsed = parseChartMarkup(this.node.attrs.config);
    if (parsed.type !== CHART_MARKUP_NODE_TYPE) return;
    const nextConfig: ChartConfig = { ...parsed.config, type };
    this.updateAttrs({
      config: canonicalStringify(nextConfig),
      // Any existing print image is now stale; keep the URL so drift surfaces.
    });
  }

  private editConfig(): void {
    this.openEditor({
      initial: this.node.attrs.config,
      onCommit: (next) => this.updateAttrs({ config: next }),
    });
  }

  private refreshPrint(): void {
    const parsed = parseChartMarkup(this.node.attrs.config);
    if (parsed.type !== CHART_MARKUP_NODE_TYPE) return;
    const pos = this.getPos();
    const index = pos == null ? 0 : computeChartIndex(this.view.state.doc, pos);
    this.updateAttrs({
      print: `https://cdn.example.com/chart-${index}.png`,
      printHash: computePrintHash(parsed.config),
    });
  }

  private deleteSelf(): void {
    const pos = this.getPos();
    if (pos == null) return;
    const tr = this.view.state.tr.delete(pos, pos + this.node.nodeSize);
    this.view.dispatch(tr);
  }

  update(next: PMNode): boolean {
    if (next.type !== this.node.type) return false;
    const prev = this.node;
    this.node = next;
    if (
      next.attrs.config !== prev.attrs.config ||
      next.attrs.print !== prev.attrs.print ||
      next.attrs.printHash !== prev.attrs.printHash
    ) {
      this.handle.update(next.attrs.config, next.attrs.print, next.attrs.printHash);
    }
    this.refreshDomMetadata();
    this.renderToolbar();
    return true;
  }

  stopEvent(): boolean {
    // The chart container owns its own pointer interactions (toolbar buttons,
    // Chart.js tooltips). Don't let ProseMirror reinterpret them as selection
    // changes.
    return true;
  }

  ignoreMutation(): boolean {
    return true;
  }

  destroy(): void {
    this.handle.destroy();
    const root = this.toolbarRoot;
    // React warns if unmount happens synchronously inside a render; defer.
    queueMicrotask(() => root.unmount());
  }
}

function createEditorState(doc: PMNode): EditorState {
  return EditorState.create({
    doc,
    plugins: [
      history(),
      keymap({ 'Mod-z': undo, 'Mod-y': redo, 'Mod-Shift-z': redo }),
      keymap(baseKeymap),
    ],
  });
}

export function App(): JSX.Element {
  const [activeId, setActiveId] = useState<Sample['id']>(SAMPLES[0]!.id);
  const [localFile, setLocalFile] = useState<{ name: string; source: string } | null>(null);
  const active = localFile
    ? { id: '__local__', title: localFile.name, source: localFile.source }
    : SAMPLES.find((s) => s.id === activeId) ?? SAMPLES[0]!;
  const editorHostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [chartCount, setChartCount] = useState(0);
  const [editRequest, setEditRequest] = useState<EditConfigRequest | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Kept in a ref so the NodeView factory sees the latest opener without being
  // re-registered on every render.
  const openEditorRef = useRef<EditConfigOpener>(() => {});
  openEditorRef.current = (request) => setEditRequest(request);

  const handleFileOpen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      setLocalFile({ name: file.name, source: text });
      setActiveId('__local__');
    });
    // Reset so the same file can be re-selected
    e.target.value = '';
  };

  useEffect(() => {
    if (!editorHostRef.current) return;
    const view = new EditorView(editorHostRef.current, {
      state: createEditorState(parseMarkdownToDoc(active.source)),
      nodeViews: {
        chartMarkup: (node, nodeView, getPos) =>
          new ChartMarkupNodeView(node, nodeView, getPos, (r) => openEditorRef.current(r)),
      },
      dispatchTransaction(tr) {
        const next = view.state.apply(tr);
        view.updateState(next);
        setChartCount(countCharts(next.doc));
      },
    });
    viewRef.current = view;
    setChartCount(countCharts(view.state.doc));
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Mount once — sample switching is handled in a separate effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.updateState(createEditorState(parseMarkdownToDoc(active.source)));
    setChartCount(countCharts(view.state.doc));
  }, [activeId, localFile]);

  return (
    <div className="playground">
      <aside className="playground-sidebar">
        <h1>chart-markup playground</h1>
        <p className="playground-intro">
          First-class chart blocks in a ProseMirror editor. Type prose, drag charts, and use the
          floating toolbar to change type, edit JSON, refresh the print, or delete a block.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.markdown,text/markdown"
          hidden
          onChange={handleFileOpen}
        />
        <button
          type="button"
          className="playground-open-file"
          onClick={() => fileInputRef.current?.click()}
        >
          Open file&hellip;
        </button>
        {localFile && (
          <>
            <h2>Loaded file</h2>
            <ul>
              <li>
                <button
                  type="button"
                  aria-current={activeId === '__local__'}
                  onClick={() => setActiveId('__local__')}
                >
                  {localFile.name}
                </button>
              </li>
            </ul>
          </>
        )}
        <h2>Samples</h2>
        <ul>
          {SAMPLES.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                data-testid={`sample-${s.id}`}
                aria-current={s.id === activeId && !localFile}
                onClick={() => {
                  setLocalFile(null);
                  setActiveId(s.id);
                }}
              >
                {s.title}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="playground-editor playground-editor--pm">
        <h2>Document</h2>
        <div data-testid="playground-chart-count" hidden>
          {chartCount}
        </div>
        <div
          ref={editorHostRef}
          className="playground-document"
          data-testid="playground-document"
        />
      </section>

      {editRequest && (
        <ChartConfigDialog
          request={editRequest}
          onClose={() => setEditRequest(null)}
        />
      )}
    </div>
  );
}

function ChartConfigDialog(props: {
  request: EditConfigRequest;
  onClose: () => void;
}): JSX.Element {
  const [draft, setDraft] = useState(() => prettyPrintJson(props.request.initial));
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
    textareaRef.current?.select();
  }, []);

  useEffect(() => {
    setError(validateChartJson(draft));
  }, [draft]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [props]);

  const save = () => {
    const err = validateChartJson(draft);
    if (err) {
      setError(err);
      return;
    }
    props.request.onCommit(draft);
    props.onClose();
  };

  return (
    <div
      className="chart-config-dialog-backdrop"
      data-testid="chart-config-dialog"
      role="dialog"
      aria-modal="true"
      aria-label="Edit chart configuration"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div className="chart-config-dialog">
        <header className="chart-config-dialog__header">
          <h3>Edit chart JSON</h3>
          <button
            type="button"
            className="chart-config-dialog__close"
            aria-label="Close"
            onClick={props.onClose}
          >
            ×
          </button>
        </header>
        <textarea
          ref={textareaRef}
          data-testid="chart-config-dialog-textarea"
          className="chart-config-dialog__textarea"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          spellCheck={false}
          rows={24}
        />
        {error ? (
          <p
            className="chart-config-dialog__error"
            data-testid="chart-config-dialog-error"
            role="alert"
          >
            {error}
          </p>
        ) : (
          <p className="chart-config-dialog__ok" data-testid="chart-config-dialog-ok">
            ✓ Valid chart JSON
          </p>
        )}
        <footer className="chart-config-dialog__footer">
          <button type="button" onClick={props.onClose}>
            Cancel
          </button>
          <button
            type="button"
            data-testid="chart-config-dialog-save"
            disabled={error != null}
            onClick={save}
          >
            Save
          </button>
        </footer>
      </div>
    </div>
  );
}

function prettyPrintJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    // Keep the user's original text so they can fix it in place instead of
    // losing context to a stringify pass.
    return raw;
  }
}

function validateChartJson(raw: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return `Invalid JSON: ${(error as Error).message}`;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return 'Chart config must be a JSON object.';
  }
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.type !== 'string' || obj.type.trim() === '') {
    return 'Missing required string field "type".';
  }
  if (!obj.data || typeof obj.data !== 'object' || Array.isArray(obj.data)) {
    return 'Missing required object field "data".';
  }
  const data = obj.data as Record<string, unknown>;
  if (!Array.isArray(data.datasets)) {
    return 'Field "data.datasets" must be an array.';
  }
  return null;
}

function countCharts(doc: PMNode): number {
  let n = 0;
  doc.descendants((node) => {
    if (node.type.name === 'chartMarkup') n += 1;
    return false;
  });
  return n;
}
