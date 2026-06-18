import { useState, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { GraphViewer } from './components/GraphViewer';
import { InspectorPanel } from './components/InspectorPanel';
import { Toolbar } from './components/Toolbar';
import { StatusBar } from './components/StatusBar';
import { parseGfa } from './gfa/parseGfa';
import { gfaToGraph } from './gfa/gfaToGraph';
import type { AssemblyGraph } from './graph/graphTypes';
import type { AssemblyNode, AssemblyEdge } from './graph/graphTypes';
import type { LayoutName } from './graph/layouts';
import type { ThemeMode } from './graph/coverageColors';
import type { SegmentLengthScaleMode } from './graph/visualScale';
import './App.css';

type SelectedElement =
  | { kind: 'node'; data: AssemblyNode }
  | { kind: 'edge'; data: AssemblyEdge }
  | null;

const THEME_STORAGE_KEY = 'agviz:theme';

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const stored =
    typeof localStorage.getItem === 'function'
      ? localStorage.getItem(THEME_STORAGE_KEY)
      : null;
  if (stored === 'dark' || stored === 'light') {
    return stored;
  }

  return 'light';
}

function App() {
  const [graph, setGraph] = useState<AssemblyGraph | null>(null);
  const [selected, setSelected] = useState<SelectedElement>(null);
  const [layout, setLayout] = useState<LayoutName>('bandage');
  const [segmentLengthScaleMode, setSegmentLengthScaleMode] =
    useState<SegmentLengthScaleMode>('log');
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getInitialTheme());
  const [colorByCoverage, setColorByCoverage] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string | undefined>();
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadGfa = useCallback((text: string, name: string) => {
    try {
      const parsed = parseGfa(text);
      const g = gfaToGraph(parsed);
      setGraph(g);
      setSelected(null);
      setLayout('bandage');
      setFileName(name);
      setWarnings(g.warnings);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse GFA file');
      setGraph(null);
    }
  }, []);

  const loadExample = useCallback(
    async (example: string) => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}examples/${example}`);
        if (!res.ok) throw new Error(`Failed to fetch ${example}: ${res.statusText}`);
        const text = await res.text();
        loadGfa(text, example);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load example');
      }
    },
    [loadGfa],
  );

  const handleThemeModeChange = useCallback((next: ThemeMode) => {
    setThemeMode(next);
    if (typeof localStorage.setItem === 'function') {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    }
  }, []);

  return (
    <div className="app" data-theme={themeMode}>
      <header className="app-header">
        <h1>
          <a className="app-title-link" href={import.meta.env.BASE_URL}>
            AgViz
          </a>
        </h1>
        <span className="app-subtitle">Assembly Graph Visualisation</span>
      </header>

      <div className="app-toolbar">
        <Toolbar
          layout={layout}
          onLayoutChange={setLayout}
          segmentLengthScaleMode={segmentLengthScaleMode}
          onSegmentLengthScaleModeChange={setSegmentLengthScaleMode}
          onLoadExample={loadExample}
          themeMode={themeMode}
          onThemeModeChange={handleThemeModeChange}
          colorByCoverage={colorByCoverage}
          onColorByCoverageChange={setColorByCoverage}
        />
      </div>

      {!graph && (
        <div className="app-upload">
          <FileUpload onFile={loadGfa} />
        </div>
      )}

      {error && (
        <div className="app-error" role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      {warnings.length > 0 && (
        <details className="app-warnings">
          <summary>⚠ {warnings.length} warning{warnings.length !== 1 ? 's' : ''}</summary>
          <ul>
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </details>
      )}

      <div className="app-main">
        <GraphViewer
          graph={graph}
          layout={layout}
          onSelect={setSelected}
          themeMode={themeMode}
          colorByCoverage={colorByCoverage}
          segmentLengthScaleMode={segmentLengthScaleMode}
        />
        <InspectorPanel selected={selected} />
      </div>

      <StatusBar
        nodeCount={graph?.stats.nodeCount ?? 0}
        edgeCount={graph?.stats.edgeCount ?? 0}
        fileName={fileName}
        warnings={warnings}
      />
    </div>
  );
}

export default App;
