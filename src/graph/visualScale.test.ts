import { describe, expect, it } from 'vitest';
import {
  computeSegmentLengthScaleDomain,
  DEFAULT_SEGMENT_LENGTH_SCALE,
  segmentVisualLength,
  segmentVisualThickness,
  type SegmentLengthScaleConfig,
} from './visualScale';

describe('computeSegmentLengthScaleDomain', () => {
  it('returns min and max valid lengths', () => {
    expect(computeSegmentLengthScaleDomain([2751, 6893472])).toEqual({
      minLengthBp: 2751,
      maxLengthBp: 6893472,
    });
  });

  it('ignores unknown, zero, negative, and non-finite lengths', () => {
    expect(computeSegmentLengthScaleDomain([undefined, 0, -5, Number.NaN, 100])).toEqual({
      minLengthBp: 100,
      maxLengthBp: 100,
    });
  });

  it('returns an empty domain when there are no valid lengths', () => {
    expect(computeSegmentLengthScaleDomain([undefined, 0, -5])).toEqual({});
  });
});

describe('segmentVisualLength', () => {
  it('defaults to log mode', () => {
    expect(DEFAULT_SEGMENT_LENGTH_SCALE.mode).toBe('log');
    expect(segmentVisualLength(1000)).toBe(
      segmentVisualLength(1000, DEFAULT_SEGMENT_LENGTH_SCALE),
    );
  });

  it('maps graph-domain min and max lengths to the visual range in log mode', () => {
    const config: SegmentLengthScaleConfig = {
      ...DEFAULT_SEGMENT_LENGTH_SCALE,
      minVisualLengthPx: 24,
      maxVisualLengthPx: 320,
    };
    const domain = { minLengthBp: 2751, maxLengthBp: 6893472 };

    expect(segmentVisualLength(2751, config, domain)).toBeCloseTo(24);
    expect(segmentVisualLength(6893472, config, domain)).toBeCloseTo(320);
  });

  it('places intermediate values between the graph-domain min and max in log mode', () => {
    const config: SegmentLengthScaleConfig = {
      ...DEFAULT_SEGMENT_LENGTH_SCALE,
      minVisualLengthPx: 24,
      maxVisualLengthPx: 320,
    };
    const domain = { minLengthBp: 2751, maxLengthBp: 6893472 };
    const intermediate = segmentVisualLength(100000, config, domain);

    expect(intermediate).toBeGreaterThan(config.minVisualLengthPx);
    expect(intermediate).toBeLessThan(config.maxVisualLengthPx);
  });

  it('keeps log-scaled visual lengths monotonic within the graph domain', () => {
    const domain = { minLengthBp: 1000, maxLengthBp: 1000000 };
    const oneKb = segmentVisualLength(1000, DEFAULT_SEGMENT_LENGTH_SCALE, domain);
    const tenKb = segmentVisualLength(10000, DEFAULT_SEGMENT_LENGTH_SCALE, domain);
    const hundredKb = segmentVisualLength(100000, DEFAULT_SEGMENT_LENGTH_SCALE, domain);
    const oneMb = segmentVisualLength(1000000, DEFAULT_SEGMENT_LENGTH_SCALE, domain);

    expect(oneKb).toBeLessThan(tenKb);
    expect(tenKb).toBeLessThan(hundredKb);
    expect(hundredKb).toBeLessThan(oneMb);
  });

  it('clamps log-scaled values outside the graph domain', () => {
    const domain = { minLengthBp: 1000, maxLengthBp: 1000000 };

    expect(segmentVisualLength(100, DEFAULT_SEGMENT_LENGTH_SCALE, domain)).toBe(
      DEFAULT_SEGMENT_LENGTH_SCALE.minVisualLengthPx,
    );
    expect(segmentVisualLength(10000000, DEFAULT_SEGMENT_LENGTH_SCALE, domain)).toBe(
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
    expect(segmentVisualLength(Number.NaN, config)).toBe(20);
  });

  it('returns a middle visual length in log mode when all valid lengths are identical', () => {
    const config: SegmentLengthScaleConfig = {
      ...DEFAULT_SEGMENT_LENGTH_SCALE,
      minVisualLengthPx: 20,
      maxVisualLengthPx: 100,
    };

    expect(segmentVisualLength(1000, config, { minLengthBp: 1000, maxLengthBp: 1000 })).toBe(60);
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

  it('uses the minimum visual length for unknown lengths in uniform mode', () => {
    const uniformConfig: SegmentLengthScaleConfig = {
      ...DEFAULT_SEGMENT_LENGTH_SCALE,
      mode: 'uniform',
      uniformLengthPx: 75,
    };

    expect(segmentVisualLength(undefined, uniformConfig)).toBe(
      DEFAULT_SEGMENT_LENGTH_SCALE.minVisualLengthPx,
    );
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
