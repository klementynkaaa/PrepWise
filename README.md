# PREPWISE

An installable web app that helps households in Poland prepare an emergency supply kit. It tells you what to get, how much, and in what order. It works online and offline, so it still works during a blackout. Household data is kept on your device; household sharing between members' devices is being built and stays switched off in production until a legal review is done.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static export to out/ + service worker
npm start        # serve the production build locally (test offline here)
npm test         # unit, integration and component tests
npm run test:e2e # browser tests (offline + accessibility); needs a prior npm run build
npm run storybook # component showcase (http://localhost:6006)
npm run test:storybook # every story in Chromium, with accessibility checks
```

Requires Node.js 22.

## Documentation

See [`docs/`](docs/README.md): [product](docs/product.md), [business rules](docs/business-rules.md) and [architecture](docs/architecture.md). Rules for AI coding agents are in [`AGENTS.md`](AGENTS.md).
