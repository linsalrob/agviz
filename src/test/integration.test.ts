import { describe, it, expect } from 'vitest';
import { parseGfa } from '../gfa/parseGfa';
import { gfaToGraph } from '../gfa/gfaToGraph';
import { graphToCytoscape } from '../graph/cytoscapeElements';
import reciprocalLinksGfa from './fixtures/reciprocal_links.gfa?raw';

const integrationGfa = `H\tVN:Z:1.0
S\tone_kb\t*\tLN:i:1000\tDP:f:10
S\ttwo_kb\t*\tLN:i:2000\tDP:f:20
L\tone_kb\t+\ttwo_kb\t+\t100M
`;

describe('integration: GFA -> parseGfa -> gfaToGraph -> graphToCytoscape', () => {
  const parsed = parseGfa(integrationGfa);
  const graph = gfaToGraph(parsed);
  const elements = graphToCytoscape(graph, {
    lengthScale: {
      mode: 'linear',
      pixelsPerBase: 0.1,
      minVisualLengthPx: 0,
      maxVisualLengthPx: 1000,
    },
    themeMode: 'light',
    colorByCoverage: true,
  });

  it('keeps two biological segments', () => {
    expect(graph.nodes).toHaveLength(2);
  });

  it('creates endpoint nodes and contig body edges', () => {
    expect(elements.nodes.map((node) => node.data.id)).toEqual(
      expect.arrayContaining([
        'one_kb::__left',
        'one_kb::__right',
        'two_kb::__left',
        'two_kb::__right',
      ]),
    );

    const bodyEdges = elements.edges.filter((edge) => edge.classes === 'contig-body');
    expect(bodyEdges).toHaveLength(2);
  });

  it('keeps proportional visual body lengths', () => {
    const one = elements.edges.find(
      (edge) => edge.classes === 'contig-body' && edge.data.segmentId === 'one_kb',
    );
    const two = elements.edges.find(
      (edge) => edge.classes === 'contig-body' && edge.data.segmentId === 'two_kb',
    );

    expect(one?.data.visualLength).toBe(100);
    expect(two?.data.visualLength).toBe(200);
    expect(two!.data.visualLength).toBe(one!.data.visualLength * 2);
  });

  it('maps the gfa link to segment endpoints', () => {
    const link = elements.edges.find((edge) => edge.classes === 'gfa-link');
    expect(link?.data.source).toBe('one_kb::__right');
    expect(link?.data.target).toBe('two_kb::__left');
  });

  it('preserves coverage values and orientation metadata', () => {
    const oneNode = graph.nodes.find((node) => node.id === 'one_kb');
    expect(oneNode?.coverage).toBe(10);

    const link = elements.edges.find((edge) => edge.classes === 'gfa-link');
    expect(link?.data.sourceOrient).toBe('+');
    expect(link?.data.targetOrient).toBe('+');
    expect(link?.data.overlap).toBe('100M');
  });

  it('renders one visible gfa-link per reciprocal pair', () => {
    const reciprocalGraph = gfaToGraph(parseGfa(reciprocalLinksGfa));
    const reciprocalElements = graphToCytoscape(reciprocalGraph, {
      lengthScale: {
        mode: 'linear',
        pixelsPerBase: 0.1,
        minVisualLengthPx: 0,
        maxVisualLengthPx: 1000,
      },
      themeMode: 'light',
      colorByCoverage: false,
    });

    const links = reciprocalElements.edges.filter((edge) => edge.classes === 'gfa-link');
    expect(links).toHaveLength(2);
    expect(
      links.map((edge) => [edge.data.sourceSegment, edge.data.targetSegment]).sort(),
    ).toEqual([
      ['A', 'B'],
      ['B', 'C'],
    ]);
    expect(links.every((edge) => edge.data.reciprocalMemberCount === 2)).toBe(true);
  });
});
