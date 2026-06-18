# AgViz

**Assembly Graph Visualisation** — a browser-native tool for visualising genome assembly graphs from GFA files.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm test` | Run unit tests |
| `npm run preview` | Preview production build |

## Usage

1. Open the app in your browser.
2. Upload a `.gfa` file using the file picker or drag-and-drop, **or** click one of the example buttons in the toolbar.
3. The assembly graph renders with segments as nodes and links as edges.
4. Click a node to see its metadata (ID, length, coverage, sequence, tags) in the inspector panel.
5. Click an edge to see link metadata (source, target, orientations, overlap, tags).
6. Use the layout selector to switch between `fcose`, `bandage`, `circle`, `concentric`, `cose`, `breadthfirst`, and `grid` layouts.
7. Use **Segment length scale** to switch visual segment lengths between `Log`, `Linear`, and `Uniform`.

## Rendering model

AgViz uses log-scaled segment lengths by default because assembly graph segments can range from a few base pairs to millions of base pairs. Log mode uses graph-normalised log10 scaling so the shortest and longest contigs in the loaded graph define the visual length range.

Linear and uniform modes are available from the toolbar. These scales affect readability only; the exact biological length in bp is preserved in the graph model and shown in the inspector. True bp lengths are always shown in the inspector.

## Example files

Three example GFA files are included under `public/examples/`:

- `tiny.gfa` — two segments connected by one link (good first test)
- `simple_cycle.gfa` — three segments forming a cycle
- `branching_graph.gfa` — a root node with two branches converging on a tip

## GFA support

The MVP supports GFA 1 records:

| Record | Support |
|--------|---------|
| `H` | Header (parsed, tags stored) |
| `S` | Segments (sequence, `LN`, `DP`/`KC`/`RC`/`FC` coverage) |
| `L` | Links / edges (orientations, overlap/CIGAR) |
| `P` | Paths (parsed, not yet visualised) |
| Other | Stored with warnings, not visualised |

## Architecture

```
src/
  gfa/          GFA parser and graph conversion
  graph/        Internal graph model, Cytoscape adapter, styles, layouts
  components/   React UI components
```

The parser, graph model, Cytoscape adapter, and UI are kept in separate layers.

## Development

```bash
# Run tests in watch mode
npm run test:watch
```

Tests use [Vitest](https://vitest.dev/) with `jsdom`. No browser is required for unit tests.
