# Vite configuration patch for GitHub Pages

For GitHub Pages project sites, built assets need a repository-relative base path.

Ask bugbait to update `vite.config.ts` so it looks like this:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH ?? "/",
});
```

This allows local development to use `/`, while GitHub Actions can build with:

```bash
BASE_PATH=/agviz/ npm run build
```

The workflow sets `BASE_PATH` automatically from the repository name:

```yaml
BASE_PATH: /${{ github.event.repository.name }}/
```

If the site later uses a custom domain, change the workflow value to:

```yaml
BASE_PATH: /
```
