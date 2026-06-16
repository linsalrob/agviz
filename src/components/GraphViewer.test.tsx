import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GraphViewer } from './GraphViewer';
import type { AssemblyGraph } from '../graph/graphTypes';

// Cytoscape does not work in jsdom (no real DOM canvas), so mock it minimally.
vi.mock('cytoscape', () => {
  const mockCy = {
    on: vi.fn(),
    off: vi.fn(),
    elements: vi.fn().mockReturnValue({ remove: vi.fn() }),
    add: vi.fn(),
    layout: vi.fn().mockReturnValue({ run: vi.fn() }),
    one: vi.fn(),
    fit: vi.fn(),
    destroy: vi.fn(),
    use: vi.fn(),
  };
  const cytoscape = vi.fn().mockReturnValue(mockCy);
  // expose use() on the constructor itself
  (cytoscape as unknown as { use: () => void }).use = vi.fn();
  return { default: cytoscape };
});

vi.mock('cytoscape-fcose', () => ({ default: {} }));

const emptyGraph: AssemblyGraph = {
  nodes: [],
  edges: [],
  warnings: [],
  stats: { nodeCount: 0, edgeCount: 0, totalLength: 0 },
};

const tinyGraph: AssemblyGraph = {
  nodes: [
    { id: 'contig1', label: 'contig1', length: 8, tags: {} },
    { id: 'contig2', label: 'contig2', length: 8, tags: {} },
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
  stats: { nodeCount: 2, edgeCount: 1, totalLength: 16 },
};

describe('GraphViewer', () => {
  it('renders placeholder when graph is null', () => {
    render(<GraphViewer graph={null} layout="fcose" onSelect={vi.fn()} />);
    expect(screen.getByText(/upload a gfa file/i)).toBeInTheDocument();
  });

  it('renders the canvas container', () => {
    render(<GraphViewer graph={null} layout="fcose" onSelect={vi.fn()} />);
    expect(screen.getByRole('img', { name: /assembly graph canvas/i })).toBeInTheDocument();
  });

  it('renders without crashing with an empty graph', () => {
    expect(() =>
      render(<GraphViewer graph={emptyGraph} layout="fcose" onSelect={vi.fn()} />),
    ).not.toThrow();
  });

  it('renders without crashing with a tiny graph', () => {
    expect(() =>
      render(<GraphViewer graph={tinyGraph} layout="fcose" onSelect={vi.fn()} />),
    ).not.toThrow();
  });

  it('does not show placeholder when graph is provided', () => {
    render(<GraphViewer graph={tinyGraph} layout="fcose" onSelect={vi.fn()} />);
    expect(screen.queryByText(/upload a gfa file/i)).not.toBeInTheDocument();
  });

  it('accepts different layout names without crashing', () => {
    const layouts = ['fcose', 'cose', 'breadthfirst', 'circle', 'grid'] as const;
    for (const layout of layouts) {
      expect(() =>
        render(<GraphViewer graph={tinyGraph} layout={layout} onSelect={vi.fn()} />),
      ).not.toThrow();
    }
  });
});
