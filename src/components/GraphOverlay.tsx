import { useEffect, useRef, useCallback, useState } from 'react';
import type cytoscape from 'cytoscape';
import type { AssemblyGraph } from '../graph/graphTypes';
import type { ThemeMode } from '../graph/coverageColors';
import { coverageMinMax, coverageToColor, defaultContigColor } from '../graph/coverageColors';
import { contigVisualThickness } from '../graph/visualScale';
import { endpointId, graphToCytoscape } from '../graph/cytoscapeElements';
import { curvedSegmentPath, majorArcPath, graphCentre, type Point } from '../graph/arcGeometry';
import { getThemePalette } from '../graph/styles';

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
  edgeId: string;
  pathD: string;
}

export interface GraphOverlayProps {
  cy: cytoscape.Core | null;
  graph: AssemblyGraph | null;
  themeMode: ThemeMode;
  colorByCoverage: boolean;
  selectedSegmentId: string | null;
  selectedLinkId?: string | null;
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
  selectedLinkId = null,
  onSelectElement,
}: GraphOverlayProps) {
  const [paths, setPaths] = useState<SegmentPath[]>([]);
  const [linkPaths, setLinkPaths] = useState<LinkPath[]>([]);
  const rafRef = useRef<number | null>(null);
  const palette = getThemePalette(themeMode);

  const buildPaths = useCallback(() => {
    if (!cy || !graph || graph.nodes.length === 0) {
      setPaths([]);
      setLinkPaths([]);
      return;
    }

    const pan = cy.pan();
    const zoom = cy.zoom();

    const { minCoverage, maxCoverage } = coverageMinMax(graph.nodes.map((n) => n.coverage));
    const thickness = contigVisualThickness();

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
      setPaths([]);
      setLinkPaths([]);
      return;
    }

    const centre = graphCentre(allViewportPositions);
    const isSingleSegment = graph.nodes.length === 1;

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
        : defaultContigColor(themeMode);

      let pathD: string;
      if (isSingleSegment) {
        pathD = majorArcPath(left, right);
      } else {
        pathD = curvedSegmentPath(left, right, centre);
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


    const elements = graphToCytoscape(graph, { themeMode, colorByCoverage });
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
      newLinkPaths.push({
        edgeId: String(data.id),
        pathD: curvedSegmentPath(source, target, centre, 0.18),
      });
    }

    setPaths(newPaths);
    setLinkPaths(newLinkPaths);
  }, [cy, graph, themeMode, colorByCoverage]);

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

  // Rebuild when graph content, theme, or coverage mode changes
  useEffect(() => {
    buildPaths();
  }, [graph, themeMode, colorByCoverage, buildPaths]);

  if (!graph || (paths.length === 0 && linkPaths.length === 0)) return null;

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
      {linkPaths.map(({ edgeId, pathD }) => {
        const isSelected = edgeId === selectedLinkId;
        return (
          <g key={edgeId}>
            <path
              className="graph-overlay-link-visible"
              d={pathD}
              stroke={isSelected ? palette.edgeSelectionColor : palette.linkColor}
              strokeWidth={isSelected ? 1.5 : 0.75}
              strokeLinecap="round"
              fill="none"
              opacity={0.75}
            />
            <path
              className="graph-overlay-link-hit"
              data-testid={`link-hit-${edgeId}`}
              d={pathD}
              stroke="transparent"
              strokeWidth={12}
              strokeLinecap="round"
              fill="none"
              pointerEvents="stroke"
              onClick={(event) => {
                event.stopPropagation();
                onSelectElement?.({ kind: 'link', id: edgeId });
              }}
            />
          </g>
        );
      })}
      {paths.map(({ segmentId, pathD, color, thickness, label, labelX, labelY }) => {
        const isSelected = segmentId === selectedSegmentId;
        const strokeColor = isSelected ? palette.contigSelectionColor : color;

        return (
          <g key={segmentId}>
            <path
              className="graph-overlay-segment-visible"
              d={pathD}
              stroke={strokeColor}
              strokeWidth={thickness}
              strokeLinecap="round"
              fill="none"
            />
            <path
              className="graph-overlay-segment-hit"
              data-testid={`segment-hit-${segmentId}`}
              d={pathD}
              stroke="transparent"
              strokeWidth={14}
              strokeLinecap="round"
              fill="none"
              pointerEvents="stroke"
              onClick={(event) => {
                event.stopPropagation();
                onSelectElement?.({ kind: 'segment', id: segmentId });
              }}
            />
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
          </g>
        );
      })}
    </svg>
  );
}
