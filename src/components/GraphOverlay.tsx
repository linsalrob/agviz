import { useEffect, useRef, useCallback, useState } from 'react';
import type cytoscape from 'cytoscape';
import type { AssemblyGraph } from '../graph/graphTypes';
import type { AssemblyEdge } from '../graph/graphTypes';
import type { ThemeMode } from '../graph/coverageColors';
import {
  bandageSegmentColor,
  coverageMinMax,
  coverageToColor,
  defaultContigColor,
} from '../graph/coverageColors';
import {
  DEFAULT_SEGMENT_LENGTH_SCALE,
  contigVisualThickness,
  type SegmentLengthScaleConfig,
} from '../graph/visualScale';
import { endpointId, graphToCytoscape, mapLinkEndpoints } from '../graph/cytoscapeElements';
import { deduplicateReciprocalLinks } from '../graph/linkDeduplication';
import { curvedSegmentPath, majorArcPath, graphCentre, type Point } from '../graph/arcGeometry';
import { getThemePalette } from '../graph/styles';
import type { LayoutName } from '../graph/layouts';

interface SegmentPath {
  segmentId: string;
  pathD: string;
  color: string;
  thickness: number;
  label: string;
  labelX: number;
  labelY: number;
}

interface LinkPath {
  id: string;
  pathD: string;
  edge: AssemblyEdge;
  selectionId: string;
  isBandageStyle: boolean;
}

type BranchSide = -1 | 1;
const BANDAGE_LINK_HALO_COLOR = '#94a3b8';
const BANDAGE_LINK_HALO_WIDTH = 22;

function bandageCurvatureForGraph(graph: AssemblyGraph): number {
  if (graph.nodes.length <= 2 && graph.edges.length <= 1) {
    return 0.18;
  }

  return 0.42;
}

function isSimpleDirectedCycle(graph: AssemblyGraph): boolean {
  if (graph.nodes.length < 3 || graph.edges.length !== graph.nodes.length) {
    return false;
  }

  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const edgesBySource = new Map<string, AssemblyEdge[]>();
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target) || edge.source === edge.target) {
      return false;
    }

    const existing = edgesBySource.get(edge.source) ?? [];
    existing.push(edge);
    edgesBySource.set(edge.source, existing);
  }

  if ([...edgesBySource.values()].some((edges) => edges.length !== 1)) {
    return false;
  }

  const start = graph.edges[0].source;
  const visited = new Set<string>();
  let current = start;

  for (let i = 0; i < graph.nodes.length; i += 1) {
    const edge = edgesBySource.get(current)?.[0];
    if (!edge || visited.has(edge.id)) {
      return false;
    }

    visited.add(edge.id);
    current = edge.target;
  }

  return current === start && visited.size === graph.edges.length;
}

function twoTerminalBubbleBranchSides(graph: AssemblyGraph): Map<string, BranchSide> {
  if (graph.nodes.length !== 4 || graph.edges.length !== 4) {
    return new Map();
  }

  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const inEdges = new Map<string, AssemblyEdge[]>();
  const outEdges = new Map<string, AssemblyEdge[]>();
  for (const node of graph.nodes) {
    inEdges.set(node.id, []);
    outEdges.set(node.id, []);
  }

  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target) || edge.source === edge.target) {
      return new Map();
    }

    outEdges.get(edge.source)!.push(edge);
    inEdges.get(edge.target)!.push(edge);
  }

  const source = graph.nodes.find(
    (node) => (outEdges.get(node.id)?.length ?? 0) === 2 && (inEdges.get(node.id)?.length ?? 0) === 0,
  );
  const sink = graph.nodes.find(
    (node) => (inEdges.get(node.id)?.length ?? 0) === 2 && (outEdges.get(node.id)?.length ?? 0) === 0,
  );
  if (!source || !sink) {
    return new Map();
  }

  const branches = graph.nodes
    .filter(
      (node) =>
        node.id !== source.id &&
        node.id !== sink.id &&
        (inEdges.get(node.id)?.length ?? 0) === 1 &&
        (outEdges.get(node.id)?.length ?? 0) === 1 &&
        inEdges.get(node.id)?.[0]?.source === source.id &&
        outEdges.get(node.id)?.[0]?.target === sink.id,
    )
    .map((node) => node.id)
    .sort();

  if (branches.length !== 2) {
    return new Map();
  }

  return new Map([
    [branches[0], -1],
    [branches[1], 1],
  ]);
}

function clockwiseAngle(point: Point, centre: Point): number {
  const angle = Math.atan2(point.y - centre.y, point.x - centre.x);
  return angle < 0 ? angle + Math.PI * 2 : angle;
}

function clockwiseDelta(start: number, end: number): number {
  return (end - start + Math.PI * 2) % (Math.PI * 2);
}

function ringSegmentPath(left: Point, right: Point, centre: Point): string {
  const leftRadius = Math.hypot(left.x - centre.x, left.y - centre.y);
  const rightRadius = Math.hypot(right.x - centre.x, right.y - centre.y);
  const radius = Math.max((leftRadius + rightRadius) / 2, 30);
  const delta = clockwiseDelta(clockwiseAngle(left, centre), clockwiseAngle(right, centre));
  const largeArcFlag = delta > Math.PI ? 1 : 0;

  return `M ${left.x} ${left.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${right.x} ${right.y}`;
}

function bubbleBranchPath(left: Point, right: Point, side: BranchSide): string {
  const dx = right.x - left.x;
  const dy = right.y - left.y;
  const chordLength = Math.hypot(dx, dy) || 1;
  const bend = Math.max(chordLength * 0.55, 90);
  const c1 = {
    x: left.x + dx * 0.28 + bend * side,
    y: left.y + dy * 0.28,
  };
  const c2 = {
    x: left.x + dx * 0.72 + bend * side,
    y: left.y + dy * 0.72,
  };

  return `M ${left.x} ${left.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${right.x} ${right.y}`;
}

export interface GraphOverlayProps {
  cy: cytoscape.Core | null;
  graph: AssemblyGraph | null;
  themeMode: ThemeMode;
  colorByCoverage: boolean;
  selectedSegmentId: string | null;
  layout?: LayoutName;
  selectedLinkId?: string | null;
  lengthScale?: SegmentLengthScaleConfig;
  onLinkSelect?: (edge: AssemblyEdge) => void;
  onSelectElement?: (selection: { kind: 'segment' | 'link'; id: string }) => void;
}

function modelToViewport(
  pos: { x: number; y: number },
  pan: { x: number; y: number },
  zoom: number,
): Point {
  return {
    x: pos.x * zoom + pan.x,
    y: pos.y * zoom + pan.y,
  };
}

export function GraphOverlay({
  cy,
  graph,
  themeMode,
  colorByCoverage,
  selectedSegmentId,
  layout,
  selectedLinkId = null,
  lengthScale = DEFAULT_SEGMENT_LENGTH_SCALE,
  onLinkSelect,
  onSelectElement,
}: GraphOverlayProps) {
  const [segmentPaths, setSegmentPaths] = useState<SegmentPath[]>([]);
  const [linkPaths, setLinkPaths] = useState<LinkPath[]>([]);
  const [pressedLinkId, setPressedLinkId] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const palette = getThemePalette(themeMode);
  const isBandageStyle = layout === 'bandage';

  const buildPaths = useCallback(() => {
    if (!cy || !graph || graph.nodes.length === 0) {
      setSegmentPaths([]);
      setLinkPaths([]);
      return;
    }

    const pan = cy.pan();
    const zoom = cy.zoom();

    const { minCoverage, maxCoverage } = coverageMinMax(graph.nodes.map((n) => n.coverage));
    const thickness = isBandageStyle ? 6 : contigVisualThickness();

    // Collect all endpoint viewport positions to compute graph centre
    const allViewportPositions: Point[] = [];
    for (const node of graph.nodes) {
      const leftEle = cy.getElementById(endpointId(node.id, 'left'));
      const rightEle = cy.getElementById(endpointId(node.id, 'right'));
      if (leftEle.length > 0 && rightEle.length > 0) {
        allViewportPositions.push(modelToViewport(leftEle.position(), pan, zoom));
        allViewportPositions.push(modelToViewport(rightEle.position(), pan, zoom));
      }
    }

    if (allViewportPositions.length === 0) {
      setSegmentPaths([]);
      setLinkPaths([]);
      return;
    }

    const centre = graphCentre(allViewportPositions);
    const isSingleSegment = graph.nodes.length === 1;
    const isSimpleCycle = isBandageStyle && isSimpleDirectedCycle(graph);
    const bubbleBranchSides = isBandageStyle ? twoTerminalBubbleBranchSides(graph) : new Map();
    const bandageCurvature = bandageCurvatureForGraph(graph);

    const newPaths: SegmentPath[] = [];
    const newLinkPaths: LinkPath[] = [];

    for (const node of graph.nodes) {
      const leftEle = cy.getElementById(endpointId(node.id, 'left'));
      const rightEle = cy.getElementById(endpointId(node.id, 'right'));
      if (leftEle.length === 0 || rightEle.length === 0) continue;

      const left = modelToViewport(leftEle.position(), pan, zoom);
      const right = modelToViewport(rightEle.position(), pan, zoom);

      const color = colorByCoverage
        ? coverageToColor(node.coverage, minCoverage, maxCoverage, themeMode)
        : isBandageStyle
          ? bandageSegmentColor(node.id)
          : defaultContigColor(themeMode);

      let pathD: string;
      if (isSingleSegment) {
        pathD = majorArcPath(left, right);
      } else if (isSimpleCycle) {
        pathD = ringSegmentPath(left, right, centre);
      } else if (bubbleBranchSides.has(node.id)) {
        pathD = bubbleBranchPath(left, right, bubbleBranchSides.get(node.id)!);
      } else {
        pathD = curvedSegmentPath(left, right, centre, isBandageStyle ? bandageCurvature : 0.25);
      }

      // Label near the chord midpoint
      const labelX = (left.x + right.x) / 2;
      const labelY = (left.y + right.y) / 2;

      newPaths.push({
        segmentId: node.id,
        pathD,
        color,
        thickness,
        label: node.label ?? node.id,
        labelX,
        labelY,
      });
    }

    if (isBandageStyle) {
      deduplicateReciprocalLinks(graph.edges).forEach((group, index) => {
        const representative = group.representative;
        const { sourceEndpointId, targetEndpointId } = mapLinkEndpoints(
          representative.source,
          representative.sourceOrient,
          representative.target,
          representative.targetOrient,
        );
        const sourceEle = cy.getElementById(sourceEndpointId);
        const targetEle = cy.getElementById(targetEndpointId);
        if (sourceEle.length === 0 || targetEle.length === 0) return;

        const source = modelToViewport(sourceEle.position(), pan, zoom);
        const target = modelToViewport(targetEle.position(), pan, zoom);
        const id = `link::${representative.id}::${index}`;

        newLinkPaths.push({
          id,
          pathD: `M ${source.x} ${source.y} L ${target.x} ${target.y}`,
          selectionId: id,
          isBandageStyle: true,
          edge: {
            id: representative.id,
            source: representative.source,
            target: representative.target,
            sourceOrient: representative.sourceOrient,
            targetOrient: representative.targetOrient,
            overlap: representative.overlap,
            tags: representative.tags,
            reciprocalMemberCount: group.members.length,
            reciprocalMembers: group.members.map((edge) => edge.id),
            rawLinks: group.members
              .map((edge) => edge.raw)
              .filter((raw): raw is string => raw !== undefined),
          },
        });
      });
    } else {
      const elements = graphToCytoscape(graph, { themeMode, colorByCoverage, lengthScale });
      for (const edge of elements.edges) {
        const data = edge.data as Record<string, unknown>;
        if (data.kind !== 'gfa-link') continue;

        const sourceId = String(data.source);
        const targetId = String(data.target);
        const sourceEle = cy.getElementById(sourceId);
        const targetEle = cy.getElementById(targetId);
        if (sourceEle.length === 0 || targetEle.length === 0) continue;

        const source = modelToViewport(sourceEle.position(), pan, zoom);
        const target = modelToViewport(targetEle.position(), pan, zoom);
        const id = String(data.id);

        newLinkPaths.push({
          id,
          pathD: curvedSegmentPath(source, target, centre, 0.18),
          selectionId: id,
          isBandageStyle: false,
          edge: {
            id: String(data.originalEdgeId ?? data.id),
            source: String(data.sourceSegment),
            target: String(data.targetSegment),
            sourceOrient: data.sourceOrient as '+' | '-' | undefined,
            targetOrient: data.targetOrient as '+' | '-' | undefined,
            overlap: data.overlap as string | undefined,
            tags: (data.tags as Record<string, string>) ?? {},
            reciprocalMemberCount: data.reciprocalMemberCount as number | undefined,
            reciprocalMembers: (data.reciprocalMembers as string[] | undefined) ?? undefined,
            rawLinks: (data.rawLinks as string[] | undefined) ?? undefined,
          },
        });
      }
    }

    setSegmentPaths(newPaths);
    setLinkPaths(newLinkPaths);
  }, [cy, graph, themeMode, colorByCoverage, isBandageStyle, lengthScale]);

  // Keep a stable ref to the latest buildPaths so the RAF callback never goes stale
  const buildPathsRef = useRef(buildPaths);
  buildPathsRef.current = buildPaths;

  // Throttle viewport updates to one per animation frame
  const scheduleBuild = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      buildPathsRef.current();
    });
  }, []);

  useEffect(() => {
    if (!cy) return;

    buildPaths();
    cy.on('viewport', scheduleBuild);
    cy.on('layoutstop', buildPaths);

    return () => {
      cy.off('viewport', scheduleBuild);
      cy.off('layoutstop', buildPaths);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [cy, buildPaths, scheduleBuild]);

  // Rebuild when graph content, theme, coverage mode, or length scale changes
  useEffect(() => {
    buildPaths();
  }, [graph, themeMode, colorByCoverage, lengthScale, buildPaths]);

  useEffect(() => {
    setPressedLinkId(null);
  }, [graph, layout]);

  if (!graph || segmentPaths.length === 0) return null;

  return (
    <svg
      className="graph-overlay"
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      {linkPaths.map(({ id, pathD, edge, isBandageStyle: isBandageLink }) => {
        if (!isBandageLink || edge.id !== pressedLinkId) {
          return null;
        }

        return (
          <path
            key={`${id}-selection`}
            className="link-selection-path"
            d={pathD}
            stroke={BANDAGE_LINK_HALO_COLOR}
            strokeWidth={BANDAGE_LINK_HALO_WIDTH}
            strokeLinecap="round"
            fill="none"
            opacity={0.65}
          />
        );
      })}
      {linkPaths.map(({ id, pathD, edge, isBandageStyle: isBandageLink }) => {
        const isSelected = edge.id === selectedLinkId;
        const strokeColor = isSelected ? palette.edgeSelectionColor : palette.linkColor;
        const className = isBandageLink ? 'link-path' : 'graph-overlay-link-visible';

        return (
          <path
            key={`${id}-visible`}
            className={className}
            d={pathD}
            stroke={strokeColor}
            strokeWidth={isBandageLink ? (isSelected ? 2.5 : 1) : isSelected ? 1.5 : 0.75}
            strokeLinecap="round"
            fill="none"
            opacity={isBandageLink ? 0.8 : 0.75}
          />
        );
      })}
      {segmentPaths.map(({ segmentId, pathD, color, thickness, label, labelX, labelY }) => {
        const isSelected = segmentId === selectedSegmentId;
        const strokeColor = isSelected ? palette.contigSelectionColor : color;

        return (
          <g key={segmentId}>
            <path
              className="contig-path graph-overlay-segment-visible"
              d={pathD}
              stroke={strokeColor}
              strokeWidth={thickness}
              strokeLinecap={isBandageStyle ? 'butt' : 'round'}
              fill="none"
            />
            {!isBandageStyle && (
              <text
                x={labelX}
                y={labelY}
                fill={palette.textColor}
                fontSize="7"
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ userSelect: 'none' }}
              >
                {label}
              </text>
            )}
            <path
              className="graph-overlay-segment-hit"
              data-testid={`segment-hit-${segmentId}`}
              d={pathD}
              stroke="transparent"
              strokeWidth={14}
              strokeLinecap={isBandageStyle ? 'butt' : 'round'}
              fill="none"
              pointerEvents="stroke"
              onClick={(event) => {
                event.stopPropagation();
                onSelectElement?.({ kind: 'segment', id: segmentId });
              }}
            />
          </g>
        );
      })}
      {linkPaths.map(({ id, pathD, edge, selectionId, isBandageStyle: isBandageLink }) => {
        return (
          <path
            key={`${id}-hit`}
            className={isBandageLink ? 'link-hit-path graph-overlay-link-hit' : 'graph-overlay-link-hit'}
            data-testid={`link-hit-${selectionId}`}
            d={pathD}
            stroke="transparent"
            strokeWidth={12}
            strokeLinecap="round"
            fill="none"
            pointerEvents="stroke"
            onPointerDown={(event) => {
              event.stopPropagation();
              if (isBandageLink) {
                setPressedLinkId(edge.id);
              }
              event.currentTarget.setPointerCapture?.(event.pointerId);
            }}
            onPointerUp={(event) => {
              event.stopPropagation();
              setPressedLinkId(null);
              event.currentTarget.releasePointerCapture?.(event.pointerId);
            }}
            onPointerCancel={(event) => {
              event.stopPropagation();
              setPressedLinkId(null);
            }}
            onPointerLeave={() => {
              setPressedLinkId(null);
            }}
            onClick={(event) => {
              event.stopPropagation();
              if (isBandageLink) {
                onLinkSelect?.(edge);
                return;
              }

              onSelectElement?.({ kind: 'link', id: selectionId });
            }}
          />
        );
      })}
    </svg>
  );
}
