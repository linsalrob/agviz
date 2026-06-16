import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InspectorPanel } from './InspectorPanel';
import type { AssemblyNode, AssemblyEdge } from '../graph/graphTypes';

const sampleNode: AssemblyNode = {
  id: 'contig1',
  label: 'contig1',
  length: 8000,
  coverage: 12.4,
  degree: 2,
  sequence: 'ACGTACGT',
  tags: { LN: '8000', DP: '12.4' },
};

const sampleEdge: AssemblyEdge = {
  id: 'contig1-contig2',
  source: 'contig1',
  target: 'contig2',
  sourceOrient: '+',
  targetOrient: '-',
  overlap: '4M',
  tags: {},
};

describe('InspectorPanel – empty selection', () => {
  it('renders without crashing when nothing is selected', () => {
    render(<InspectorPanel selected={null} />);
    expect(screen.getByRole('complementary')).toBeInTheDocument();
  });

  it('shows a placeholder message when nothing is selected', () => {
    render(<InspectorPanel selected={null} />);
    expect(screen.getByText(/select a node or edge/i)).toBeInTheDocument();
  });
});

describe('InspectorPanel – node selected', () => {
  it('shows the segment heading', () => {
    render(<InspectorPanel selected={{ kind: 'node', data: sampleNode }} />);
    expect(screen.getByText(/segment/i)).toBeInTheDocument();
  });

  it('shows the segment ID', () => {
    render(<InspectorPanel selected={{ kind: 'node', data: sampleNode }} />);
    expect(screen.getAllByText('contig1').length).toBeGreaterThan(0);
  });

  it('shows the length', () => {
    render(<InspectorPanel selected={{ kind: 'node', data: sampleNode }} />);
    expect(screen.getAllByText(/8[,.]?000/).length).toBeGreaterThan(0);
  });

  it('shows coverage when available', () => {
    render(<InspectorPanel selected={{ kind: 'node', data: sampleNode }} />);
    expect(screen.getAllByText(/12\.4/).length).toBeGreaterThan(0);
  });

  it('shows degree', () => {
    render(<InspectorPanel selected={{ kind: 'node', data: sampleNode }} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows sequence preview', () => {
    render(<InspectorPanel selected={{ kind: 'node', data: sampleNode }} />);
    expect(screen.getByText(/ACGTACGT/)).toBeInTheDocument();
  });

  it('shows tag keys and values', () => {
    render(<InspectorPanel selected={{ kind: 'node', data: sampleNode }} />);
    expect(screen.getByText('LN')).toBeInTheDocument();
    expect(screen.getByText('8000')).toBeInTheDocument();
  });

  it('does not show placeholder when node is selected', () => {
    render(<InspectorPanel selected={{ kind: 'node', data: sampleNode }} />);
    expect(screen.queryByText(/select a node or edge/i)).not.toBeInTheDocument();
  });
});

describe('InspectorPanel – edge selected', () => {
  it('shows the link heading', () => {
    render(<InspectorPanel selected={{ kind: 'edge', data: sampleEdge }} />);
    expect(screen.getByText(/link/i)).toBeInTheDocument();
  });

  it('shows source and target IDs', () => {
    render(<InspectorPanel selected={{ kind: 'edge', data: sampleEdge }} />);
    expect(screen.getByText('contig1')).toBeInTheDocument();
    expect(screen.getByText('contig2')).toBeInTheDocument();
  });

  it('shows source orientation', () => {
    render(<InspectorPanel selected={{ kind: 'edge', data: sampleEdge }} />);
    expect(screen.getAllByText('+').length).toBeGreaterThan(0);
  });

  it('shows target orientation', () => {
    render(<InspectorPanel selected={{ kind: 'edge', data: sampleEdge }} />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('shows overlap / CIGAR', () => {
    render(<InspectorPanel selected={{ kind: 'edge', data: sampleEdge }} />);
    expect(screen.getByText('4M')).toBeInTheDocument();
  });
});

describe('InspectorPanel – node without optional fields', () => {
  it('renders gracefully when coverage is undefined', () => {
    const sparse: AssemblyNode = {
      id: 'sparse',
      label: 'sparse',
      tags: {},
    };
    render(<InspectorPanel selected={{ kind: 'node', data: sparse }} />);
    expect(screen.queryByText(/coverage/i)).not.toBeInTheDocument();
  });

  it('renders gracefully when length is undefined', () => {
    const sparse: AssemblyNode = {
      id: 'sparse',
      label: 'sparse',
      tags: {},
    };
    render(<InspectorPanel selected={{ kind: 'node', data: sparse }} />);
    expect(screen.queryByText(/bp/i)).not.toBeInTheDocument();
  });
});
