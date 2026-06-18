import type { AssemblyGraph } from './graphTypes';
import type cytoscape from 'cytoscape';
import {
  computeSegmentLengthScaleDomain,
  contigVisualLength,
  contigVisualThickness,
  DEFAULT_LENGTH_SCALE,
  type LengthScaleConfig,
  type SegmentLengthScaleDomain,
} from './visualScale';
import {
  coverageMinMax,
  coverageToColor,
  defaultContigColor,
  type ThemeMode,
} from './coverageColors';
import { deduplicateReciprocalLinks } from './linkDeduplication';

export interface CytoscapeElements {
  nodes: cytoscape.NodeDefinition[];
  edges: cytoscape.EdgeDefinition[];
}

export interface CytoscapeGraphOptions {
  themeMode?: ThemeMode;
  colorByCoverage?: boolean;
  lengthScale?: LengthScaleConfig;
  lengthScaleDomain?: SegmentLengthScaleDomain;
}

export type EndpointSide = 'left' | 'right';
const ENDPOINT_DELIMITER = '::__';

export function endpointId(segmentId: string, side: EndpointSide): string {
  return `${segmentId}${ENDPOINT_DELIMITER}${side}`;
}

function sourceSideFromOrientation(sourceOrient: '+' | '-' | undefined): EndpointSide {
  return sourceOrient === '-' ? 'left' : 'right';
}

function targetSideFromOrientation(targetOrient: '+' | '-' | undefined): EndpointSide {
  return targetOrient === '-' ? 'right' : 'left';
}

export function mapLinkEndpoints(
  sourceSegment: string,
  sourceOrient: '+' | '-' | undefined,
  targetSegment: string,
  targetOrient: '+' | '-' | undefined,
): { sourceEndpointId: string; targetEndpointId: string } {
  return {
    sourceEndpointId: endpointId(sourceSegment, sourceSideFromOrientation(sourceOrient)),
    targetEndpointId: endpointId(targetSegment, targetSideFromOrientation(targetOrient)),
  };
}

export function graphToCytoscape(
  graph: AssemblyGraph,
  options: CytoscapeGraphOptions = {},
): CytoscapeElements {
  const themeMode = options.themeMode ?? 'light';
  const colorByCoverage = options.colorByCoverage ?? false;
  const lengthScale = options.lengthScale ?? DEFAULT_LENGTH_SCALE;
  const lengthScaleDomain =
    options.lengthScaleDomain ??
    computeSegmentLengthScaleDomain(graph.nodes.map((node) => node.length));

  const { minCoverage, maxCoverage } = coverageMinMax(graph.nodes.map((node) => node.coverage));

  const nodes: cytoscape.NodeDefinition[] = graph.nodes.flatMap((node) => [
    {
      data: {
        id: endpointId(node.id, 'left'),
        kind: 'endpoint',
        segmentId: node.id,
        side: 'left',
      },
      classes: 'endpoint',
    },
    {
      data: {
        id: endpointId(node.id, 'right'),
        kind: 'endpoint',
        segmentId: node.id,
        side: 'right',
      },
      classes: 'endpoint',
    },
  ]);

  const bodyEdges: cytoscape.EdgeDefinition[] = graph.nodes.map((node) => {
    const visualLength = contigVisualLength(node.length, lengthScale, lengthScaleDomain);
    const thickness = contigVisualThickness();

    return {
      data: {
        id: `body::${node.id}`,
        source: endpointId(node.id, 'left'),
        target: endpointId(node.id, 'right'),
        kind: 'contig-body',
        segmentId: node.id,
        label: node.label ?? node.id,
        lengthBp: node.length,
        sequence: node.sequence,
        coverage: node.coverage,
        degree: node.degree,
        tags: node.tags,
        visualLength,
        thickness,
        color: colorByCoverage
          ? coverageToColor(node.coverage, minCoverage, maxCoverage, themeMode)
          : defaultContigColor(themeMode),
      },
      classes: 'contig-body',
    };
  });

  const deduplicatedLinks = deduplicateReciprocalLinks(graph.edges);
  const linkEdges: cytoscape.EdgeDefinition[] = deduplicatedLinks.map((group, index) => {
    const representative = group.representative;
    const mapped = mapLinkEndpoints(
      representative.source,
      representative.sourceOrient,
      representative.target,
      representative.targetOrient,
    );

    return {
      data: {
        id: `link::${group.canonicalKey}::${index}`,
        source: mapped.sourceEndpointId,
        target: mapped.targetEndpointId,
        kind: 'gfa-link',
        originalEdgeId: representative.id,
        sourceSegment: representative.source,
        targetSegment: representative.target,
        sourceOrient: representative.sourceOrient,
        targetOrient: representative.targetOrient,
        overlap: representative.overlap,
        tags: representative.tags,
        reciprocalMemberCount: group.members.length,
        reciprocalMembers: group.members.map((edge) => edge.id),
        rawLinks: group.members.map((edge) => edge.raw).filter(Boolean),
      },
      classes: 'gfa-link',
    };
  });

  return { nodes, edges: [...bodyEdges, ...linkEdges] };
}
