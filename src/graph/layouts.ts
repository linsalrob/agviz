import type cytoscape from 'cytoscape';
import type { AssemblyGraph } from './graphTypes';

export type LayoutName = 'fcose' | 'cose' | 'breadthfirst' | 'circle' | 'concentric' | 'grid';

export const LAYOUT_NAMES: LayoutName[] = ['fcose', 'circle', 'concentric', 'cose', 'breadthfirst', 'grid'];

export const LARGE_GRAPH_NODE_THRESHOLD = 5000;
export const LARGE_GRAPH_EDGE_THRESHOLD = 10000;
const DEFAULT_LAYOUT_PADDING = 35;
const FCOSE_IDEAL_EDGE_LENGTH = 24;
const CONTIG_FCOSE_NODE_REPULSION = 4500;
const CONTIG_FCOSE_GRAVITY = 0.45;
const CONTIG_FCOSE_NUM_ITERATIONS = 2500;

export function chooseDefaultLayout(graph: AssemblyGraph): LayoutName {
  if (graph.nodes.length <= 12 && graph.edges.length >= graph.nodes.length) {
    return 'circle';
  }

  return 'fcose';
}

export function getLayoutOptions(name: LayoutName): cytoscape.LayoutOptions {
  switch (name) {
    case 'fcose':
      return {
        name: 'fcose',
        animate: false,
        fit: true,
        padding: DEFAULT_LAYOUT_PADDING,
        nodeDimensionsIncludeLabels: false,
        idealEdgeLength: FCOSE_IDEAL_EDGE_LENGTH,
        nodeRepulsion: CONTIG_FCOSE_NODE_REPULSION,
        gravity: CONTIG_FCOSE_GRAVITY,
        gravityRangeCompound: 1.5,
        gravityCompound: 1.0,
        numIter: CONTIG_FCOSE_NUM_ITERATIONS,
        randomize: true,
      } as cytoscape.LayoutOptions;
    case 'cose':
      return {
        name: 'cose',
        animate: false,
        fit: true,
        padding: DEFAULT_LAYOUT_PADDING,
        nodeDimensionsIncludeLabels: false,
      } as cytoscape.LayoutOptions;
    case 'circle':
      return {
        name: 'circle',
        animate: false,
        fit: true,
        padding: DEFAULT_LAYOUT_PADDING,
        avoidOverlap: true,
        nodeDimensionsIncludeLabels: false,
      } as cytoscape.LayoutOptions;
    case 'concentric':
      return {
        name: 'concentric',
        animate: false,
        fit: true,
        padding: DEFAULT_LAYOUT_PADDING,
        avoidOverlap: true,
        nodeDimensionsIncludeLabels: false,
        concentric: (node: cytoscape.NodeSingular) => node.degree(),
        levelWidth: () => 2,
      } as cytoscape.LayoutOptions;
    case 'breadthfirst':
      return {
        name: 'breadthfirst',
        animate: false,
        fit: true,
        padding: DEFAULT_LAYOUT_PADDING,
        directed: false,
        avoidOverlap: true,
        nodeDimensionsIncludeLabels: false,
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
