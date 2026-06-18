import { describe, it, expect } from 'vitest';
import {
  LAYOUT_NAMES,
  bandageEndpointPositions,
  getLayoutOptions,
  chooseDefaultLayout,
  LARGE_GRAPH_NODE_THRESHOLD,
  LARGE_GRAPH_EDGE_THRESHOLD,
} from './layouts';
import type { LayoutName } from './layouts';
import type { AssemblyGraph } from './graphTypes';

describe('LAYOUT_NAMES', () => {
  it('includes fcose', () => {
    expect(LAYOUT_NAMES).toContain('fcose');
  });

  it('includes bandage', () => {
    expect(LAYOUT_NAMES).toContain('bandage');
  });

  it('includes cose, circle, concentric, breadthfirst, grid', () => {
    expect(LAYOUT_NAMES).toContain('cose');
    expect(LAYOUT_NAMES).toContain('circle');
    expect(LAYOUT_NAMES).toContain('concentric');
    expect(LAYOUT_NAMES).toContain('breadthfirst');
    expect(LAYOUT_NAMES).toContain('grid');
  });
});

describe('LARGE_GRAPH_NODE_THRESHOLD and LARGE_GRAPH_EDGE_THRESHOLD', () => {
  it('node threshold is positive', () => {
    expect(LARGE_GRAPH_NODE_THRESHOLD).toBeGreaterThan(0);
  });

  it('edge threshold is positive', () => {
    expect(LARGE_GRAPH_EDGE_THRESHOLD).toBeGreaterThan(0);
  });
});

describe('getLayoutOptions', () => {
  const allLayouts: LayoutName[] = [
    'fcose',
    'bandage',
    'cose',
    'breadthfirst',
    'circle',
    'concentric',
    'grid',
  ];

  it.each(allLayouts)('%s layout has correct name property', (name) => {
    const opts = getLayoutOptions(name);
    expect(opts.name).toBe(name === 'bandage' ? 'preset' : name);
  });

  it.each(allLayouts)('%s layout has fit: true', (name) => {
    const opts = getLayoutOptions(name) as unknown as Record<string, unknown>;
    expect(opts['fit']).toBe(true);
  });

  it.each(allLayouts)('%s layout has animate: false', (name) => {
    const opts = getLayoutOptions(name) as unknown as Record<string, unknown>;
    expect(opts['animate']).toBe(false);
  });

  it.each(allLayouts)('%s layout has reasonable padding', (name) => {
    const opts = getLayoutOptions(name) as unknown as Record<string, unknown>;
    const padding = opts['padding'] as number;
    expect(typeof padding).toBe('number');
    expect(padding).toBeGreaterThan(0);
  });

  it('fcose layout uses scaled contig lengths as ideal body edge lengths', () => {
    const opts = getLayoutOptions('fcose') as unknown as Record<string, unknown>;
    const idealEdgeLength = opts['idealEdgeLength'] as (edge: {
      data: (key: string) => unknown;
    }) => number;

    expect(
      idealEdgeLength({
        data: (key: string) => (key === 'kind' ? 'contig-body' : 120),
      }),
    ).toBe(120);
    expect(
      idealEdgeLength({
        data: (key: string) => (key === 'kind' ? 'gfa-link' : undefined),
      }),
    ).toBeLessThanOrEqual(30);
  });

  it('fcose layout has nodeDimensionsIncludeLabels: false', () => {
    const opts = getLayoutOptions('fcose') as unknown as Record<string, unknown>;
    expect(opts['nodeDimensionsIncludeLabels']).toBe(false);
  });

  it('concentric layout exposes a concentric function', () => {
    const opts = getLayoutOptions('concentric') as unknown as Record<string, unknown>;
    expect(opts['name']).toBe('concentric');
    expect(typeof opts['concentric']).toBe('function');
  });

  it('bandage layout uses preset positions', () => {
    const graph: AssemblyGraph = {
      nodes: [
        { id: 'A', label: 'A', length: 1000, tags: {} },
        { id: 'B', label: 'B', length: 2000, tags: {} },
      ],
      edges: [
        {
          id: 'A-B',
          source: 'A',
          target: 'B',
          sourceOrient: '+',
          targetOrient: '+',
          tags: {},
        },
      ],
      warnings: [],
      stats: { nodeCount: 2, edgeCount: 1, totalLength: 3000 },
    };

    const opts = getLayoutOptions('bandage', graph) as unknown as Record<string, unknown>;
    expect(opts['name']).toBe('preset');
    expect(typeof opts['positions']).toBe('function');
  });
});

describe('bandageEndpointPositions', () => {
  it('creates left and right endpoint positions for every segment', () => {
    const graph: AssemblyGraph = {
      nodes: [
        { id: 'A', label: 'A', length: 1000, tags: {} },
        { id: 'B', label: 'B', length: 2000, tags: {} },
      ],
      edges: [
        {
          id: 'A-B',
          source: 'A',
          target: 'B',
          sourceOrient: '+',
          targetOrient: '+',
          tags: {},
        },
      ],
      warnings: [],
      stats: { nodeCount: 2, edgeCount: 1, totalLength: 3000 },
    };

    const positions = bandageEndpointPositions(graph);
    expect(positions['A::__left']).toBeDefined();
    expect(positions['A::__right']).toBeDefined();
    expect(positions['B::__left']).toBeDefined();
    expect(positions['B::__right']).toBeDefined();
  });

  it('fans linked endpoints apart so GFA links remain visible and selectable', () => {
    const graph: AssemblyGraph = {
      nodes: [
        { id: 'A', label: 'A', length: 1000, tags: {} },
        { id: 'B', label: 'B', length: 2000, tags: {} },
      ],
      edges: [
        {
          id: 'A-B',
          source: 'A',
          target: 'B',
          sourceOrient: '+',
          targetOrient: '+',
          tags: {},
        },
      ],
      warnings: [],
      stats: { nodeCount: 2, edgeCount: 1, totalLength: 3000 },
    };

    const positions = bandageEndpointPositions(graph);
    const linkLength = Math.hypot(
      positions['A::__right'].x - positions['B::__left'].x,
      positions['A::__right'].y - positions['B::__left'].y,
    );

    expect(linkLength).toBeGreaterThan(40);
  });

  it('lays tiny two-segment links out as a non-overlapping chain', () => {
    const graph: AssemblyGraph = {
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
          tags: {},
        },
      ],
      warnings: [],
      stats: { nodeCount: 2, edgeCount: 1, totalLength: 16 },
    };

    const positions = bandageEndpointPositions(graph);
    expect(positions['contig1::__left'].x).toBeLessThan(positions['contig1::__right'].x);
    expect(positions['contig1::__right'].x).toBeLessThan(positions['contig2::__right'].x);
    expect(positions['contig2::__right'].x).toBeLessThan(positions['contig2::__left'].x);
  });

  it('honors uniform segment length in two-segment Bandage-style layouts', () => {
    const graph: AssemblyGraph = {
      nodes: [
        { id: 'contig1', label: 'contig1', length: 8, tags: {} },
        { id: 'contig2', label: 'contig2', length: undefined, tags: {} },
      ],
      edges: [
        {
          id: 'contig1-contig2',
          source: 'contig1',
          target: 'contig2',
          sourceOrient: '+',
          targetOrient: '-',
          tags: {},
        },
      ],
      warnings: [],
      stats: { nodeCount: 2, edgeCount: 1, totalLength: 8 },
    };

    const positions = bandageEndpointPositions(graph, {
      mode: 'uniform',
      minVisualLengthPx: 12,
      maxVisualLengthPx: 260,
      uniformLengthPx: 60,
    });

    expect(
      Math.abs(positions['contig1::__right'].x - positions['contig1::__left'].x),
    ).toBe(60);
    expect(
      Math.abs(positions['contig2::__left'].x - positions['contig2::__right'].x),
    ).toBe(12);
  });

  it('lays a simple Bandage-style cycle as adjacent ring segments with short links', () => {
    const graph: AssemblyGraph = {
      nodes: [
        { id: 'A', label: 'A', length: 1000, tags: {} },
        { id: 'B', label: 'B', length: 1500, tags: {} },
        { id: 'C', label: 'C', length: 900, tags: {} },
      ],
      edges: [
        {
          id: 'A-B',
          source: 'A',
          target: 'B',
          sourceOrient: '+',
          targetOrient: '+',
          tags: {},
        },
        {
          id: 'B-C',
          source: 'B',
          target: 'C',
          sourceOrient: '+',
          targetOrient: '+',
          tags: {},
        },
        {
          id: 'C-A',
          source: 'C',
          target: 'A',
          sourceOrient: '+',
          targetOrient: '+',
          tags: {},
        },
      ],
      warnings: [],
      stats: { nodeCount: 3, edgeCount: 3, totalLength: 3400 },
    };

    const positions = bandageEndpointPositions(graph);
    const distance = (first: string, second: string) =>
      Math.hypot(positions[first].x - positions[second].x, positions[first].y - positions[second].y);
    const radius = (id: string) => Math.hypot(positions[id].x, positions[id].y);

    expect(Object.keys(positions).sort()).toEqual([
      'A::__left',
      'A::__right',
      'B::__left',
      'B::__right',
      'C::__left',
      'C::__right',
    ]);
    expect(distance('A::__right', 'B::__left')).toBeLessThan(distance('A::__left', 'A::__right'));
    expect(distance('B::__right', 'C::__left')).toBeLessThan(distance('B::__left', 'B::__right'));
    expect(distance('C::__right', 'A::__left')).toBeLessThan(distance('C::__left', 'C::__right'));
    Object.keys(positions).forEach((id) => {
      expect(radius(id)).toBeGreaterThan(250);
      expect(radius(id)).toBeLessThan(270);
    });
  });

  it('lays a two-branch bubble with branches on opposite sides', () => {
    const graph: AssemblyGraph = {
      nodes: [
        { id: 'root', label: 'root', length: 2000, tags: {} },
        { id: 'branch1', label: 'branch1', length: 800, tags: {} },
        { id: 'branch2', label: 'branch2', length: 850, tags: {} },
        { id: 'tip', label: 'tip', length: 500, tags: {} },
      ],
      edges: [
        {
          id: 'root-branch1',
          source: 'root',
          target: 'branch1',
          sourceOrient: '+',
          targetOrient: '+',
          tags: {},
        },
        {
          id: 'root-branch2',
          source: 'root',
          target: 'branch2',
          sourceOrient: '+',
          targetOrient: '+',
          tags: {},
        },
        {
          id: 'branch1-tip',
          source: 'branch1',
          target: 'tip',
          sourceOrient: '+',
          targetOrient: '+',
          tags: {},
        },
        {
          id: 'branch2-tip',
          source: 'branch2',
          target: 'tip',
          sourceOrient: '+',
          targetOrient: '+',
          tags: {},
        },
      ],
      warnings: [],
      stats: { nodeCount: 4, edgeCount: 4, totalLength: 4150 },
    };

    const positions = bandageEndpointPositions(graph);
    const branch1MidX = (positions['branch1::__left'].x + positions['branch1::__right'].x) / 2;
    const branch2MidX = (positions['branch2::__left'].x + positions['branch2::__right'].x) / 2;
    const rootToBranch1 = Math.hypot(
      positions['root::__right'].x - positions['branch1::__left'].x,
      positions['root::__right'].y - positions['branch1::__left'].y,
    );
    const rootToBranch2 = Math.hypot(
      positions['root::__right'].x - positions['branch2::__left'].x,
      positions['root::__right'].y - positions['branch2::__left'].y,
    );
    const branch1Length = Math.hypot(
      positions['branch1::__right'].x - positions['branch1::__left'].x,
      positions['branch1::__right'].y - positions['branch1::__left'].y,
    );
    const branch2Length = Math.hypot(
      positions['branch2::__right'].x - positions['branch2::__left'].x,
      positions['branch2::__right'].y - positions['branch2::__left'].y,
    );

    expect(Object.keys(positions)).toHaveLength(8);
    expect(branch1MidX).toBeLessThan(positions['root::__right'].x);
    expect(branch2MidX).toBeGreaterThan(positions['root::__right'].x);
    expect(rootToBranch1).toBeLessThan(branch1Length);
    expect(rootToBranch2).toBeLessThan(branch2Length);
  });

  it('keeps longer segments visibly longer', () => {
    const graph: AssemblyGraph = {
      nodes: [
        { id: 'short', label: 'short', length: 1000, tags: {} },
        { id: 'long', label: 'long', length: 4000, tags: {} },
      ],
      edges: [],
      warnings: [],
      stats: { nodeCount: 2, edgeCount: 0, totalLength: 5000 },
    };

    const positions = bandageEndpointPositions(graph);
    const shortLength = Math.hypot(
      positions['short::__right'].x - positions['short::__left'].x,
      positions['short::__right'].y - positions['short::__left'].y,
    );
    const longLength = Math.hypot(
      positions['long::__right'].x - positions['long::__left'].x,
      positions['long::__right'].y - positions['long::__left'].y,
    );

    expect(longLength).toBeGreaterThan(shortLength);
  });

  it('is deterministic for the same graph', () => {
    const graph: AssemblyGraph = {
      nodes: [
        { id: 'A', label: 'A', length: 1000, tags: {} },
        { id: 'B', label: 'B', length: 2000, tags: {} },
        { id: 'C', label: 'C', length: 3000, tags: {} },
      ],
      edges: [
        { id: 'A-B', source: 'A', target: 'B', tags: {} },
        { id: 'B-C', source: 'B', target: 'C', tags: {} },
      ],
      warnings: [],
      stats: { nodeCount: 3, edgeCount: 2, totalLength: 6000 },
    };

    expect(bandageEndpointPositions(graph)).toEqual(bandageEndpointPositions(graph));
  });
});

describe('chooseDefaultLayout', () => {
  it('defaults tiny cycle-like graphs to circle', () => {
    expect(
      chooseDefaultLayout({
        nodes: new Array(6).fill(0).map((_, i) => ({ id: `n${i}`, label: `n${i}`, tags: {} })),
        edges: new Array(6).fill(0).map((_, i) => ({
          id: `e${i}`,
          source: `n${i}`,
          target: `n${(i + 1) % 6}`,
          tags: {},
        })),
        warnings: [],
        stats: { nodeCount: 6, edgeCount: 6, totalLength: 0 },
      }),
    ).toBe('circle');
  });

  it('defaults larger graphs to fcose', () => {
    expect(
      chooseDefaultLayout({
        nodes: new Array(50).fill(0).map((_, i) => ({ id: `n${i}`, label: `n${i}`, tags: {} })),
        edges: new Array(30).fill(0).map((_, i) => ({
          id: `e${i}`,
          source: `n${i}`,
          target: `n${i + 1}`,
          tags: {},
        })),
        warnings: [],
        stats: { nodeCount: 50, edgeCount: 30, totalLength: 0 },
      }),
    ).toBe('fcose');
  });
});
