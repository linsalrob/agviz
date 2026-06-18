import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SEGMENT_LENGTH_SCALE,
  segmentVisualLength,
  segmentVisualThickness,
  type SegmentLengthScaleConfig,
} from './visualScale';

describe('segmentVisualLength', () => {
  it('defaults to log mode', () => {
    expect(DEFAULT_SEGMENT_LENGTH_SCALE.mode).toBe('log');
    expect(segmentVisualLength(1000)).toBe(
      segmentVisualLength(1000, DEFAULT_SEGMENT_LENGTH_SCALE),
    );
  });

  it('makes longer contigs longer in log mode', () => {
    const tiny = segmentVisualLength(4);
    const medium = segmentVisualLength(1000);
    const large = segmentVisualLength(1_000_000);

    expect(tiny).toBeLessThan(medium);
    expect(medium).toBeLessThan(large);
  });

  it('caps log-scaled visual lengths at maxVisualLengthPx', () => {
    expect(segmentVisualLength(1_000_000_000)).toBe(
      DEFAULT_SEGMENT_LENGTH_SCALE.maxVisualLengthPx,
    );
  });

  it('uses the minimum visual length for tiny or unknown lengths', () => {
    const config: SegmentLengthScaleConfig = {
      ...DEFAULT_SEGMENT_LENGTH_SCALE,
      minVisualLengthPx: 20,
    };

    expect(segmentVisualLength(undefined, config)).toBe(20);
    expect(segmentVisualLength(0, config)).toBe(20);
    expect(segmentVisualLength(-1, config)).toBe(20);
  });

  it('keeps linear lengths proportional when uncapped and above the minimum', () => {
    const linearConfig: SegmentLengthScaleConfig = {
      ...DEFAULT_SEGMENT_LENGTH_SCALE,
      mode: 'linear',
      pixelsPerBase: 0.1,
      minVisualLengthPx: 0,
      maxVisualLengthPx: 1000,
    };

    expect(segmentVisualLength(2000, linearConfig)).toBeCloseTo(
      segmentVisualLength(1000, linearConfig) * 2,
    );
  });

  it('uses the same visual length for different bp lengths in uniform mode', () => {
    const uniformConfig: SegmentLengthScaleConfig = {
      ...DEFAULT_SEGMENT_LENGTH_SCALE,
      mode: 'uniform',
      uniformLengthPx: 75,
    };

    expect(segmentVisualLength(4, uniformConfig)).toBe(75);
    expect(segmentVisualLength(1_000_000, uniformConfig)).toBe(75);
  });

  it('returns finite values', () => {
    expect(Number.isFinite(segmentVisualLength(undefined))).toBe(true);
    expect(Number.isFinite(segmentVisualLength(2000))).toBe(true);
  });
});

describe('segmentVisualThickness', () => {
  it('returns a fixed positive thickness', () => {
    expect(segmentVisualThickness()).toBeGreaterThan(0);
    expect(segmentVisualThickness()).toBe(6);
  });
});
