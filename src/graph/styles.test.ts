import { describe, expect, it } from 'vitest';
import { defaultStylesheet } from './styles';

function findStyle(selector: string) {
  const entry = defaultStylesheet.find((style) => style.selector === selector);
  expect(entry).toBeDefined();
  return entry!.style as Record<string, unknown>;
}

describe('defaultStylesheet', () => {
  it('renders nodes as rounded contig bars sized from data', () => {
    const nodeStyle = findStyle('node');
    expect(nodeStyle['shape']).toBe('round-rectangle');
    expect(nodeStyle['width']).toBe('data(width)');
    expect(nodeStyle['height']).toBe('data(height)');
    expect(nodeStyle['label']).toBe('data(label)');
    expect(Number(nodeStyle['border-width'])).toBeLessThanOrEqual(1);
    expect(String(nodeStyle['font-size'])).toContain('7');
  });

  it('renders edges as thin curved non-directional links', () => {
    const edgeStyle = findStyle('edge');
    expect(edgeStyle['target-arrow-shape']).toBe('none');
    expect(edgeStyle['source-arrow-shape']).toBe('none');
    expect(edgeStyle['curve-style']).toBe('unbundled-bezier');
    expect(Number(edgeStyle['width'])).toBeLessThanOrEqual(1.5);
    expect(edgeStyle['label']).toBe('');
  });
});

// ── regression: no circles ───────────────────────────────────────────────────

describe('defaultStylesheet – regression: node shape is not a circle', () => {
  it('node shape is not ellipse', () => {
    const nodeStyle = findStyle('node');
    expect(nodeStyle['shape']).not.toBe('ellipse');
  });

  it('node shape is not circle', () => {
    const nodeStyle = findStyle('node');
    expect(nodeStyle['shape']).not.toBe('circle');
  });
});

// ── regression: no large arrows ──────────────────────────────────────────────

describe('defaultStylesheet – regression: edges have no arrowheads', () => {
  it('target-arrow-shape is "none"', () => {
    const edgeStyle = findStyle('edge');
    expect(edgeStyle['target-arrow-shape']).toBe('none');
  });

  it('source-arrow-shape is "none"', () => {
    const edgeStyle = findStyle('edge');
    expect(edgeStyle['source-arrow-shape']).toBe('none');
  });
});

// ── selected styles ───────────────────────────────────────────────────────────

describe('defaultStylesheet – selected node style exists', () => {
  it('has a node:selected selector', () => {
    const selected = defaultStylesheet.find((s) => s.selector === 'node:selected');
    expect(selected).toBeDefined();
  });
});

describe('defaultStylesheet – selected edge style exists', () => {
  it('has an edge:selected selector', () => {
    const selected = defaultStylesheet.find((s) => s.selector === 'edge:selected');
    expect(selected).toBeDefined();
  });
});
