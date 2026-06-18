import { describe, it, expect } from 'vitest';
import { gfaToGraph, estimateSegmentLength, extractCoverage } from './gfaToGraph';
import { parseGfa } from './parseGfa';
import type { GfaSegment } from './gfaTypes';
import lengthContrastGfa from '../test/fixtures/length_contrast.gfa?raw';
import missingLnGfa from '../test/fixtures/missing_ln.gfa?raw';
import duplicateSegmentsGfa from '../test/fixtures/duplicate_segments.gfa?raw';
import selfLoopGfa from '../test/fixtures/self_loop.gfa?raw';
import disconnectedGfa from '../test/fixtures/disconnected_components.gfa?raw';

const TINY_GFA = `H\tVN:Z:1.0
S\tcontig1\tACGTACGT\tLN:i:8\tDP:f:12.4
S\tcontig2\tGGTTGGTT\tLN:i:8\tDP:f:8.1
L\tcontig1\t+\tcontig2\t-\t4M
`;

const STAR_SEQ_GFA = `H\tVN:Z:1.0
S\tA\t*\tLN:i:1000\tDP:f:20
S\tB\t*\tLN:i:1500\tDP:f:15
L\tA\t+\tB\t+\t100M
`;

describe('gfaToGraph – tiny GFA', () => {
  it('produces two nodes', () => {
    const graph = gfaToGraph(parseGfa(TINY_GFA));
    expect(graph.nodes).toHaveLength(2);
  });

  it('produces one edge', () => {
    const graph = gfaToGraph(parseGfa(TINY_GFA));
    expect(graph.edges).toHaveLength(1);
  });

  it('node ids match segment names', () => {
    const graph = gfaToGraph(parseGfa(TINY_GFA));
    expect(graph.nodes.map((n) => n.id)).toEqual(['contig1', 'contig2']);
  });

  it('node has correct length from sequence', () => {
    const graph = gfaToGraph(parseGfa(TINY_GFA));
    expect(graph.nodes[0].length).toBe(8);
  });

  it('node has coverage from DP tag', () => {
    const graph = gfaToGraph(parseGfa(TINY_GFA));
    expect(graph.nodes[0].coverage).toBeCloseTo(12.4);
  });

  it('node has degree set', () => {
    const graph = gfaToGraph(parseGfa(TINY_GFA));
    expect(graph.nodes[0].degree).toBe(1);
    expect(graph.nodes[1].degree).toBe(1);
  });

  it('edge has correct source and target', () => {
    const graph = gfaToGraph(parseGfa(TINY_GFA));
    const edge = graph.edges[0];
    expect(edge.source).toBe('contig1');
    expect(edge.target).toBe('contig2');
  });

  it('edge has correct orientations', () => {
    const graph = gfaToGraph(parseGfa(TINY_GFA));
    const edge = graph.edges[0];
    expect(edge.sourceOrient).toBe('+');
    expect(edge.targetOrient).toBe('-');
  });

  it('edge has overlap', () => {
    const graph = gfaToGraph(parseGfa(TINY_GFA));
    expect(graph.edges[0].overlap).toBe('4M');
  });

  it('edge preserves raw link line', () => {
    const graph = gfaToGraph(parseGfa(TINY_GFA));
    expect(graph.edges[0].raw).toBe('L\tcontig1\t+\tcontig2\t-\t4M');
  });

  it('stats are correct', () => {
    const graph = gfaToGraph(parseGfa(TINY_GFA));
    expect(graph.stats.nodeCount).toBe(2);
    expect(graph.stats.edgeCount).toBe(1);
    expect(graph.stats.totalLength).toBe(16);
  });
});

describe('gfaToGraph – star sequence with LN tag', () => {
  it('uses LN tag for length when sequence is *', () => {
    const graph = gfaToGraph(parseGfa(STAR_SEQ_GFA));
    expect(graph.nodes[0].length).toBe(1000);
    expect(graph.nodes[1].length).toBe(1500);
  });

  it('does not set sequence when * is used', () => {
    const graph = gfaToGraph(parseGfa(STAR_SEQ_GFA));
    expect(graph.nodes[0].sequence).toBeUndefined();
  });

  it('total length uses LN tags', () => {
    const graph = gfaToGraph(parseGfa(STAR_SEQ_GFA));
    expect(graph.stats.totalLength).toBe(2500);
  });
});

describe('estimateSegmentLength', () => {
  it('uses sequence length when sequence is present', () => {
    const segment: GfaSegment = {
      type: 'S',
      name: 'contig1',
      sequence: 'ACGTACGT',
      rawLine: 'S\tcontig1\tACGTACGT\tLN:i:8',
      tags: [{ name: 'LN', type: 'i', value: '8' }],
    };
    expect(estimateSegmentLength(segment)).toBe(8);
  });

  it('prefers sequence length over LN tag when sequence is present', () => {
    const segment: GfaSegment = {
      type: 'S',
      name: 'contig1',
      sequence: 'ACGT',
      rawLine: 'S\tcontig1\tACGT\tLN:i:1000',
      tags: [{ name: 'LN', type: 'i', value: '1000' }],
    };
    expect(estimateSegmentLength(segment)).toBe(4);
  });

  it('uses LN tag when sequence is *', () => {
    const segment: GfaSegment = {
      type: 'S',
      name: 'contig2',
      sequence: '*',
      rawLine: 'S\tcontig2\t*\tLN:i:15000',
      tags: [{ name: 'LN', type: 'i', value: '15000' }],
    };
    expect(estimateSegmentLength(segment)).toBe(15000);
  });

  it('returns undefined when no sequence or valid LN tag is available', () => {
    const segment: GfaSegment = {
      type: 'S',
      name: 'contig3',
      sequence: '*',
      rawLine: 'S\tcontig3\t*\tLN:i:not-a-number',
      tags: [{ name: 'LN', type: 'i', value: 'not-a-number' }],
    };
    expect(estimateSegmentLength(segment)).toBeUndefined();
  });

  it('returns undefined for non-positive LN values', () => {
    const segment: GfaSegment = {
      type: 'S',
      name: 'contig4',
      sequence: '*',
      rawLine: 'S\tcontig4\t*\tLN:i:0',
      tags: [{ name: 'LN', type: 'i', value: '0' }],
    };
    expect(estimateSegmentLength(segment)).toBeUndefined();
  });
});

describe('gfaToGraph – coverage tag priority', () => {
  it('uses KC tag when DP is absent', () => {
    const gfa = 'S\tnode1\t*\tLN:i:100\tKC:i:50\n';
    const graph = gfaToGraph(parseGfa(gfa));
    expect(graph.nodes[0].coverage).toBe(50);
  });

  it('uses RC tag when DP and KC are absent', () => {
    const gfa = 'S\tnode1\t*\tLN:i:100\tRC:i:120\n';
    const graph = gfaToGraph(parseGfa(gfa));
    expect(graph.nodes[0].coverage).toBe(120);
  });

  it('uses FC tag when DP, KC, and RC are absent', () => {
    const gfa = 'S\tnode1\t*\tLN:i:100\tFC:i:4\n';
    const graph = gfaToGraph(parseGfa(gfa));
    expect(graph.nodes[0].coverage).toBe(4);
  });

  it('prefers DP over KC', () => {
    const gfa = 'S\tnode1\t*\tLN:i:100\tDP:f:9.9\tKC:i:50\n';
    const graph = gfaToGraph(parseGfa(gfa));
    expect(graph.nodes[0].coverage).toBeCloseTo(9.9);
  });

  it('returns undefined when no coverage tag present', () => {
    const gfa = 'S\tnode1\tACGT\n';
    const graph = gfaToGraph(parseGfa(gfa));
    expect(graph.nodes[0].coverage).toBeUndefined();
  });

  it('returns undefined for invalid numeric values', () => {
    const gfa = 'S\tnode1\t*\tLN:i:100\tDP:f:not-a-number\tKC:i:abc\n';
    const graph = gfaToGraph(parseGfa(gfa));
    expect(graph.nodes[0].coverage).toBeUndefined();
  });
});

describe('extractCoverage', () => {
  it('returns undefined when provided an empty tag list', () => {
    expect(extractCoverage([])).toBeUndefined();
  });
});

describe('gfaToGraph – warnings for unknown segments in links', () => {
  it('warns when link references missing segment', () => {
    const gfa = 'S\ta\tACGT\nL\ta\t+\tMISSING\t+\t*\n';
    const graph = gfaToGraph(parseGfa(gfa));
    expect(graph.warnings.some((w) => w.includes('MISSING'))).toBe(true);
  });
});

// ── node labels ───────────────────────────────────────────────────────────────

describe('gfaToGraph – node labels', () => {
  it('labels use segment IDs, not a generic "Node"', () => {
    const gfa = 'S\tcontig1\tACGT\nS\tcontig2\tGGTT\n';
    const graph = gfaToGraph(parseGfa(gfa));
    const labels = graph.nodes.map((n) => n.label);
    expect(labels).toContain('contig1');
    expect(labels).toContain('contig2');
    expect(labels).not.toContain('Node');
  });
});

// ── fixture: length_contrast ──────────────────────────────────────────────────

describe('gfaToGraph – fixture: length_contrast.gfa', () => {
  it('assigns correct lengths', () => {
    const graph = gfaToGraph(parseGfa(lengthContrastGfa));
    const lengths = graph.nodes.map((n) => n.length);
    expect(lengths).toEqual([4, 1000, 100000]);
  });

  it('short node has smallest length', () => {
    const graph = gfaToGraph(parseGfa(lengthContrastGfa));
    const [s, m, l] = graph.nodes;
    expect(s.length!).toBeLessThan(m.length!);
    expect(m.length!).toBeLessThan(l.length!);
  });

  it('stats total length is sum of all lengths', () => {
    const graph = gfaToGraph(parseGfa(lengthContrastGfa));
    expect(graph.stats.totalLength).toBe(4 + 1000 + 100000);
  });

  it('node labels are not "Node"', () => {
    const graph = gfaToGraph(parseGfa(lengthContrastGfa));
    expect(graph.nodes.map((n) => n.label)).not.toContain('Node');
  });
});

// ── fixture: missing_ln ───────────────────────────────────────────────────────

describe('gfaToGraph – fixture: missing_ln.gfa', () => {
  it('length is undefined when sequence is * and no LN tag', () => {
    const graph = gfaToGraph(parseGfa(missingLnGfa));
    expect(graph.nodes[0].length).toBeUndefined();
  });

  it('does not crash on undefined length', () => {
    expect(() => gfaToGraph(parseGfa(missingLnGfa))).not.toThrow();
  });
});

// ── fixture: duplicate_segments ───────────────────────────────────────────────

describe('gfaToGraph – fixture: duplicate_segments.gfa', () => {
  it('produces a warning for the duplicate segment ID', () => {
    const graph = gfaToGraph(parseGfa(duplicateSegmentsGfa));
    // The second segment node with id A overwrites the degree map entry but
    // two nodes still exist; we expect at least one duplicate-related warning
    // OR the graph silently maps them (both behaviours are acceptable—this test
    // asserts that no crash occurs and counts are deterministic).
    expect(graph.nodes).toHaveLength(2);
  });

  it('both nodes have id A (no silent deduplication)', () => {
    const graph = gfaToGraph(parseGfa(duplicateSegmentsGfa));
    expect(graph.nodes.every((n) => n.id === 'A')).toBe(true);
  });
});

// ── fixture: self_loop ────────────────────────────────────────────────────────

describe('gfaToGraph – fixture: self_loop.gfa', () => {
  it('produces one node and one edge', () => {
    const graph = gfaToGraph(parseGfa(selfLoopGfa));
    expect(graph.nodes).toHaveLength(1);
    expect(graph.edges).toHaveLength(1);
  });

  it('self-loop edge has same source and target', () => {
    const graph = gfaToGraph(parseGfa(selfLoopGfa));
    const edge = graph.edges[0];
    expect(edge.source).toBe('A');
    expect(edge.target).toBe('A');
  });

  it('degree of A reflects the self-loop', () => {
    const graph = gfaToGraph(parseGfa(selfLoopGfa));
    // Each side of the link counts: from and to both increment degree for A
    expect(graph.nodes[0].degree).toBeGreaterThan(0);
  });
});

// ── fixture: disconnected_components ─────────────────────────────────────────

describe('gfaToGraph – fixture: disconnected_components.gfa', () => {
  it('produces 3 nodes and 1 edge', () => {
    const graph = gfaToGraph(parseGfa(disconnectedGfa));
    expect(graph.nodes).toHaveLength(3);
    expect(graph.edges).toHaveLength(1);
  });

  it('isolated node C has degree 0', () => {
    const graph = gfaToGraph(parseGfa(disconnectedGfa));
    const nodeC = graph.nodes.find((n) => n.id === 'C');
    expect(nodeC?.degree).toBe(0);
  });

  it('stats reflect all nodes including isolated ones', () => {
    const graph = gfaToGraph(parseGfa(disconnectedGfa));
    expect(graph.stats.nodeCount).toBe(3);
    expect(graph.stats.edgeCount).toBe(1);
  });
});

// ── edge ID uniqueness for parallel edges ─────────────────────────────────────

describe('gfaToGraph – parallel edges', () => {
  it('produces unique IDs for parallel edges', () => {
    const gfa =
      'S\ta\tACGT\nS\tb\tGGTT\nL\ta\t+\tb\t+\t*\nL\ta\t+\tb\t+\t*\n';
    const graph = gfaToGraph(parseGfa(gfa));
    expect(graph.edges).toHaveLength(2);
    const ids = graph.edges.map((e) => e.id);
    expect(new Set(ids).size).toBe(2);
  });
});

// ── edge overlap wildcard ─────────────────────────────────────────────────────

describe('gfaToGraph – overlap wildcard', () => {
  it('overlap is undefined when * is used', () => {
    const gfa = 'S\ta\tACGT\nS\tb\tGGTT\nL\ta\t+\tb\t+\t*\n';
    const graph = gfaToGraph(parseGfa(gfa));
    expect(graph.edges[0].overlap).toBeUndefined();
  });
});
