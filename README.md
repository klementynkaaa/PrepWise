# PREPWISE

An installable web app that helps households in Poland prepare an emergency supply kit. It tells you what to get, how much, and in what order. It works online and offline, so it still works during a blackout. Household data stays on your device.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static export to out/ + service worker
npm start        # serve the production build locally (test offline here)
npm test         # unit + integration tests
npm run test:e2e # browser tests (offline + accessibility); needs a prior npm run build
```

Requires Node.js 22.

## Documentation

See [`docs/`](docs/README.md): [product](docs/product.md), [business rules](docs/business-rules.md) and [architecture](docs/architecture.md). Rules for AI coding agents are in [`AGENTS.md`](AGENTS.md).
