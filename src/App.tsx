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
import './App.css';

type SelectedElement =
  | { kind: 'node'; data: AssemblyNode }
  | { kind: 'edge'; data: AssemblyEdge }
  | null;

function App() {
  const [graph, setGraph] = useState<AssemblyGraph | null>(null);
  const [selected, setSelected] = useState<SelectedElement>(null);
  const [layout, setLayout] = useState<LayoutName>('fcose');
  const [fileName, setFileName] = useState<string | undefined>();
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadGfa = useCallback((text: string, name: string) => {
    try {
      const parsed = parseGfa(text);
      const g = gfaToGraph(parsed);
      setGraph(g);
      setSelected(null);
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

  return (
    <div className="app">
      <header className="app-header">
        <h1>AgViz</h1>
        <span className="app-subtitle">Assembly Graph Visualisation</span>
      </header>

      <div className="app-toolbar">
        <Toolbar
          layout={layout}
          onLayoutChange={setLayout}
          onLoadExample={loadExample}
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
        <GraphViewer graph={graph} layout={layout} onSelect={setSelected} />
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
