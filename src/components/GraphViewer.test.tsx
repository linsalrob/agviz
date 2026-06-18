import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import cytoscape from 'cytoscape';
import { GraphViewer } from './GraphViewer';
import type { AssemblyGraph } from '../graph/graphTypes';

vi.mock('cytoscape', () => {
  const mockCy = {
    on: vi.fn(),
    off: vi.fn(),
    style: vi.fn(),
    elements: vi.fn().mockReturnValue({ remove: vi.fn() }),
    add: vi.fn(),
    layout: vi.fn().mockReturnValue({ run: vi.fn() }),
    one: vi.fn(),
    fit: vi.fn(),
    destroy: vi.fn(),
    use: vi.fn(),
    pan: vi.fn().mockReturnValue({ x: 0, y: 0 }),
    zoom: vi.fn().mockReturnValue(1),
    getElementById: vi.fn().mockReturnValue({ length: 0, position: () => ({ x: 0, y: 0 }) }),
  };
  const cytoscape = vi.fn().mockReturnValue(mockCy);
  (cytoscape as unknown as { use: () => void }).use = vi.fn();
  return { default: cytoscape };
});

vi.mock('cytoscape-fcose', () => ({ default: {} }));

beforeEach(() => {
  vi.clearAllMocks();
});

const emptyGraph: AssemblyGraph = {
  nodes: [],
  edges: [],
  warnings: [],
  stats: { nodeCount: 0, edgeCount: 0, totalLength: 0 },
};

const tinyGraph: AssemblyGraph = {
  nodes: [
    { id: 'contig1', label: 'contig1', length: 1000, tags: {} },
    { id: 'contig2', label: 'contig2', length: 2000, tags: {} },
  ],
  edges: [
    {
      id: 'contig1-contig2',
      source: 'contig1',
      target: 'contig2',
      sourceOrient: '+',
      targetOrient: '-',
      overlap: '4M',
      tags: {},
    },
  ],
  warnings: [],
  stats: { nodeCount: 2, edgeCount: 1, totalLength: 3000 },
};

function renderViewer(
  graph: AssemblyGraph | null,
  themeMode: 'light' | 'dark' = 'light',
  layout: 'fcose' | 'bandage' = 'fcose',
) {
  return render(
    <GraphViewer
      graph={graph}
      layout={layout}
      onSelect={vi.fn()}
      themeMode={themeMode}
      colorByCoverage={false}
    />,
  );
}

describe('GraphViewer', () => {
  it('renders placeholder when graph is null', () => {
    renderViewer(null);
    expect(screen.getByText(/upload a gfa file/i)).toBeInTheDocument();
  });

  it('renders the canvas container', () => {
    renderViewer(null);
    expect(screen.getByRole('img', { name: /assembly graph canvas/i })).toBeInTheDocument();
  });

  it('renders without crashing with an empty graph', () => {
    expect(() => renderViewer(emptyGraph)).not.toThrow();
  });

  it('renders without crashing with a tiny graph', () => {
    expect(() => renderViewer(tinyGraph)).not.toThrow();
  });

  it('does not show placeholder when graph is provided', () => {
    renderViewer(tinyGraph);
    expect(screen.queryByText(/upload a gfa file/i)).not.toBeInTheDocument();
  });

  it('uses light graph background by default', () => {
    const { container } = renderViewer(null, 'light');
    const wrapper = container.querySelector('.graph-viewer-wrapper');
    expect(wrapper).toHaveStyle({ background: 'rgb(255, 255, 255)' });
  });

  it('uses black graph background in dark theme', () => {
    const { container } = renderViewer(null, 'dark');
    const wrapper = container.querySelector('.graph-viewer-wrapper');
    expect(wrapper).toHaveStyle({ background: 'rgb(0, 0, 0)' });
  });

  it('registers edge select and tap handlers for inspector updates', () => {
    renderViewer(tinyGraph);

    const cy = vi.mocked(cytoscape).mock.results[0].value;
    expect(cy.on).toHaveBeenCalledWith('select', 'edge', expect.any(Function));
    expect(cy.on).toHaveBeenCalledWith('tap', 'edge', expect.any(Function));
  });

  it('hides Cytoscape gfa-link edges when Bandage-style overlay links are active', () => {
    renderViewer(tinyGraph, 'light', 'bandage');

    const cy = vi.mocked(cytoscape).mock.results[0].value;
    const addedElements = cy.add.mock.calls[0][0] as Array<{ classes?: string; data: { kind?: string } }>;
    const link = addedElements.find((element) => element.data.kind === 'gfa-link');
    expect(link?.classes).toBe('gfa-link bandage-overlay-hidden');
  });
});
