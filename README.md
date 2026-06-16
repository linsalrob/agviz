# AgViz

AgViz is a browser-native assembly graph visualisation tool for GFA files.

## Goals

- Upload GFA files locally in the browser.
- Visualise assembly segments and links.
- Inspect contigs, links, paths, and graph metadata.
- Provide a modern open-source foundation for assembly graph exploration.

## MVP

The first working version should:

- parse `H`, `S`, `L`, and basic `P` GFA records in the browser;
- render segments as nodes and links as edges;
- support pan, zoom, selection, and inspection;
- provide basic graph statistics and styling;
- require no backend service.

## Technical direction

AgViz is planned as a new browser-native TypeScript application using React, Vite, and Cytoscape.js.

- Treat Bandage as a behavioural reference, not a codebase to port.
- Treat agtools as conceptual inspiration, not an MVP runtime dependency.
- Keep the GFA parser, internal graph model, and rendering adapter separate.

## Roadmap

- file upload and example GFAs;
- Cytoscape.js graph viewer and inspector panel;
- filters, search, and layout controls;
- support for larger graphs and `.gfa.gz`;
- optional future experiments with Graphviz/Wasm and Pyodide.

## Status

This repository currently defines the project direction and initial scope for AgViz. The application scaffold and implementation are still to be added.
