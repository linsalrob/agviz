import { describe, expect, it } from 'vitest';
import {
  graphToCytoscape,
  endpointId,
  mapLinkEndpoints,
  type CytoscapeGraphOptions,
} from './cytoscapeElements';
import type { AssemblyGraph } from './graphTypes';
import type { LengthScaleConfig } from './visualScale';

const sampleGraph: AssemblyGraph = {
  nodes: [
    { id: 'A', label: 'A', length: 1000, coverage: 10, degree: 1, tags: {} },
    { id: 'B', label: 'B', length: 2000, coverage: 20, degree: 1, tags: {} },
  ],
  edges: [
    {
      id: 'A-B',
      source: 'A',
      target: 'B',
      sourceOrient: '+',
      targetOrient: '-',
      overlap: '100M',
      tags: {},
    },
  ],
  warnings: [],
  stats: { nodeCount: 2, edgeCount: 1, totalLength: 3000 },
};

const testLengthScale: LengthScaleConfig = {
  mode: 'linear',
  pixelsPerBase: 0.1,
  minVisualLengthPx: 0,
  maxVisualLengthPx: 1000,
};

function buildElements(options: CytoscapeGraphOptions = {}) {
  return graphToCytoscape(sampleGraph, {
    lengthScale: testLengthScale,
    ...options,
  });
}

describe('mapLinkEndpoints', () => {
  it('maps all orientation combinations to endpoint ids', () => {
    expect(mapLinkEndpoints('A', '+', 'B', '+')).toEqual({
      sourceEndpointId: 'A::__right',
      targetEndpointId: 'B::__left',
    });
    expect(mapLinkEndpoints('A', '+', 'B', '-')).toEqual({
      sourceEndpointId: 'A::__right',
      targetEndpointId: 'B::__right',
    });
    expect(mapLinkEndpoints('A', '-', 'B', '+')).toEqual({
      sourceEndpointId: 'A::__left',
      targetEndpointId: 'B::__left',
    });
    expect(mapLinkEndpoints('A', '-', 'B', '-')).toEqual({
      sourceEndpointId: 'A::__left',
      targetEndpointId: 'B::__right',
    });
  });
});

describe('graphToCytoscape', () => {
  it('creates endpoint nodes for each segment', () => {
    const elements = buildElements();
    expect(elements.nodes).toHaveLength(4);
    const ids = elements.nodes.map((node) => node.data.id);
    expect(ids).toContain(endpointId('A', 'left'));
    expect(ids).toContain(endpointId('A', 'right'));
    expect(ids).toContain(endpointId('B', 'left'));
    expect(ids).toContain(endpointId('B', 'right'));
  });

  it('creates contig-body and gfa-link edge classes', () => {
    const elements = buildElements();
    const classes = elements.edges.map((edge) => edge.classes);
    expect(classes).toContain('contig-body');
    expect(classes).toContain('gfa-link');
  });

  it('keeps proportional visual lengths on contig-body edges', () => {
    const elements = buildElements();
    const bodyEdges = elements.edges.filter((edge) => edge.classes === 'contig-body');
    const oneKb = bodyEdges.find((edge) => edge.data.segmentId === 'A');
    const twoKb = bodyEdges.find((edge) => edge.data.segmentId === 'B');

    expect(oneKb?.data.visualLength).toBe(100);
    expect(twoKb?.data.visualLength).toBe(200);
    expect(twoKb!.data.visualLength).toBeCloseTo(oneKb!.data.visualLength * 2);
  });

  it('connects gfa-link edges to endpoint ids only', () => {
    const elements = buildElements();
    const link = elements.edges.find((edge) => edge.classes === 'gfa-link');
    expect(link?.data.source).toBe('A::__right');
    expect(link?.data.target).toBe('B::__right');
    expect(String(link?.data.source)).toContain('::__');
    expect(String(link?.data.target)).toContain('::__');
  });

  it('does not use segment IDs directly for gfa-link edge endpoints', () => {
    const elements = buildElements();
    const link = elements.edges.find((edge) => edge.classes === 'gfa-link');
    expect(link?.data.source).not.toBe('A');
    expect(link?.data.target).not.toBe('B');
  });

  it('keeps source/target segments and link metadata for inspector use', () => {
    const elements = buildElements();
    const link = elements.edges.find((edge) => edge.classes === 'gfa-link');

    expect(link?.data.sourceSegment).toBe('A');
    expect(link?.data.targetSegment).toBe('B');
    expect(link?.data.sourceOrient).toBe('+');
    expect(link?.data.targetOrient).toBe('-');
    expect(link?.data.overlap).toBe('100M');
    expect(link?.data.reciprocalMemberCount).toBe(1);
  });

  it('deduplicates reciprocal links into one visible gfa-link edge', () => {
    const reciprocalGraph: AssemblyGraph = {
      nodes: [
        { id: 'A', label: 'A', length: 1000, tags: {} },
        { id: 'B', label: 'B', length: 1000, tags: {} },
      ],
      edges: [
        {
          id: 'A-B',
          source: 'A',
          target: 'B',
          sourceOrient: '+',
          targetOrient: '+',
          overlap: '100M',
          tags: {},
          raw: 'L\tA\t+\tB\t+\t100M',
        },
        {
          id: 'B-A',
          source: 'B',
          target: 'A',
          sourceOrient: '-',
          targetOrient: '-',
          overlap: '100M',
          tags: {},
          raw: 'L\tB\t-\tA\t-\t100M',
        },
      ],
      warnings: [],
      stats: { nodeCount: 2, edgeCount: 2, totalLength: 2000 },
    };

    const elements = graphToCytoscape(reciprocalGraph, { lengthScale: testLengthScale });
    const links = elements.edges.filter((edge) => edge.classes === 'gfa-link');

    expect(links).toHaveLength(1);
    expect(links[0].data.source).toBe('A::__right');
    expect(links[0].data.target).toBe('B::__left');
    expect(links[0].data.reciprocalMemberCount).toBe(2);
    expect(links[0].data.reciprocalMembers).toEqual(['A-B', 'B-A']);
    expect(links[0].data.rawLinks).toEqual(['L\tA\t+\tB\t+\t100M', 'L\tB\t-\tA\t-\t100M']);
  });

  it('keeps distinct parallel links when orientations differ', () => {
    const parallelGraph: AssemblyGraph = {
      nodes: [
        { id: 'A', label: 'A', length: 1000, tags: {} },
        { id: 'B', label: 'B', length: 1000, tags: {} },
      ],
      edges: [
        {
          id: 'A-B-pp',
          source: 'A',
          target: 'B',
          sourceOrient: '+',
          targetOrient: '+',
          overlap: '100M',
          tags: {},
        },
        {
          id: 'A-B-pm',
          source: 'A',
          target: 'B',
          sourceOrient: '+',
          targetOrient: '-',
          overlap: '100M',
          tags: {},
        },
      ],
      warnings: [],
      stats: { nodeCount: 2, edgeCount: 2, totalLength: 2000 },
    };

    const elements = graphToCytoscape(parallelGraph, { lengthScale: testLengthScale });
    const links = elements.edges.filter((edge) => edge.classes === 'gfa-link');
    expect(links).toHaveLength(2);
  });

  it('deduplicates reciprocal self-loop duplicates', () => {
    const selfLoopGraph: AssemblyGraph = {
      nodes: [{ id: 'A', label: 'A', length: 1000, tags: {} }],
      edges: [
        {
          id: 'loop1',
          source: 'A',
          target: 'A',
          sourceOrient: '+',
          targetOrient: '-',
          overlap: '100M',
          tags: {},
        },
        {
          id: 'loop2',
          source: 'A',
          target: 'A',
          sourceOrient: '+',
          targetOrient: '-',
          overlap: '100M',
          tags: {},
        },
      ],
      warnings: [],
      stats: { nodeCount: 1, edgeCount: 2, totalLength: 1000 },
    };

    const elements = graphToCytoscape(selfLoopGraph, { lengthScale: testLengthScale });
    const links = elements.edges.filter((edge) => edge.classes === 'gfa-link');
    expect(links).toHaveLength(1);
    expect(links[0].data.reciprocalMemberCount).toBe(2);
  });

  it('uses default contig color when coverage coloring is disabled', () => {
    const elements = buildElements({ colorByCoverage: false, themeMode: 'light' });
    const body = elements.edges.find((edge) => edge.classes === 'contig-body');
    expect(body?.data.color).toBe('#2563eb');
  });

  it('uses coverage color map when enabled and neutral fallback for missing coverage', () => {
    const graph: AssemblyGraph = {
      ...sampleGraph,
      nodes: [
        ...sampleGraph.nodes,
        { id: 'C', label: 'C', length: 500, coverage: undefined, tags: {}, degree: 0 },
      ],
      stats: { nodeCount: 3, edgeCount: 1, totalLength: 3500 },
    };

    const elements = graphToCytoscape(graph, {
      colorByCoverage: true,
      themeMode: 'light',
      lengthScale: testLengthScale,
    });

    const aBody = elements.edges.find(
      (edge) => edge.classes === 'contig-body' && edge.data.segmentId === 'A',
    );
    const cBody = elements.edges.find(
      (edge) => edge.classes === 'contig-body' && edge.data.segmentId === 'C',
    );

    expect(String(aBody?.data.color)).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
    expect(cBody?.data.color).toBe('#94a3b8');
  });

  it('handles empty graph', () => {
    const empty: AssemblyGraph = {
      nodes: [],
      edges: [],
      warnings: [],
      stats: { nodeCount: 0, edgeCount: 0, totalLength: 0 },
    };

    const elements = graphToCytoscape(empty);
    expect(elements.nodes).toHaveLength(0);
    expect(elements.edges).toHaveLength(0);
  });
});
