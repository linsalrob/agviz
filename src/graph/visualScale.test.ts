import { describe, expect, it } from 'vitest';
import {
  contigVisualHeight,
  contigVisualWidth,
  DEFAULT_CONTIG_HEIGHT,
  MAX_CONTIG_WIDTH,
  MIN_CONTIG_WIDTH,
} from './visualScale';

describe('contigVisualWidth', () => {
  it('returns the minimum width for undefined length', () => {
    expect(contigVisualWidth()).toBe(MIN_CONTIG_WIDTH);
  });

  it('returns the minimum width for zero length', () => {
    expect(contigVisualWidth(0)).toBe(MIN_CONTIG_WIDTH);
  });

  it('returns the minimum width for negative length', () => {
    expect(contigVisualWidth(-5)).toBe(MIN_CONTIG_WIDTH);
  });

  it('returns a positive number for length 4', () => {
    expect(contigVisualWidth(4)).toBeGreaterThan(0);
  });

  it('increases with segment length', () => {
    expect(contigVisualWidth(10)).toBeLessThan(contigVisualWidth(1000));
    expect(contigVisualWidth(1000)).toBeLessThan(contigVisualWidth(1000000));
  });

  it('never exceeds the maximum width cap', () => {
    expect(contigVisualWidth(10 ** 12)).toBe(MAX_CONTIG_WIDTH);
  });

  it('never exceeds MAX_CONTIG_WIDTH for reasonable lengths', () => {
    const widths = [4, 1000, 100000, 1000000, 1e9].map(contigVisualWidth);
    expect(widths.every((w) => w <= MAX_CONTIG_WIDTH)).toBe(true);
  });

  it('never goes below MIN_CONTIG_WIDTH', () => {
    const widths = [undefined, 0, 1, 4, 1000].map(contigVisualWidth);
    expect(widths.every((w) => w >= MIN_CONTIG_WIDTH)).toBe(true);
  });

  it('is deterministic (same input gives same output)', () => {
    expect(contigVisualWidth(1000)).toBe(contigVisualWidth(1000));
  });

  it('does not return NaN', () => {
    expect(Number.isNaN(contigVisualWidth())).toBe(false);
    expect(Number.isNaN(contigVisualWidth(0))).toBe(false);
    expect(Number.isNaN(contigVisualWidth(1000))).toBe(false);
  });

  it('does not return Infinity', () => {
    expect(Number.isFinite(contigVisualWidth())).toBe(true);
    expect(Number.isFinite(contigVisualWidth(10 ** 15))).toBe(true);
  });
});

describe('contigVisualHeight', () => {
  it('returns a fixed selectable height', () => {
    expect(contigVisualHeight()).toBe(DEFAULT_CONTIG_HEIGHT);
  });

  it('returns a positive height', () => {
    expect(contigVisualHeight()).toBeGreaterThan(0);
  });

  it('is stable across calls', () => {
    expect(contigVisualHeight()).toBe(contigVisualHeight());
  });
});
