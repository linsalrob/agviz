export type SegmentLengthScaleMode = 'log' | 'linear' | 'uniform';

export interface SegmentLengthScaleConfig {
  mode: SegmentLengthScaleMode;
  minVisualLengthPx: number;
  maxVisualLengthPx: number;
  pixelsPerBase?: number;
  logScaleFactor?: number;
  uniformLengthPx?: number;
}

export type LengthScaleConfig = SegmentLengthScaleConfig;

export const DEFAULT_SEGMENT_LENGTH_SCALE: SegmentLengthScaleConfig = {
  mode: 'log',
  minVisualLengthPx: 12,
  maxVisualLengthPx: 260,
  pixelsPerBase: 0.05,
  logScaleFactor: 35,
  uniformLengthPx: 60,
};

export const DEFAULT_LENGTH_SCALE = DEFAULT_SEGMENT_LENGTH_SCALE;

const SEGMENT_VISUAL_THICKNESS = 6;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function segmentVisualLength(
  lengthBp: number | undefined,
  config: SegmentLengthScaleConfig = DEFAULT_SEGMENT_LENGTH_SCALE,
): number {
  const min = config.minVisualLengthPx;
  const max = config.maxVisualLengthPx;

  if (!lengthBp || lengthBp <= 0) {
    return min;
  }

  if (config.mode === 'uniform') {
    return clamp(config.uniformLengthPx ?? 60, min, max);
  }

  if (config.mode === 'linear') {
    const pixelsPerBase = config.pixelsPerBase ?? 0.05;
    return clamp(lengthBp * pixelsPerBase, min, max);
  }

  const logScaleFactor = config.logScaleFactor ?? 35;
  const value = min + Math.log10(lengthBp + 1) * logScaleFactor;
  return clamp(value, min, max);
}

export function segmentVisualThickness(): number {
  return SEGMENT_VISUAL_THICKNESS;
}

export const contigVisualLength = segmentVisualLength;
export const contigVisualThickness = segmentVisualThickness;
