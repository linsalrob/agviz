export type SegmentLengthScaleMode = 'log' | 'linear' | 'uniform';

export interface SegmentLengthScaleConfig {
  mode: SegmentLengthScaleMode;
  minVisualLengthPx: number;
  maxVisualLengthPx: number;
  pixelsPerBase?: number;
  uniformLengthPx?: number;
}

export type LengthScaleConfig = SegmentLengthScaleConfig;

export interface SegmentLengthScaleDomain {
  minLengthBp?: number;
  maxLengthBp?: number;
}

export const DEFAULT_SEGMENT_LENGTH_SCALE: SegmentLengthScaleConfig = {
  mode: 'log',
  minVisualLengthPx: 24,
  maxVisualLengthPx: 320,
  pixelsPerBase: 0.05,
  uniformLengthPx: 60,
};

export const DEFAULT_LENGTH_SCALE = DEFAULT_SEGMENT_LENGTH_SCALE;

const SEGMENT_VISUAL_THICKNESS = 6;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function computeSegmentLengthScaleDomain(
  lengthsBp: Array<number | undefined>,
): SegmentLengthScaleDomain {
  const valid = lengthsBp.filter(
    (value): value is number => Number.isFinite(value) && value > 0,
  );

  if (valid.length === 0) {
    return {};
  }

  return {
    minLengthBp: Math.min(...valid),
    maxLengthBp: Math.max(...valid),
  };
}

export function segmentVisualLength(
  lengthBp: number | undefined,
  config: SegmentLengthScaleConfig = DEFAULT_SEGMENT_LENGTH_SCALE,
  domain?: SegmentLengthScaleDomain,
): number {
  const min = config.minVisualLengthPx;
  const max = config.maxVisualLengthPx;

  if (!lengthBp || lengthBp <= 0 || !Number.isFinite(lengthBp)) {
    return min;
  }

  if (config.mode === 'uniform') {
    return clamp(config.uniformLengthPx ?? 60, min, max);
  }

  if (config.mode === 'linear') {
    const pixelsPerBase = config.pixelsPerBase ?? 0.05;
    return clamp(lengthBp * pixelsPerBase, min, max);
  }

  const minLength = domain?.minLengthBp;
  const maxLength = domain?.maxLengthBp;

  if (
    !minLength ||
    !maxLength ||
    minLength <= 0 ||
    maxLength <= 0 ||
    minLength === maxLength
  ) {
    return (min + max) / 2;
  }

  const logMin = Math.log10(minLength);
  const logMax = Math.log10(maxLength);
  const logValue = Math.log10(lengthBp);
  const denominator = logMax - logMin;

  if (denominator <= 0 || !Number.isFinite(denominator)) {
    return (min + max) / 2;
  }

  const t = (logValue - logMin) / denominator;
  return min + clamp(t, 0, 1) * (max - min);
}

export function segmentVisualThickness(): number {
  return SEGMENT_VISUAL_THICKNESS;
}

export const contigVisualLength = segmentVisualLength;
export const contigVisualThickness = segmentVisualThickness;
