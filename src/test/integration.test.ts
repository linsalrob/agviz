/**
 * Integration tests: full data path
 * GFA text → parseGfa → ParsedGfa → gfaToGraph → AssemblyGraph → graphToCytoscape → CytoscapeElements
 */
import { describe, it, expect } from 'vitest';
import { parseGfa } from '../gfa/parseGfa';
import { gfaToGraph } from '../gfa/gfaToGraph';
import { graphToCytoscape } from '../graph/cytoscapeElements';
import { MIN_CONTIG_WIDTH } from '../graph/visualScale';
import tinyGfa from './fixtures/tiny.gfa?raw';
import lengthContrastGfa from './fixtures/length_contrast.gfa?raw';
import missingLnGfa from './fixtures/missing_ln.gfa?raw';
import selfLoopGfa from './fixtures/self_loop.gfa?raw';
import disconnectedGfa from './fixtures/disconnected_components.gfa?raw';

// ── tiny.gfa full path ────────────────────────────────────────────────────────

describe('integration: tiny.gfa full data path', () => {
  const parsed = parseGfa(tinyGfa);
  const graph = gfaToGraph(parsed);
  const elements = graphToCytoscape(graph);

  it('produces 2 Cytoscape nodes', () => {
    expect(elements.nodes).toHaveLength(2);
  });

  it('produces 1 Cytoscape edge', () => {
    expect(elements.edges).toHaveLength(1);
  });

  it('node labels are contig1 and contig2', () => {
    const labels = elements.nodes.map((n) => n.data['label']);
    expect(labels).toContain('contig1');
    expect(labels).toContain('contig2');
  });

  it('no node label is "Node"', () => {
    const labels = elements.nodes.map((n) => n.data['label']);
    expect(labels).not.toContain('Node');
  });

  it('node widths are present and positive', () => {
    for (const node of elements.nodes) {
      expect(typeof node.data['width']).toBe('number');
      expect(node.data['width'] as number).toBeGreaterThan(0);
    }
  });

  it('edge has correct source and target', () => {
    expect(elements.edges[0].data.source).toBe('contig1');
    expect(elements.edges[0].data.target).toBe('contig2');
  });

  it('edge has source and target orientation metadata', () => {
    expect(elements.edges[0].data['sourceOrient']).toBe('+');
    expect(elements.edges[0].data['targetOrient']).toBe('-');
  });

  it('edge has overlap', () => {
    expect(elements.edges[0].data['overlap']).toBe('4M');
  });

  it('no warnings from valid GFA', () => {
    expect(graph.warnings).toHaveLength(0);
  });
});

// ── length_contrast.gfa full path ────────────────────────────────────────────

describe('integration: length_contrast.gfa full data path', () => {
  const elements = graphToCytoscape(gfaToGraph(parseGfa(lengthContrastGfa)));

  it('produces 3 nodes', () => {
    expect(elements.nodes).toHaveLength(3);
  });

  it('widths increase with contig length', () => {
    const byName = Object.fromEntries(
      elements.nodes.map((n) => [n.data.id as string, n.data['width'] as number]),
    );
    expect(byName['short']).toBeLessThan(byName['medium']);
    expect(byName['medium']).toBeLessThan(byName['long']);
  });

  it('no node label is "Node"', () => {
    const labels = elements.nodes.map((n) => n.data['label']);
    expect(labels).not.toContain('Node');
  });
});

// ── missing_ln.gfa full path ─────────────────────────────────────────────────

describe('integration: missing_ln.gfa full data path', () => {
  const elements = graphToCytoscape(gfaToGraph(parseGfa(missingLnGfa)));

  it('produces 1 node', () => {
    expect(elements.nodes).toHaveLength(1);
  });

  it('node width falls back to minimum when length is undefined', () => {
    expect(elements.nodes[0].data['width']).toBe(MIN_CONTIG_WIDTH);
  });

  it('does not crash', () => {
    expect(elements.nodes).toBeDefined();
  });
});

// ── self_loop.gfa full path ───────────────────────────────────────────────────

describe('integration: self_loop.gfa full data path', () => {
  const elements = graphToCytoscape(gfaToGraph(parseGfa(selfLoopGfa)));

  it('produces 1 node and 1 edge', () => {
    expect(elements.nodes).toHaveLength(1);
    expect(elements.edges).toHaveLength(1);
  });

  it('self-loop edge has same source and target', () => {
    expect(elements.edges[0].data.source).toBe('A');
    expect(elements.edges[0].data.target).toBe('A');
  });

  it('does not crash in Cytoscape element conversion', () => {
    expect(elements).toBeDefined();
  });
});

// ── disconnected_components.gfa full path ────────────────────────────────────

describe('integration: disconnected_components.gfa full data path', () => {
  const elements = graphToCytoscape(gfaToGraph(parseGfa(disconnectedGfa)));

  it('produces 3 nodes', () => {
    expect(elements.nodes).toHaveLength(3);
  });

  it('produces 1 edge', () => {
    expect(elements.edges).toHaveLength(1);
  });

  it('all nodes have a positive width', () => {
    for (const node of elements.nodes) {
      expect(node.data['width'] as number).toBeGreaterThan(0);
    }
  });
});

// ── regression tests ──────────────────────────────────────────────────────────

describe('regression: nodes never labelled "Node"', () => {
  it('tiny.gfa labels are real segment IDs', () => {
    const elements = graphToCytoscape(gfaToGraph(parseGfa(tinyGfa)));
    const labels = elements.nodes.map((n) => n.data['label']);
    expect(labels).not.toContain('Node');
  });

  it('length_contrast.gfa labels are real segment IDs', () => {
    const elements = graphToCytoscape(gfaToGraph(parseGfa(lengthContrastGfa)));
    const labels = elements.nodes.map((n) => n.data['label']);
    expect(labels).not.toContain('Node');
  });
});

describe('regression: LN:i tag used when sequence is *', () => {
  it('node length equals LN:i value', () => {
    const gfa = 'S\tA\t*\tLN:i:12345\n';
    const graph = gfaToGraph(parseGfa(gfa));
    expect(graph.nodes[0].length).toBe(12345);
  });
});

describe('regression: sequence length used when sequence is present', () => {
  it('node length equals sequence length', () => {
    const gfa = 'S\tA\tACGTACGT\n';
    const graph = gfaToGraph(parseGfa(gfa));
    expect(graph.nodes[0].length).toBe(8);
  });
});

describe('regression: longer contigs produce wider nodes', () => {
  it('node width increases with contig length', () => {
    const gfa = 'S\tshort\tACGT\nS\tlong\t*\tLN:i:100000\n';
    const elements = graphToCytoscape(gfaToGraph(parseGfa(gfa)));
    const byId = Object.fromEntries(
      elements.nodes.map((n) => [n.data.id as string, n.data['width'] as number]),
    );
    expect(byId['short']).toBeLessThan(byId['long']);
  });
});
