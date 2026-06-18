# AgViz

**AgViz** is a browser-based viewer for genome assembly graphs in GFA format.

Use it online:

## [Open AgViz](https://linsalrob.github.io/agviz/)

AgViz lets you load a GFA file, view the assembly graph, and inspect segments and
links without installing desktop software.

## Key Features

- Open GFA files directly in your browser.
- Drag and drop a `.gfa` file, use the file picker, or try the bundled examples.
- View segments as curved contigs with endpoint-only links between them.
- Use the Bandage-style layout by default for familiar assembly graph browsing.
- Switch layouts when needed, including fCoSE, circle, concentric, CoSE,
  breadthfirst, and grid.
- Scale segment lengths with graph-normalised log10 scaling so the shortest and
  longest contigs in the loaded graph define the visual length range.
- Switch visual length modes between Log, Linear, and Uniform.
- Colour contigs by coverage when coverage tags are present.
- Click segments and links to inspect their metadata.
- See true bp lengths in the inspector, even when visual lengths are scaled for
  readability.
- Use light or dark theme.

## What You Can Inspect

For segments, AgViz shows:

- segment ID
- true length in bp
- coverage, when available
- degree
- sequence preview
- GFA tags

For links, AgViz shows:

- source and target segments
- orientations
- overlap / CIGAR
- represented reciprocal link records
- raw link records, when available
- GFA tags

## GFA Support

AgViz currently supports the core GFA 1 records needed for graph viewing:

| Record | Support |
|--------|---------|
| `H` | Header tags are parsed and stored |
| `S` | Segments, sequence, length, coverage tags |
| `L` | Links, orientations, overlap/CIGAR |
| `P` | Paths are parsed but not yet visualised |
| Other | Stored with warnings, not visualised |

Coverage can be read from common tags such as `DP`, `KC`, `RC`, and `FC`.

## Example Graphs

The web app includes small example graphs:

- `tiny.gfa` - two segments connected by one link
- `simple_cycle.gfa` - three segments forming a cycle
- `branching_graph.gfa` - a root segment with two branches converging on a tip

## Privacy

AgViz runs in your browser. For normal use, GFA files are read locally by the web
app and are not uploaded to a server.

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

Useful commands:

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm test` | Run tests |
| `npm run preview` | Preview the production build |

## Project Structure

```text
src/
  gfa/          GFA parser and graph conversion
  graph/        Graph model, Cytoscape adapter, styles, layouts
  components/   React UI components
```

