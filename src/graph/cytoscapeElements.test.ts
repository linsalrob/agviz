import { describe, it, expect } from 'vitest';
import { graphToCytoscape } from './cytoscapeElements';
import type { AssemblyGraph } from './graphTypes';
import { MIN_CONTIG_WIDTH } from './visualScale';

const sampleGraph: AssemblyGraph = {
  nodes: [
    { id: 'a', label: 'a', length: 100, coverage: 5, degree: 1, tags: {} },
    { id: 'b', label: 'b', length: 200, coverage: 10, degree: 1, tags: {} },
  ],
  edges: [
    {
      id: 'a-b',
      source: 'a',
      target: 'b',
      sourceOrient: '+',
      targetOrient: '+',
      overlap: '10M',
      tags: {},
    },
  ],
  warnings: [],
  stats: { nodeCount: 2, edgeCount: 1, totalLength: 300 },
};

describe('graphToCytoscape', () => {
  it('produces correct number of nodes', () => {
    const elements = graphToCytoscape(sampleGraph);
    expect(elements.nodes).toHaveLength(2);
  });

  it('produces correct number of edges', () => {
    const elements = graphToCytoscape(sampleGraph);
    expect(elements.edges).toHaveLength(1);
  });

  it('node data includes id and label', () => {
    const elements = graphToCytoscape(sampleGraph);
    expect(elements.nodes[0].data.id).toBe('a');
    expect(elements.nodes[0].data['label']).toBe('a');
  });

  it('node data includes length and coverage', () => {
    const elements = graphToCytoscape(sampleGraph);
    expect(elements.nodes[0].data['length']).toBe(100);
    expect(elements.nodes[0].data['coverage']).toBe(5);
  });

  it('node data includes visual width and height', () => {
    const elements = graphToCytoscape(sampleGraph);
    expect(typeof elements.nodes[0].data['width']).toBe('number');
    expect(typeof elements.nodes[0].data['height']).toBe('number');
    expect(elements.nodes[1].data['width']).toBeGreaterThan(elements.nodes[0].data['width']);
  });

  it('uses minimum width when node length is unavailable', () => {
    const graph: AssemblyGraph = {
      ...sampleGraph,
      nodes: [{ id: 'unknown', label: 'unknown', tags: {} }],
      edges: [],
      stats: { nodeCount: 1, edgeCount: 0, totalLength: 0 },
    };
    const elements = graphToCytoscape(graph);
    expect(elements.nodes[0].data['width']).toBe(MIN_CONTIG_WIDTH);
  });

  it('edge data includes source and target', () => {
    const elements = graphToCytoscape(sampleGraph);
    expect(elements.edges[0].data.source).toBe('a');
    expect(elements.edges[0].data.target).toBe('b');
  });

  it('edge data includes orientation and overlap', () => {
    const elements = graphToCytoscape(sampleGraph);
    expect(elements.edges[0].data['sourceOrient']).toBe('+');
    expect(elements.edges[0].data['overlap']).toBe('10M');
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

// ── regression: label must reflect real segment ID ───────────────────────────

describe('graphToCytoscape – regression: no hardcoded labels', () => {
  it('node label equals the real segment ID', () => {
    const elements = graphToCytoscape(sampleGraph);
    expect(elements.nodes[0].data['label']).toBe('a');
    expect(elements.nodes[1].data['label']).toBe('b');
  });

  it('no node label is the generic string "Node"', () => {
    const elements = graphToCytoscape(sampleGraph);
    const labels = elements.nodes.map((n) => n.data['label']);
    expect(labels).not.toContain('Node');
  });
});

// ── regression: longer contigs get wider nodes ────────────────────────────────

describe('graphToCytoscape – regression: width scales with length', () => {
  it('longer node is visually wider', () => {
    const elements = graphToCytoscape(sampleGraph);
    // node a has length 100, node b has length 200
    expect(elements.nodes[1].data['width']).toBeGreaterThan(
      elements.nodes[0].data['width'],
    );
  });
});

// ── tags preserved in node data ───────────────────────────────────────────────

describe('graphToCytoscape – tags in node data', () => {
  it('node data includes the tags object', () => {
    const graphWithTags: AssemblyGraph = {
      nodes: [{ id: 'x', label: 'x', length: 50, tags: { LN: '50', DP: '3.2' } }],
      edges: [],
      warnings: [],
      stats: { nodeCount: 1, edgeCount: 0, totalLength: 50 },
    };
    const elements = graphToCytoscape(graphWithTags);
    const tags = elements.nodes[0].data['tags'] as Record<string, string>;
    expect(tags['LN']).toBe('50');
    expect(tags['DP']).toBe('3.2');
  });
});

// ── edge data completeness ────────────────────────────────────────────────────

describe('graphToCytoscape – edge data completeness', () => {
  it('edge data has id, source, target, sourceOrient, targetOrient, overlap', () => {
    const elements = graphToCytoscape(sampleGraph);
    const edge = elements.edges[0].data;
    expect(edge.id).toBe('a-b');
    expect(edge.source).toBe('a');
    expect(edge.target).toBe('b');
    expect(edge['sourceOrient']).toBe('+');
    expect(edge['targetOrient']).toBe('+');
    expect(edge['overlap']).toBe('10M');
  });

  it('edge data includes tags object', () => {
    const elements = graphToCytoscape(sampleGraph);
    expect(elements.edges[0].data['tags']).toBeDefined();
  });
});

// ── self-loop edge ────────────────────────────────────────────────────────────

describe('graphToCytoscape – self-loop', () => {
  it('self-loop edge has same source and target', () => {
    const selfLoopGraph: AssemblyGraph = {
      nodes: [{ id: 'A', label: 'A', length: 8, tags: {} }],
      edges: [
        {
          id: 'A-A',
          source: 'A',
          target: 'A',
          sourceOrient: '+',
          targetOrient: '-',
          overlap: '4M',
          tags: {},
        },
      ],
      warnings: [],
      stats: { nodeCount: 1, edgeCount: 1, totalLength: 8 },
    };
    const elements = graphToCytoscape(selfLoopGraph);
    expect(elements.nodes).toHaveLength(1);
    expect(elements.edges).toHaveLength(1);
    expect(elements.edges[0].data.source).toBe('A');
    expect(elements.edges[0].data.target).toBe('A');
  });
});
