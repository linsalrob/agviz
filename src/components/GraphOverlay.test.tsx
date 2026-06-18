import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { GraphOverlay } from './GraphOverlay';
import type { AssemblyGraph } from '../graph/graphTypes';

// Make requestAnimationFrame synchronous in JSDOM
beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// Minimal Cytoscape mock that returns known endpoint positions
function makeCyMock(
  positions: Record<string, { x: number; y: number }>,
  pan = { x: 0, y: 0 },
  zoom = 1,
) {
  return {
    on: vi.fn(),
    off: vi.fn(),
    pan: () => pan,
    zoom: () => zoom,
    getElementById: vi.fn().mockImplementation((id: string) => {
      const pos = positions[id];
      return {
        length: pos !== undefined ? 1 : 0,
        position: () => pos ?? { x: 0, y: 0 },
      };
    }),
  };
}

const singleSegmentGraph: AssemblyGraph = {
  nodes: [{ id: 'seg1', label: 'seg1', length: 5000, coverage: 20, tags: {} }],
  edges: [],
  warnings: [],
  stats: { nodeCount: 1, edgeCount: 0, totalLength: 5000 },
};

const twoSegmentGraph: AssemblyGraph = {
  nodes: [
    { id: 'A', label: 'A', length: 1000, coverage: 10, tags: {} },
    { id: 'B', label: 'B', length: 2000, coverage: 20, tags: {} },
  ],
  edges: [
    {
      id: 'A-B',
      source: 'A',
      target: 'B',
      sourceOrient: '+',
      targetOrient: '+',
      overlap: '100M',
      tags: {},
    },
  ],
  warnings: [],
  stats: { nodeCount: 2, edgeCount: 1, totalLength: 3000 },
};

const singleSegPositions = {
  'seg1::__left': { x: 0, y: 0 },
  'seg1::__right': { x: 100, y: 0 },
};

const twoSegPositions = {
  'A::__left': { x: 0, y: 0 },
  'A::__right': { x: 50, y: 0 },
  'B::__left': { x: 100, y: 0 },
  'B::__right': { x: 200, y: 0 },
};

const simpleCycleGraph: AssemblyGraph = {
  nodes: [
    { id: 'A', label: 'A', length: 1000, coverage: 20, tags: {} },
    { id: 'B', label: 'B', length: 1500, coverage: 15, tags: {} },
    { id: 'C', label: 'C', length: 900, coverage: 8, tags: {} },
  ],
  edges: [
    {
      id: 'A-B',
      source: 'A',
      target: 'B',
      sourceOrient: '+',
      targetOrient: '+',
      overlap: '100M',
      tags: {},
    },
    {
      id: 'B-C',
      source: 'B',
      target: 'C',
      sourceOrient: '+',
      targetOrient: '+',
      overlap: '100M',
      tags: {},
    },
    {
      id: 'C-A',
      source: 'C',
      target: 'A',
      sourceOrient: '+',
      targetOrient: '+',
      overlap: '100M',
      tags: {},
    },
  ],
  warnings: [],
  stats: { nodeCount: 3, edgeCount: 3, totalLength: 3400 },
};

const simpleCyclePositions = {
  'A::__left': { x: -45, y: -95 },
  'A::__right': { x: 95, y: -45 },
  'B::__left': { x: 105, y: -25 },
  'B::__right': { x: 25, y: 105 },
  'C::__left': { x: 0, y: 112 },
  'C::__right': { x: -105, y: -20 },
};

const branchingGraph: AssemblyGraph = {
  nodes: [
    { id: 'root', label: 'root', length: 2000, coverage: 30, tags: {} },
    { id: 'branch1', label: 'branch1', length: 800, coverage: 10, tags: {} },
    { id: 'branch2', label: 'branch2', length: 850, coverage: 11, tags: {} },
    { id: 'tip', label: 'tip', length: 500, coverage: 5, tags: {} },
  ],
  edges: [
    {
      id: 'root-branch1',
      source: 'root',
      target: 'branch1',
      sourceOrient: '+',
      targetOrient: '+',
      overlap: '50M',
      tags: {},
    },
    {
      id: 'root-branch2',
      source: 'root',
      target: 'branch2',
      sourceOrient: '+',
      targetOrient: '+',
      overlap: '50M',
      tags: {},
    },
    {
      id: 'branch1-tip',
      source: 'branch1',
      target: 'tip',
      sourceOrient: '+',
      targetOrient: '+',
      overlap: '50M',
      tags: {},
    },
    {
      id: 'branch2-tip',
      source: 'branch2',
      target: 'tip',
      sourceOrient: '+',
      targetOrient: '+',
      overlap: '50M',
      tags: {},
    },
  ],
  warnings: [],
  stats: { nodeCount: 4, edgeCount: 4, totalLength: 4150 },
};

const branchingPositions = {
  'root::__left': { x: 320, y: -240 },
  'root::__right': { x: -120, y: 130 },
  'branch1::__left': { x: -145, y: 142 },
  'branch1::__right': { x: -145, y: -88 },
  'branch2::__left': { x: -95, y: 118 },
  'branch2::__right': { x: -95, y: -122 },
  'tip::__left': { x: -120, y: -105 },
  'tip::__right': { x: -350, y: -270 },
};

describe('GraphOverlay', () => {
  it('renders nothing when graph is null', () => {
    const cy = makeCyMock({});
    const { container } = render(
      <GraphOverlay
        cy={cy as never}
        graph={null}
        themeMode="light"
        colorByCoverage={false}
        selectedSegmentId={null}
      />,
    );
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders nothing when cy is null', () => {
    const { container } = render(
      <GraphOverlay
        cy={null}
        graph={singleSegmentGraph}
        themeMode="light"
        colorByCoverage={false}
        selectedSegmentId={null}
      />,
    );
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders an SVG overlay for a single-segment graph', async () => {
    const cy = makeCyMock(singleSegPositions);
    const { container } = render(
      <GraphOverlay
        cy={cy as never}
        graph={singleSegmentGraph}
        themeMode="light"
        colorByCoverage={false}
        selectedSegmentId={null}
      />,
    );

    await waitFor(() => {
      expect(container.querySelector('svg.graph-overlay')).not.toBeNull();
    });
  });

  it('renders one path per segment', async () => {
    const cy = makeCyMock(twoSegPositions);
    const { container } = render(
      <GraphOverlay
        cy={cy as never}
        graph={twoSegmentGraph}
        themeMode="light"
        colorByCoverage={false}
        selectedSegmentId={null}
      />,
    );

    await waitFor(() => {
      const paths = container.querySelectorAll('path.graph-overlay-segment-visible');
      expect(paths).toHaveLength(2);
    });
  });

  it('renders a major arc path (A command) for a single-segment graph', async () => {
    const cy = makeCyMock(singleSegPositions);
    const { container } = render(
      <GraphOverlay
        cy={cy as never}
        graph={singleSegmentGraph}
        themeMode="light"
        colorByCoverage={false}
        selectedSegmentId={null}
      />,
    );

    await waitFor(() => {
      const path = container.querySelector('path.graph-overlay-segment-visible');
      expect(path).not.toBeNull();
      expect(path!.getAttribute('d')).toMatch(/ A /);
    });
  });

  it('renders curved Bezier paths (Q command) for multi-segment graphs', async () => {
    const cy = makeCyMock(twoSegPositions);
    const { container } = render(
      <GraphOverlay
        cy={cy as never}
        graph={twoSegmentGraph}
        themeMode="light"
        colorByCoverage={false}
        selectedSegmentId={null}
      />,
    );

    await waitFor(() => {
      const paths = container.querySelectorAll('path.graph-overlay-segment-visible');
      expect(paths.length).toBeGreaterThanOrEqual(1);
      // All segment paths should use quadratic Bezier (Q), not straight lines
      paths.forEach((p) => {
        expect(p.getAttribute('d')).toContain('Q ');
      });
    });
  });

  it('paths do not contain a straight L command', async () => {
    const cy = makeCyMock(twoSegPositions);
    const { container } = render(
      <GraphOverlay
        cy={cy as never}
        graph={twoSegmentGraph}
        themeMode="light"
        colorByCoverage={false}
        selectedSegmentId={null}
      />,
    );

    await waitFor(() => {
      const paths = container.querySelectorAll('path.graph-overlay-segment-visible');
      expect(paths.length).toBeGreaterThan(0);
      paths.forEach((p) => {
        expect(p.getAttribute('d')).not.toMatch(/ L /);
      });
    });
  });

  it('applies default contig colour when colorByCoverage is false (light theme)', async () => {
    const cy = makeCyMock(singleSegPositions);
    const { container } = render(
      <GraphOverlay
        cy={cy as never}
        graph={singleSegmentGraph}
        themeMode="light"
        colorByCoverage={false}
        selectedSegmentId={null}
      />,
    );

    await waitFor(() => {
      const path = container.querySelector('path.graph-overlay-segment-visible');
      expect(path!.getAttribute('stroke')).toBe('#2563eb');
    });
  });

  it('applies coverage colour when colorByCoverage is true', async () => {
    const cy = makeCyMock(twoSegPositions);
    const { container } = render(
      <GraphOverlay
        cy={cy as never}
        graph={twoSegmentGraph}
        themeMode="light"
        colorByCoverage={true}
        selectedSegmentId={null}
      />,
    );

    await waitFor(() => {
      const paths = container.querySelectorAll('path.graph-overlay-segment-visible');
      expect(paths.length).toBeGreaterThan(0);
      // Coverage colours should be rgb(...) values, not the default hex contig colour
      paths.forEach((p) => {
        expect(p.getAttribute('stroke')).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
      });
    });
  });

  it('applies selection colour to the selected segment', async () => {
    const cy = makeCyMock(twoSegPositions);
    const { container } = render(
      <GraphOverlay
        cy={cy as never}
        graph={twoSegmentGraph}
        themeMode="light"
        colorByCoverage={false}
        selectedSegmentId="A"
      />,
    );

    await waitFor(() => {
      // Find path for segment A (first path in DOM order matches first node)
      const segmentPaths = container.querySelectorAll('path.graph-overlay-segment-visible');
      expect(segmentPaths.length).toBe(2);

      // Segment A's path should use the selection colour
      const aPath = segmentPaths[0];
      expect(aPath!.getAttribute('stroke')).toBe('#d97706'); // light theme contigSelectionColor
    });
  });

  it('applies dark theme colours', async () => {
    const cy = makeCyMock(singleSegPositions);
    const { container } = render(
      <GraphOverlay
        cy={cy as never}
        graph={singleSegmentGraph}
        themeMode="dark"
        colorByCoverage={false}
        selectedSegmentId={null}
      />,
    );

    await waitFor(() => {
      const path = container.querySelector('path.graph-overlay-segment-visible');
      expect(path!.getAttribute('stroke')).toBe('#7dd3fc'); // dark theme default contig colour
    });
  });

  it('uses pan and zoom offsets for viewport coordinates', async () => {
    const cy = makeCyMock(singleSegPositions, { x: 50, y: 100 }, 2);
    const { container } = render(
      <GraphOverlay
        cy={cy as never}
        graph={singleSegmentGraph}
        themeMode="light"
        colorByCoverage={false}
        selectedSegmentId={null}
      />,
    );

    await waitFor(() => {
      const path = container.querySelector('path.graph-overlay-segment-visible');
      expect(path).not.toBeNull();
      // With pan=(50,100) zoom=2: left (0*2+50=50, 0*2+100=100), right (100*2+50=250, 0*2+100=100)
      const d = path!.getAttribute('d')!;
      expect(d).toMatch(/^M 50 100 /);
    });
  });

  it('registers viewport and layoutstop events on cy', async () => {
    const cy = makeCyMock(singleSegPositions);
    render(
      <GraphOverlay
        cy={cy as never}
        graph={singleSegmentGraph}
        themeMode="light"
        colorByCoverage={false}
        selectedSegmentId={null}
      />,
    );

    await waitFor(() => {
      expect(cy.on).toHaveBeenCalledWith('viewport', expect.any(Function));
      expect(cy.on).toHaveBeenCalledWith('layoutstop', expect.any(Function));
    });
  });

  it('renders labels for each segment', async () => {
    const cy = makeCyMock(twoSegPositions);
    const { container } = render(
      <GraphOverlay
        cy={cy as never}
        graph={twoSegmentGraph}
        themeMode="light"
        colorByCoverage={false}
        selectedSegmentId={null}
      />,
    );

    await waitFor(() => {
      const texts = container.querySelectorAll('text');
      expect(texts).toHaveLength(2);
      const labels = Array.from(texts).map((t) => t.textContent);
      expect(labels).toContain('A');
      expect(labels).toContain('B');
    });
  });

  it('hides labels and uses per-segment colours in Bandage-style layout', async () => {
    const cy = makeCyMock(twoSegPositions);
    const { container } = render(
      <GraphOverlay
        cy={cy as never}
        graph={twoSegmentGraph}
        themeMode="light"
        colorByCoverage={false}
        selectedSegmentId={null}
        layout="bandage"
      />,
    );

    await waitFor(() => {
      expect(container.querySelectorAll('text')).toHaveLength(0);

      const strokes = Array.from(container.querySelectorAll('path.contig-path')).map((path) =>
        path.getAttribute('stroke'),
      );
      const caps = Array.from(container.querySelectorAll('path.contig-path')).map((path) =>
        path.getAttribute('stroke-linecap'),
      );
      const widths = Array.from(container.querySelectorAll('path.contig-path')).map((path) =>
        path.getAttribute('stroke-width'),
      );
      expect(strokes).toHaveLength(2);
      expect(new Set(strokes).size).toBe(2);
      expect(strokes).not.toContain('#2563eb');
      expect(caps).toEqual(['butt', 'butt']);
      expect(widths).toEqual(['6', '6']);
    });
  });

  it('renders clickable Bandage-style link paths', async () => {
    const onLinkSelect = vi.fn();
    const cy = makeCyMock(twoSegPositions);
    const { container } = render(
      <GraphOverlay
        cy={cy as never}
        graph={twoSegmentGraph}
        themeMode="light"
        colorByCoverage={false}
        selectedSegmentId={null}
        layout="bandage"
        onLinkSelect={onLinkSelect}
      />,
    );

    await waitFor(() => {
      expect(container.querySelector('path.link-path')).not.toBeNull();
    });

    const hitPath = container.querySelector('path.link-hit-path');
    expect(hitPath).not.toBeNull();
    fireEvent.click(hitPath!);

    expect(onLinkSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'A-B',
        source: 'A',
        target: 'B',
      }),
    );
  });

  it('renders a larger grey press halo for Bandage-style links while the mouse is held', async () => {
    const cy = makeCyMock(twoSegPositions);
    const { container } = render(
      <GraphOverlay
        cy={cy as never}
        graph={twoSegmentGraph}
        themeMode="light"
        colorByCoverage={false}
        selectedSegmentId={null}
        layout="bandage"
        selectedLinkId="A-B"
      />,
    );

    await waitFor(() => {
      expect(container.querySelector('path.link-hit-path')).not.toBeNull();
      expect(container.querySelector('path.link-path')).not.toBeNull();
    });

    expect(container.querySelector('path.link-selection-path')).toBeNull();

    const hitPath = container.querySelector('path.link-hit-path')!;
    fireEvent.pointerDown(hitPath, { pointerId: 1 });

    const selectionPath = container.querySelector('path.link-selection-path')!;
    const visiblePath = container.querySelector('path.link-path')!;
    expect(selectionPath.getAttribute('stroke')).toBe('#94a3b8');
    expect(selectionPath.getAttribute('stroke-width')).toBe('22');
    expect(visiblePath.getAttribute('stroke')).toBe('#d97706');
    expect(visiblePath.getAttribute('stroke-width')).toBe('2.5');

    fireEvent.pointerUp(hitPath, { pointerId: 1 });
    expect(container.querySelector('path.link-selection-path')).toBeNull();
  });

  it('renders visible Bandage-style links behind contig paths to avoid junction overdraw', async () => {
    const cy = makeCyMock(twoSegPositions);
    const { container } = render(
      <GraphOverlay
        cy={cy as never}
        graph={twoSegmentGraph}
        themeMode="light"
        colorByCoverage={false}
        selectedSegmentId={null}
        layout="bandage"
      />,
    );

    await waitFor(() => {
      expect(container.querySelector('path.link-path')).not.toBeNull();
      expect(container.querySelector('path.contig-path')).not.toBeNull();
      expect(container.querySelector('path.link-hit-path')).not.toBeNull();
    });

    const paths = Array.from(container.querySelectorAll('path'));
    const visibleLinkIndex = paths.findIndex((path) => path.classList.contains('link-path'));
    const firstContigIndex = paths.findIndex((path) => path.classList.contains('contig-path'));
    const hitPathIndex = paths.findIndex((path) => path.classList.contains('link-hit-path'));

    expect(visibleLinkIndex).toBeLessThan(firstContigIndex);
    expect(hitPathIndex).toBeGreaterThan(firstContigIndex);
  });

  it('uses gentler Bandage-style curves for tiny two-segment graphs', async () => {
    const cy = makeCyMock(twoSegPositions);
    const { container } = render(
      <GraphOverlay
        cy={cy as never}
        graph={twoSegmentGraph}
        themeMode="light"
        colorByCoverage={false}
        selectedSegmentId={null}
        layout="bandage"
      />,
    );

    await waitFor(() => {
      expect(container.querySelector('path.contig-path')).not.toBeNull();
    });

    const firstPath = container.querySelector('path.contig-path')!;
    expect(firstPath.getAttribute('d')).toContain('Q 25 9 50 0');
  });

  it('draws simple Bandage-style cycles as circular arc segments', async () => {
    const cy = makeCyMock(simpleCyclePositions);
    const { container } = render(
      <GraphOverlay
        cy={cy as never}
        graph={simpleCycleGraph}
        themeMode="light"
        colorByCoverage={false}
        selectedSegmentId={null}
        layout="bandage"
      />,
    );

    await waitFor(() => {
      expect(container.querySelectorAll('path.contig-path')).toHaveLength(3);
      expect(container.querySelectorAll('path.link-path')).toHaveLength(3);
    });

    Array.from(container.querySelectorAll('path.contig-path')).forEach((path) => {
      expect(path.getAttribute('d')).toContain(' A ');
      expect(path.getAttribute('d')).not.toContain(' Q ');
    });
  });

  it('draws Bandage-style bubble branches on opposite curve sides', async () => {
    const cy = makeCyMock(branchingPositions);
    const { container } = render(
      <GraphOverlay
        cy={cy as never}
        graph={branchingGraph}
        themeMode="light"
        colorByCoverage={false}
        selectedSegmentId={null}
        layout="bandage"
      />,
    );

    await waitFor(() => {
      expect(container.querySelectorAll('path.contig-path')).toHaveLength(4);
      expect(container.querySelectorAll('path.link-path')).toHaveLength(4);
    });

    const branchPaths = Array.from(container.querySelectorAll('path.contig-path'))
      .map((path) => path.getAttribute('d') ?? '')
      .filter((pathD) => pathD.includes(' C '));
    expect(branchPaths).toHaveLength(2);
    expect(branchPaths[0]).toContain('-271.5');
    expect(branchPaths[1]).toContain('37');
  });

  it('renders nothing when no endpoint positions are found in cy', async () => {
    // cy returns no elements for any id
    const cy = makeCyMock({});
    const { container } = render(
      <GraphOverlay
        cy={cy as never}
        graph={singleSegmentGraph}
        themeMode="light"
        colorByCoverage={false}
        selectedSegmentId={null}
      />,
    );

    // No paths should appear
    await waitFor(() => {
      expect(container.querySelector('path.graph-overlay-segment-visible')).toBeNull();
    });
  });

  it('renders a non-Bandage link hit path that calls the selection handler', async () => {
    const cy = makeCyMock(twoSegPositions);
    const onSelectElement = vi.fn();
    const { rerender } = render(
      <GraphOverlay
        cy={cy as never}
        graph={twoSegmentGraph}
        themeMode="light"
        colorByCoverage={false}
        selectedSegmentId={null}
        onSelectElement={onSelectElement}
      />,
    );

    const hit = await waitFor(() => {
      const linkHit = document.querySelector('path.graph-overlay-link-hit');
      expect(linkHit).not.toBeNull();
      return linkHit as SVGPathElement;
    });
    expect(hit).toHaveAttribute('pointer-events', 'stroke');
    expect(hit).toHaveAttribute('stroke-width', '12');

    rerender(
      <GraphOverlay
        cy={cy as never}
        graph={twoSegmentGraph}
        themeMode="light"
        colorByCoverage={false}
        selectedSegmentId={null}
        lengthScale={{
          mode: 'uniform',
          minVisualLengthPx: 12,
          maxVisualLengthPx: 260,
          uniformLengthPx: 60,
        }}
        onSelectElement={onSelectElement}
      />,
    );

    const rerenderedHit = await waitFor(() => {
      const linkHit = document.querySelector('path.graph-overlay-link-hit');
      expect(linkHit).not.toBeNull();
      return linkHit as SVGPathElement;
    });

    fireEvent.click(rerenderedHit);
    expect(onSelectElement).toHaveBeenCalledWith({
      kind: 'link',
      id: 'link::A+|B+|100M|A-B::0',
    });
  });

  it('renders a segment hit path that calls the selection handler', async () => {
    const cy = makeCyMock(twoSegPositions);
    const onSelectElement = vi.fn();
    const { getByTestId, rerender } = render(
      <GraphOverlay
        cy={cy as never}
        graph={twoSegmentGraph}
        themeMode="light"
        colorByCoverage={false}
        selectedSegmentId={null}
        onSelectElement={onSelectElement}
      />,
    );

    const hit = await waitFor(() => getByTestId('segment-hit-A'));
    expect(hit).toHaveAttribute('pointer-events', 'stroke');
    expect(hit).toHaveAttribute('stroke-width', '14');

    rerender(
      <GraphOverlay
        cy={cy as never}
        graph={twoSegmentGraph}
        themeMode="light"
        colorByCoverage={false}
        selectedSegmentId={null}
        lengthScale={{
          mode: 'linear',
          minVisualLengthPx: 12,
          maxVisualLengthPx: 260,
          pixelsPerBase: 0.05,
        }}
        onSelectElement={onSelectElement}
      />,
    );

    const rerenderedHit = await waitFor(() => getByTestId('segment-hit-A'));

    fireEvent.click(rerenderedHit);
    expect(onSelectElement).toHaveBeenCalledWith({ kind: 'segment', id: 'A' });
  });

  it('clicking the empty overlay does not select a random item', async () => {
    const cy = makeCyMock(twoSegPositions);
    const onSelectElement = vi.fn();
    const { container } = render(
      <GraphOverlay
        cy={cy as never}
        graph={twoSegmentGraph}
        themeMode="light"
        colorByCoverage={false}
        selectedSegmentId={null}
        onSelectElement={onSelectElement}
      />,
    );

    const svg = await waitFor(() => container.querySelector('svg.graph-overlay'));
    fireEvent.click(svg!);
    expect(onSelectElement).not.toHaveBeenCalled();
  });

});
