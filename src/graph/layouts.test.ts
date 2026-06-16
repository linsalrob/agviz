import { describe, it, expect } from 'vitest';
import {
  LAYOUT_NAMES,
  getLayoutOptions,
  chooseDefaultLayout,
  LARGE_GRAPH_NODE_THRESHOLD,
  LARGE_GRAPH_EDGE_THRESHOLD,
} from './layouts';
import type { LayoutName } from './layouts';

describe('LAYOUT_NAMES', () => {
  it('includes fcose', () => {
    expect(LAYOUT_NAMES).toContain('fcose');
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
  const allLayouts: LayoutName[] = ['fcose', 'cose', 'breadthfirst', 'circle', 'concentric', 'grid'];

  it.each(allLayouts)('%s layout has correct name property', (name) => {
    const opts = getLayoutOptions(name);
    expect(opts.name).toBe(name);
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

  it('fcose layout has compact idealEdgeLength', () => {
    const opts = getLayoutOptions('fcose') as unknown as Record<string, unknown>;
    expect(Number(opts['idealEdgeLength'])).toBeLessThanOrEqual(30);
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
