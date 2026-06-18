import type { LayoutName } from '../graph/layouts';
import { LAYOUT_NAMES } from '../graph/layouts';
import type { ThemeMode } from '../graph/coverageColors';

const LAYOUT_LABELS: Record<LayoutName, string> = {
  fcose: 'fCoSE',
  bandage: 'Bandage-style',
  circle: 'Circle',
  concentric: 'Concentric',
  cose: 'CoSE',
  breadthfirst: 'Breadthfirst',
  grid: 'Grid',
};

interface ToolbarProps {
  layout: LayoutName;
  onLayoutChange: (layout: LayoutName) => void;
  onLoadExample: (example: string) => void;
  themeMode: ThemeMode;
  onThemeModeChange: (themeMode: ThemeMode) => void;
  colorByCoverage: boolean;
  onColorByCoverageChange: (enabled: boolean) => void;
}

export function Toolbar({
  layout,
  onLayoutChange,
  onLoadExample,
  themeMode,
  onThemeModeChange,
  colorByCoverage,
  onColorByCoverageChange,
}: ToolbarProps) {
  return (
    <div className="toolbar" role="toolbar" aria-label="Graph tools">
      <span className="toolbar-label">Layout:</span>
      <select
        value={layout}
        onChange={(e) => onLayoutChange(e.target.value as LayoutName)}
        aria-label="Select layout algorithm"
      >
        {LAYOUT_NAMES.map((name) => (
          <option key={name} value={name}>
            {LAYOUT_LABELS[name]}
          </option>
        ))}
      </select>

      <span className="toolbar-divider" aria-hidden="true" />

      <span className="toolbar-label">Theme:</span>
      <button
        onClick={() => onThemeModeChange(themeMode === 'light' ? 'dark' : 'light')}
        aria-label="Toggle theme mode"
      >
        {themeMode === 'light' ? 'Light' : 'Dark'}
      </button>

      <label className="toolbar-checkbox">
        <input
          type="checkbox"
          checked={colorByCoverage}
          onChange={(event) => onColorByCoverageChange(event.target.checked)}
        />
        Colour by coverage
      </label>

      <span className="toolbar-divider" aria-hidden="true" />

      <span className="toolbar-label">Examples:</span>
      <button onClick={() => onLoadExample('tiny.gfa')}>tiny.gfa</button>
      <button onClick={() => onLoadExample('simple_cycle.gfa')}>simple_cycle.gfa</button>
      <button onClick={() => onLoadExample('branching_graph.gfa')}>branching_graph.gfa</button>
    </div>
  );
}
