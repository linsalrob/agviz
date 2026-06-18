# AgViz design notes

## Current rendering model

AgViz now renders each biological segment with endpoint-aware Cytoscape elements:

- two render-only endpoint nodes per segment (`segment::__left` and `segment::__right`);
- one `contig-body` edge between those endpoints;
- `gfa-link` edges between endpoints based on GFA orientation;
- reciprocal reverse-complement GFA links are collapsed to one visible connection in the default view, while represented member records are preserved as edge metadata.

This keeps the biological model in `AssemblyGraph` while ensuring links attach to distal segment ends.

## Segment length scaling

Contig body visual length defaults to graph-normalised log10 scaling:

`visualLengthPx = minVisualLengthPx + logT * (maxVisualLengthPx - minVisualLengthPx)`

where `logT` is the segment's log10 length normalised between the shortest and
longest known segment lengths in the loaded graph.

Default scale:

- `mode = log`
- `minVisualLengthPx = 24`
- `maxVisualLengthPx = 320`

Linear and uniform modes are available from the toolbar. Unknown lengths use the
minimum visual length. True bp lengths are always shown in the inspector.

## Themes and coverage colouring

The default UI theme is light mode (white canvas). A toolbar toggle switches to dark mode (black canvas).

Coverage colouring is optional and off by default. When enabled, AgViz colours contig bodies by coverage values extracted from tags (`DP`, `KC`, `RC`, `FC` priority). Segments without coverage use a neutral fallback colour.

## Current limitations

- Cytoscape layout still determines final endpoint spacing, so extremely large graphs may require simpler layouts.
- Coverage colouring currently uses a simple deterministic gradient for readability.
