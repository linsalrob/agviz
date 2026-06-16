import { describe, it, expect } from 'vitest';
import {
  LAYOUT_NAMES,
  getLayoutOptions,
  LARGE_GRAPH_NODE_THRESHOLD,
  LARGE_GRAPH_EDGE_THRESHOLD,
} from './layouts';
import type { LayoutName } from './layouts';

describe('LAYOUT_NAMES', () => {
  it('includes fcose', () => {
    expect(LAYOUT_NAMES).toContain('fcose');
  });

  it('includes cose, breadthfirst, circle, grid', () => {
    expect(LAYOUT_NAMES).toContain('cose');
    expect(LAYOUT_NAMES).toContain('breadthfirst');
    expect(LAYOUT_NAMES).toContain('circle');
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
  const allLayouts: LayoutName[] = ['fcose', 'cose', 'breadthfirst', 'circle', 'grid'];

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

  it('fcose layout includes nodeDimensionsIncludeLabels', () => {
    const opts = getLayoutOptions('fcose') as unknown as Record<string, unknown>;
    expect(opts['nodeDimensionsIncludeLabels']).toBe(true);
  });

  it('fcose layout does not ignore node dimensions', () => {
    const opts = getLayoutOptions('fcose') as unknown as Record<string, unknown>;
    // nodeDimensionsIncludeLabels must be truthy to account for label-aware rectangular nodes
    expect(opts['nodeDimensionsIncludeLabels']).toBeTruthy();
  });
});
