import { useEffect, useRef, useCallback, useState } from 'react';
import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import type { AssemblyGraph } from '../graph/graphTypes';
import type { AssemblyNode, AssemblyEdge } from '../graph/graphTypes';
import { graphToCytoscape } from '../graph/cytoscapeElements';
import { createStylesheet, getThemePalette } from '../graph/styles';
import {
  chooseDefaultLayout,
  getLayoutOptions,
  LARGE_GRAPH_NODE_THRESHOLD,
  LARGE_GRAPH_EDGE_THRESHOLD,
} from '../graph/layouts';
import type { LayoutName } from '../graph/layouts';
import type { ThemeMode } from '../graph/coverageColors';
import { GraphOverlay } from './GraphOverlay';

cytoscape.use(fcose);

type SelectedElement =
  | { kind: 'node'; data: AssemblyNode }
  | { kind: 'edge'; data: AssemblyEdge }
  | null;

function selectedElementFromEdgeData(data: Record<string, unknown>): SelectedElement {
  if (data.kind === 'contig-body') {
    return {
      kind: 'node',
      data: {
        id: String(data.segmentId),
        label: String(data.label ?? data.segmentId),
        length: data.lengthBp as number | undefined,
        sequence: data.sequence as string | undefined,
        coverage: data.coverage as number | undefined,
        degree: data.degree as number | undefined,
        tags: (data.tags as Record<string, string>) ?? {},
      },
    };
  }

  if (data.kind === 'gfa-link') {
    return {
      kind: 'edge',
      data: {
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
    };
  }

  return null;
}

interface GraphViewerProps {
  graph: AssemblyGraph | null;
  layout: LayoutName;
  onSelect: (element: SelectedElement) => void;
  themeMode: ThemeMode;
  colorByCoverage: boolean;
}

export function GraphViewer({
  graph,
  layout,
  onSelect,
  themeMode,
  colorByCoverage,
}: GraphViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [cyInstance, setCyInstance] = useState<cytoscape.Core | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);

  const selectLink = useCallback(
    (edge: AssemblyEdge) => {
      setSelectedSegmentId(null);
      setSelectedLinkId(edge.id);
      onSelect({ kind: 'edge', data: edge });
    },
    [onSelect],
  );

  const handleSelect = useCallback(
    (event: cytoscape.EventObject) => {
      const ele = event.target;
      if (!ele.isEdge()) {
        return;
      }

      const data = ele.data() as Record<string, unknown>;
      const selectedElement = selectedElementFromEdgeData(data);
      if (!selectedElement) return;

      if (selectedElement.kind === 'edge') {
        selectLink(selectedElement.data);
        return;
      }

      setSelectedSegmentId(selectedElement.data.id);
      setSelectedLinkId(null);
      onSelect(selectedElement);
    },
    [onSelect, selectLink],
  );

  const handleOverlaySelect = useCallback(
    (selection: { kind: 'segment' | 'link'; id: string }) => {
      const cy = cyRef.current;
      if (!cy) return;

      const edgeId = selection.kind === 'segment' ? `body::${selection.id}` : selection.id;
      const edge = cy.getElementById(edgeId);
      if (edge.length === 0 || !edge.isEdge()) return;

      cy.elements(':selected').unselect();
      edge.select();

      const selectedElement = selectedElementFromEdgeData(edge.data() as Record<string, unknown>);
      if (!selectedElement) return;

      if (selectedElement.kind === 'edge') {
        selectLink(selectedElement.data);
        return;
      }

      setSelectedSegmentId(selectedElement.data.id);
      setSelectedLinkId(null);
      onSelect(selectedElement);
    },
    [onSelect, selectLink],
  );

  const handleUnselect = useCallback(() => {
    setSelectedSegmentId(null);
    setSelectedLinkId(null);
    onSelect(null);
  }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style: createStylesheet(themeMode),
      userZoomingEnabled: true,
      userPanningEnabled: true,
    });

    cy.on('select', 'edge', handleSelect);
    cy.on('tap', 'edge', handleSelect);
    cy.on('unselect', 'edge', handleUnselect);

    cyRef.current = cy;
    setCyInstance(cy);

    return () => {
      cy.destroy();
      cyRef.current = null;
      setCyInstance(null);
    };
  }, [handleSelect, handleUnselect, themeMode]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.style(createStylesheet(themeMode));
  }, [themeMode]);

  // Reset segment selection whenever the graph changes so stale highlights are cleared
  useEffect(() => {
    setSelectedSegmentId(null);
    setSelectedLinkId(null);
  }, [graph]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.elements().remove();

    if (!graph) return;

    if (
      graph.stats.nodeCount > LARGE_GRAPH_NODE_THRESHOLD ||
      graph.stats.edgeCount > LARGE_GRAPH_EDGE_THRESHOLD
    ) {
      console.warn(
        `Large graph: ${graph.stats.nodeCount} nodes, ${graph.stats.edgeCount} edges. Using grid layout.`,
      );
    }

    const defaultedLayout = layout === 'fcose' ? chooseDefaultLayout(graph) : layout;
    const effectiveLayout =
      graph.stats.nodeCount > LARGE_GRAPH_NODE_THRESHOLD ||
      graph.stats.edgeCount > LARGE_GRAPH_EDGE_THRESHOLD
        ? 'grid'
        : defaultedLayout;

    const elements = graphToCytoscape(graph, { themeMode, colorByCoverage });
    if (effectiveLayout === 'bandage') {
      for (const edge of elements.edges) {
        if (edge.classes === 'gfa-link') {
          edge.classes = 'gfa-link bandage-overlay-hidden';
        }
      }
    }

    cy.add([...elements.nodes, ...elements.edges]);

    const layoutOptions = getLayoutOptions(effectiveLayout, graph);
    const layoutRun = cy.layout(layoutOptions);
    cy.one('layoutstop', () => {
      cy.fit(undefined, effectiveLayout === 'bandage' ? 120 : 40);
    });
    layoutRun.run();
  }, [graph, layout, themeMode, colorByCoverage]);

  const palette = getThemePalette(themeMode);

  return (
    <div className="graph-viewer-wrapper" style={{ background: palette.graphBackground }}>
      {!graph && (
        <div className="graph-viewer-placeholder">
          <p>Upload a GFA file to visualise the assembly graph.</p>
        </div>
      )}
      <div
        ref={containerRef}
        className="graph-viewer-canvas"
        aria-label="Assembly graph canvas"
        role="img"
      />
      <GraphOverlay
        cy={cyInstance}
        graph={graph}
        themeMode={themeMode}
        colorByCoverage={colorByCoverage}
        selectedSegmentId={selectedSegmentId}
        layout={layout}
        selectedLinkId={selectedLinkId}
        onLinkSelect={selectLink}
        onSelectElement={handleOverlaySelect}
      />
    </div>
  );
}
