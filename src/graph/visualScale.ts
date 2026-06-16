export const MIN_CONTIG_WIDTH = 36;
export const MAX_CONTIG_WIDTH = 260;
export const DEFAULT_CONTIG_HEIGHT = 22;
// Offset keeps short contigs comfortably selectable before log scaling takes over.
const CONTIG_WIDTH_BASE_OFFSET = 24;
// Multiplier spreads typical assembly lengths apart without letting long contigs dominate the canvas.
const CONTIG_WIDTH_LOG_MULTIPLIER = 42;

export function contigVisualWidth(length?: number): number {
  if (!length || length <= 0) {
    return MIN_CONTIG_WIDTH;
  }

  const scaled = CONTIG_WIDTH_BASE_OFFSET + Math.log10(length + 1) * CONTIG_WIDTH_LOG_MULTIPLIER;
  return Math.max(MIN_CONTIG_WIDTH, Math.min(MAX_CONTIG_WIDTH, scaled));
}

export function contigVisualHeight(): number {
  return DEFAULT_CONTIG_HEIGHT;
}
