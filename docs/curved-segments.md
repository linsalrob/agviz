# Curved Segment Rendering

AgViz renders contig segments as curved arcs/ribbons rather than straight lines.
This gives the assembly graph a circular, loop-like visual language that makes
topology easier to understand at a glance.

## Architecture

### Two-layer rendering

AgViz uses two rendering layers:

| Layer | Responsibility |
|---|---|
| **Cytoscape** | Layout, endpoint positions, zoom/pan, GFA-link edges, click/selection events |
| **SVG overlay** (`GraphOverlay.tsx`) | Curved contig segment bodies, labels, selection highlight |

Cytoscape's `contig-body` edges are kept in the graph with `opacity: 0` so they
participate in layout and remain clickable (for selection), but their visual
rendering is completely handled by the SVG overlay.

### Segment endpoint anchors

Each biological segment is represented by two invisible Cytoscape nodes:

```
{segmentId}::__left
{segmentId}::__right
```

GFA links connect segment endpoints, not segment centres. The endpoint-to-endpoint
mapping is controlled by orientation:

| Source orient | Source endpoint |
|---|---|
| `+` | `right` |
| `-` | `left` |

| Target orient | Target endpoint |
|---|---|
| `+` | `left` |
| `-` | `right` |

### SVG overlay synchronisation

`GraphOverlay.tsx` subscribes to:
- `layoutstop` — redraws after layout completes
- `viewport` — redraws on pan/zoom (throttled to one frame via `requestAnimationFrame`)

Each update reads viewport-space positions from Cytoscape and constructs SVG paths
in viewport coordinates. This means the overlay stays pixel-aligned with the
Cytoscape canvas during pan and zoom.

## Geometry

Geometry helpers live in `src/graph/arcGeometry.ts`.

### Single-segment graphs — major arc

When the graph has exactly one biological segment, the segment is drawn as a
**major arc** using the SVG arc command:

```
M x1 y1 A r r 0 1 1 x2 y2
```

- `largeArcFlag = 1` ensures a major arc (more than a semicircle)
- The radius is `max(chordLength × 0.75, 30)` when no explicit radius is provided
- This makes a single segment appear as a large loop rather than a straight line

### Multi-segment graphs — quadratic Bezier

For graphs with two or more segments, each contig body is drawn as a
**quadratic Bezier curve**:

```
M x1 y1 Q cx cy x2 y2
```

The control point `(cx, cy)` is placed on the perpendicular bisector of the chord,
offset away from the graph centre. This causes all segments to bow outward,
approximating a circular assembly graph layout.

```ts
function curvedSegmentPath(left, right, centre, curvature = 0.25): string
```

- `curvature` controls the bend: `0` = straight chord, `0.25` = 25% of chord length
- The control point direction is chosen so segments bow away from the graph centroid

## Visual length

Segment length readability is preserved at the **data** level. The `visualLength`
attribute on each `contig-body` edge is computed from the selected length scale.
Log mode is the default:

```
logT = (log10(lengthBp) - log10(graphMinLengthBp))
     / (log10(graphMaxLengthBp) - log10(graphMinLengthBp))
visualLength = minVisualLengthPx + logT × (maxVisualLengthPx - minVisualLengthPx)
```

Log mode uses graph-normalised log10 scaling so the shortest and longest contigs
in the loaded graph define the visual length range. Linear and uniform modes are
available from the toolbar. True bp lengths are always shown in the inspector.

> **Current approximation**: The layout engine (fCoSE / circle) places endpoints
> at positions it chooses for graph aesthetics. The chord length between a segment's
> left and right endpoints is therefore an approximation of biological length, not
> an exact pixel measurement. A future improvement could use fCoSE per-edge ideal
> lengths to enforce chord ∝ bp length.

## Styling

Curved segment paths use the same colour functions as the rest of AgViz:

| Mode | Colour source |
|---|---|
| Default | `defaultContigColor(themeMode)` |
| Coverage | `coverageToColor(coverage, min, max, themeMode)` |
| Selected | `palette.contigSelectionColor` |

Light and dark themes are both supported. Colours come from `getThemePalette()`.

### SVG path style

```tsx
<path
  d={pathD}
  stroke={strokeColor}
  strokeWidth={thickness}   // contigVisualThickness() = 6
  strokeLinecap="round"
  fill="none"
/>
```

No arrowheads. Round line caps.

## GFA link rendering

GFA links remain Cytoscape `gfa-link` edges styled with `unbundled-bezier`.
They continue to connect only to endpoint nodes (`::__left` / `::__right`),
never to segment centres.

Reciprocal GFA links are deduplicated by `deduplicateReciprocalLinks()` so only
one visible edge appears per reciprocal pair.

## Known limitations

- Label positions are at the chord midpoint, not the arc midpoint. For highly
  curved arcs, labels may appear slightly inside the curve rather than on it.
- Chord length is proportional to `visualLength` in data, but layout does not
  enforce this geometrically. See the proportional-length section above.
- The SVG overlay uses `pointer-events: none`, so selection is handled by
  clicking the invisible Cytoscape chord line. This means click targets are
  straight lines even though the visible arc is curved.

## Files changed

| File | Change |
|---|---|
| `src/graph/arcGeometry.ts` | New — geometry helpers |
| `src/components/GraphOverlay.tsx` | New — SVG overlay component |
| `src/components/GraphViewer.tsx` | Modified — exposes `cy` to overlay, tracks selection |
| `src/graph/styles.ts` | Modified — `contig-body` edges are now `opacity: 0` |
| `src/graph/arcGeometry.test.ts` | New — geometry unit tests |
| `src/components/GraphOverlay.test.tsx` | New — overlay rendering tests |
| `src/graph/styles.test.ts` | Updated — reflects new invisible contig-body style |
| `src/components/GraphViewer.test.tsx` | Updated — extended Cytoscape mock |
| `src/test/fixtures/single_segment.gfa` | New — single-segment test fixture |
