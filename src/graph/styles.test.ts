import { describe, expect, it } from 'vitest';
import { createStylesheet, getThemePalette } from './styles';

function findStyle(styles: ReturnType<typeof createStylesheet>, selector: string) {
  const entry = styles.find((style) => style.selector === selector);
  expect(entry).toBeDefined();
  return entry!.style as Record<string, unknown>;
}

describe('createStylesheet', () => {
  it('styles endpoint nodes as tiny and hidden', () => {
    const endpoint = findStyle(createStylesheet('light'), 'node.endpoint');
    expect(endpoint['width']).toBe(1);
    expect(endpoint['height']).toBe(1);
    expect(endpoint['opacity']).toBe(0);
  });

  it('styles contig-body edges as invisible (SVG overlay renders them)', () => {
    const styles = createStylesheet('light');
    const contig = findStyle(styles, 'edge.contig-body');
    const link = findStyle(styles, 'edge.gfa-link');

    // Contig bodies are invisible; the SVG GraphOverlay draws the curved visual
    expect(contig['opacity']).toBe(0);
    // Width is kept wide (>1) so the chord line remains a click target
    expect(Number(contig['width'])).toBeGreaterThan(1);
    expect(Number(link['width'])).toBeLessThan(1);
  });

  it('styles gfa-link edges as curved and arrowless', () => {
    const link = findStyle(createStylesheet('light'), 'edge.gfa-link');
    expect(link['curve-style']).toBe('unbundled-bezier');
    expect(link['target-arrow-shape']).toBe('none');
    expect(link['source-arrow-shape']).toBe('none');
  });

  it('can hide Cytoscape links when Bandage-style overlay links are rendered', () => {
    const hiddenLink = findStyle(createStylesheet('light'), 'edge.gfa-link.bandage-overlay-hidden');
    expect(hiddenLink['opacity']).toBe(0);
    expect(hiddenLink['line-opacity']).toBe(0);
    expect(hiddenLink['width']).toBe(0);
  });

  it('uses theme-specific palette values', () => {
    const light = getThemePalette('light');
    const dark = getThemePalette('dark');

    expect(light.graphBackground).toBe('#ffffff');
    expect(dark.graphBackground).toBe('#000000');
    expect(light.linkColor).not.toBe(dark.linkColor);
  });
});
