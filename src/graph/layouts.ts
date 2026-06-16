import type cytoscape from 'cytoscape';

export type LayoutName = 'fcose' | 'cose' | 'breadthfirst' | 'circle' | 'grid';

export const LAYOUT_NAMES: LayoutName[] = ['fcose', 'cose', 'breadthfirst', 'circle', 'grid'];

export const LARGE_GRAPH_NODE_THRESHOLD = 5000;
export const LARGE_GRAPH_EDGE_THRESHOLD = 10000;
const DEFAULT_LAYOUT_PADDING = 40;
// Keep contig bars close enough to read as adjacencies while leaving room for labels and rounded rectangles.
const FCOSE_IDEAL_EDGE_LENGTH = 40;
// Higher repulsion prevents the wider contig nodes from overlapping in compact graphs.
const CONTIG_FCOSE_NODE_REPULSION = 8000;
// Light gravity helps connected components settle without stretching links into long spokes.
const CONTIG_FCOSE_GRAVITY = 0.25;
// Extra iterations help fcose converge after accounting for label-aware rectangular node dimensions.
const CONTIG_FCOSE_NUM_ITERATIONS = 2500;

export function getLayoutOptions(name: LayoutName): cytoscape.LayoutOptions {
  switch (name) {
    case 'fcose':
      return {
        name: 'fcose',
        animate: false,
        fit: true,
        padding: DEFAULT_LAYOUT_PADDING,
        nodeDimensionsIncludeLabels: true,
        idealEdgeLength: FCOSE_IDEAL_EDGE_LENGTH,
        nodeRepulsion: CONTIG_FCOSE_NODE_REPULSION,
        gravity: CONTIG_FCOSE_GRAVITY,
        numIter: CONTIG_FCOSE_NUM_ITERATIONS,
      } as cytoscape.LayoutOptions;
    case 'cose':
      return {
        name: 'cose',
        animate: false,
        fit: true,
        padding: DEFAULT_LAYOUT_PADDING,
      } as cytoscape.LayoutOptions;
    case 'breadthfirst':
      return {
        name: 'breadthfirst',
        animate: false,
        fit: true,
        padding: DEFAULT_LAYOUT_PADDING,
      } as cytoscape.LayoutOptions;
    case 'circle':
      return {
        name: 'circle',
        animate: false,
        fit: true,
        padding: DEFAULT_LAYOUT_PADDING,
      } as cytoscape.LayoutOptions;
    case 'grid':
      return {
        name: 'grid',
        animate: false,
        fit: true,
        padding: DEFAULT_LAYOUT_PADDING,
      } as cytoscape.LayoutOptions;
  }
}
