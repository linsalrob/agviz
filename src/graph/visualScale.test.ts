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

  it('increases with segment length', () => {
    expect(contigVisualWidth(10)).toBeLessThan(contigVisualWidth(1000));
    expect(contigVisualWidth(1000)).toBeLessThan(contigVisualWidth(1000000));
  });

  it('never exceeds the maximum width cap', () => {
    expect(contigVisualWidth(10 ** 12)).toBe(MAX_CONTIG_WIDTH);
  });
});

describe('contigVisualHeight', () => {
  it('returns a fixed selectable height', () => {
    expect(contigVisualHeight()).toBe(DEFAULT_CONTIG_HEIGHT);
  });
});
