import type cytoscape from 'cytoscape';
import type { ThemeMode } from './coverageColors';

export interface ThemePalette {
  appBackground: string;
  surfaceBackground: string;
  borderColor: string;
  textColor: string;
  mutedTextColor: string;
  graphBackground: string;
  linkColor: string;
  contigSelectionColor: string;
  edgeSelectionColor: string;
}

export function getThemePalette(themeMode: ThemeMode): ThemePalette {
  if (themeMode === 'dark') {
    return {
      appBackground: '#020617',
      surfaceBackground: '#111827',
      borderColor: '#334155',
      textColor: '#e5e7eb',
      mutedTextColor: '#94a3b8',
      graphBackground: '#000000',
      linkColor: '#cbd5e1',
      contigSelectionColor: '#f59e0b',
      edgeSelectionColor: '#fbbf24',
    };
  }

  return {
    appBackground: '#ffffff',
    surfaceBackground: '#f8fafc',
    borderColor: '#cbd5e1',
    textColor: '#0f172a',
    mutedTextColor: '#475569',
    graphBackground: '#ffffff',
    linkColor: '#334155',
    contigSelectionColor: '#d97706',
    edgeSelectionColor: '#d97706',
  };
}

export function createStylesheet(themeMode: ThemeMode): cytoscape.StylesheetStyle[] {
  const palette = getThemePalette(themeMode);

  return [
    {
      selector: 'node.endpoint',
      style: {
        width: 1,
        height: 1,
        opacity: 0,
        label: '',
      } as cytoscape.Css.Node,
    },
    {
      selector: 'edge.contig-body',
      style: {
        // Invisible: the SVG overlay in GraphOverlay.tsx renders the curved visual.
        // Width is kept at 10 so the chord line remains a click target for selection.
        width: 10,
        opacity: 0,
        label: '',
        'curve-style': 'straight',
        'target-arrow-shape': 'none',
        'source-arrow-shape': 'none',
      } as cytoscape.Css.Edge,
    },
    {
      selector: 'edge.contig-body:selected',
      style: {
        opacity: 0,
      } as cytoscape.Css.Edge,
    },
    {
      selector: 'edge.gfa-link',
      style: {
        width: 0.75,
        'line-color': palette.linkColor,
        'curve-style': 'unbundled-bezier',
        'control-point-distances': 18,
        'control-point-weights': 0.5,
        'target-arrow-shape': 'none',
        'source-arrow-shape': 'none',
        'line-opacity': 0.75,
        label: '',
      } as cytoscape.Css.Edge,
    },
    {
      selector: 'edge.gfa-link:selected',
      style: {
        'line-color': palette.edgeSelectionColor,
        width: 1.5,
      } as cytoscape.Css.Edge,
    },
    {
      selector: 'edge.gfa-link.bandage-overlay-hidden',
      style: {
        width: 0,
        opacity: 0,
        'line-opacity': 0,
      } as cytoscape.Css.Edge,
    },
  ];
}

export const defaultStylesheet = createStylesheet('light');
