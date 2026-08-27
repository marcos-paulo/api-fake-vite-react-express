# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

`api-fake` is an installable npm package (published as a tarball, not to a registry — see `package:pack`) that runs alongside another project. Once installed in a host project, it exposes an Express + React UI for toggling "fake"/mock API endpoints on and off, and rewrites a proxy config file in the **host project** (not this repo) so the host's own dev server can point live routes at these fakes. It ships three interchangeable runtime shells around the same server: a plain browser, a Puppeteer app-window, and an Electron app-window.

Everything under `src/` compiles to `dist/`, and `dist/` plus `scripts/` is what actually gets packed and installed into a consumer project (see `scripts/prepare-release-package.mjs`).

## Common commands

There is no test suite configured in this repo (no `test` script, no test runner).

```bash
npm run dev:browser          # backend + frontend, opens in a normal browser (main dev loop)
npm run dev:with:puppeteer   # backend + frontend + a Puppeteer app-window shell
npm run dev:with:electron    # backend + frontend + an Electron app-window shell (first ensures dist/electron exists)
npm run lint                 # eslint .
npm run build                # full production build: types -> server -> client -> puppeteer -> bin -> postinstall
npm run package:prepare      # assembles dist/ + scripts/ into dist-package/ with a trimmed package.json
npm run package:pack         # cleans, builds, prepares, and `npm pack`s dist-package/ into dist-target/
```

Individual build steps (`build:types`, `build:server`, `build:client`, `build:puppeteer`, `build:bin`, `build:electron`, `build:postinstall`) each target one `tsconfig.pack-*.json` and can be run standalone when iterating on one output. `build:bin` compiles every entrypoint under `src/bin/` (the production combined entrypoint `api-fake-prod.ts` and the `api-fake-init` scaffolding CLI) via `tsconfig.pack-bin.json`; `build:postinstall` compiles what actually runs automatically on install (`src/postinstall/download-puppeteer.ts`) via `tsconfig.pack-postinstall.json`.

`npm run server:dev:watch` / `npm run client:dev:wait` / `npm run puppeteer:dev` / `npm run electron:dev` are the pieces the `dev:*` concurrently-scripts orchestrate; run one directly only when debugging that piece in isolation. The `client:*` and `puppeteer:*`/`electron:*` dev scripts wait on TCP ports (3342/3343) via `wait-on` before starting, so the backend must come up first.

## Architecture

### Runtime shells vs. the server

There is exactly one Express server (`src/server/server.ts`) and one Vite/React client (`src/client/`). The three `bin/api-fake-*.mjs` entry points (and their compiled production counterpart, `src/bin/api-fake-prod.ts`) don't run different servers — they just decide what UI shell wraps the same client/server pair: a browser tab, a Puppeteer `--app=` window, or an Electron `BrowserWindow`. `api-fake-prod.ts` is the production combined entrypoint: it spawns the compiled server, waits for its TCP port, then spawns the compiled Puppeteer shell as a child process.

`server-load-config.ts` reads/creates `api-fake.config.json` in the **consumer's** working directory (`process.env.API_FAKE_WORKDIR ?? process.cwd()`), merges it over defaults, resolves path-like keys (`WORKSPACES_ROOT_PATH`, `PROXY_CONFIG_FILE`) relative to that workdir, and runs `configValidators` at import time — an invalid config calls `process.exit(1)` with a formatted, colorized help message. This module is a side-effecting singleton (`loadConfig()` runs at the bottom of the file); everything else calls `getConfig()`.

### Project scaffolding vs. automatic postinstall

`api-fake` deliberately keeps two separate lifecycles apart, the same distinction as `npm install` vs. `tsc --init`:

- **Automatic, runs on every install**: `src/postinstall/download-puppeteer.ts`, wired to the packaged `postinstall` hook (see `scripts/prepare-release-package.mjs`). It only ever downloads a browser binary — safe and cheap to re-run on every `npm install`/`npm ci` in the consumer project.
- **Explicit, run once by the consumer**: `src/bin/api-fake-init.ts` (packaged bin `api-fake-init`, run via `npx api-fake-init`). It scaffolds the consumer's `package.json` scripts/`"type": "module"` (`src/init/setup-package-scripts.ts`) and lint/format/TS config files (`src/init/setup-lint-config.ts`) — one-time, idempotent (each step no-ops with a warning if the target already exists/differs), and never runs automatically, so re-running `npm install` in the consumer project doesn't repeatedly touch their files or spam warnings.

### Dynamic endpoints (the core feature)

`dynamic-endpoints.ts` defines the `ServerEndpoints` singleton (`endpointsServer`) that:

- Watches the active workspace's `endpoints/` directory (`WORKSPACES_ROOT_PATH/ACTIVE_WORKSPACE/endpoints/*.ts|*.js`) and dynamically `import()`s each file, expecting `export const endpoint: EndpointObject` (validated by `isEndpointObject` in `src/types/dynamic-endpoints.types.ts`).
- Watches the host project's proxy config file (`PROXY_CONFIG_FILE`) and, via `PROXY_CONFIG_FILE_ADDRESS_KEY` (a comma-separated key path), locates the specific object inside it to rewrite.
- Tracks which endpoints are "enabled" in `initialEnabledEndpoints.json` inside the workspace folder, and on every reload/toggle writes both that file and the proxy config file back out — enabling an endpoint here means adding `serverAddress -> localhostAddress` into the host's proxy map; disabling removes it.
- Uses `LoadingGate` (`loading-gate.ts`) as a readiness/mutex primitive: any request handled by `dynamic-endpoints-middleware.ts` should conceptually wait for in-flight endpoint reloads, and `beginLoading()`/`reloadEndpointModules()` wrap their work in `loadingGate.run()`.
- Cache-busts endpoint module re-imports on file change (`?t=${Date.now()}` query on the import specifier) since Node ESM caches by resolved URL.
- Detects and flags duplicate `serverAddress` registrations across endpoint files (`detectDuplicateEndpoints`).

`endpoint-module-resolver.ts` registers a Node ESM loader hook (as a `data:` URL, via `node:module`'s `register`) so that endpoint files living **outside this package**, in the consumer's own `endpoints/` folder, can use extensionless relative imports (`./utils/foo` instead of `./utils/foo.ts`) even though Node's native TS type-stripping still requires explicit extensions for module resolution.

Request flow for a fake endpoint: `dynamic-endpoints-middleware.ts` runs early in the Express chain and matches `req.path` against `endpointsServer.enabledEndpointModules`. If the path instead matches a *loaded but currently disabled* endpoint (`endpointsServer.loadedModules`), it 404s with a debug log instead of falling through — helpful when you forgot to enable it. Any other unmatched path calls `next()` toward `production-static-middleware.ts` (serves `dist/client` when not under Vite) and finally a global error handler. There is no fixed path prefix (e.g. `/api/`) reserved for fake endpoints — `serverAddress`/`localhostAddress` are freely defined per endpoint (see `EndpointObject` in `src/types/dynamic-endpoints.types.ts`).

### Client <-> server sync

The React client (`src/client/App.tsx`, `components/ListEndpoints.tsx`) talks to routes under `src/server/routes/` (`endpoints-route.ts` lists endpoints, `change-state-endpoint-route.ts` toggles them, `open-endpoint-file-route.ts` opens an endpoint file in the editor, `shutdown-route.ts`/`simulate-error-route.ts`). Live updates use SSE: `events-route.ts` holds open `/api/events` connections and `notifySseClients()` (wired up in `server-bootstrap.ts` via `endpointsServer.onReload(...)`) pushes a `data: reload` message whenever endpoints or the proxy config change, so the UI re-fetches without polling.

### Config resolution model

Both `server-load-config.ts` and `vite.config.ts` need the same config. `vite.config.ts` only dynamically imports `getConfig()` in dev mode (guarded by an `isBuild` check based on `process.env.VITE`/`NODE_ENV`) so that a production client build doesn't need a live config file. The Vite dev server proxies `/api` to `API_PORT` and exposes `API_PORT` to client code via a `define`d global (`__VITE_API_PORT__`) so the client can open the SSE connection directly rather than through the proxy.

### Logging convention

`src/server/logger.ts` implements a stack-based, indented section logger (`logger.startSection(name)` / `log.step/info/warn/success/error` / `log.endSection()`). Nearly all server-side code follows this pattern for structured, nested console output — match it when adding server logic rather than using bare `console.log`.

## Conventions

- Naming conventions for functions/callbacks/state (verb prefixes `fetch`/`save`/`handle`, phase suffixes `Start`/`Success`/`Error`, avoiding gerund function names, decomposing async flows into per-phase `useCallback`s) are documented in detail in `docs/naming-conventions.md` — read it before naming client-side async logic.
- Browser-opening behavior for the Vite dev server (`BROWSER`/`BROWSER_ARGS` config keys, precedence order) is documented in `docs/browser-configuration.md`.
- ESLint (`eslint.config.js`) has different rule sets per area: browser/React globals by default, Node globals + `no-console: off` for `src/server/**`, and `no-console: off` for CLI/build scripts (`src/bin`, `src/init`, `src/postinstall`, `src/puppeteer`, `src/electron`, `vite.config.ts`). Imports are auto-sorted via `simple-import-sort`; type-only imports must use a separate `import type { X }` declaration (`consistent-type-imports`, `fixStyle: 'separate-type-imports'`) — the inline `import { type X }` form is avoided because Node's native TS type-stripping only elides whole `import type` statements, not inline type specifiers, which breaks type-only imports from packages (like `api-fake` itself) that publish no runtime entry point.
- Prettier: single quotes, semicolons, 100-char print width, trailing commas everywhere, `arrowParens: always`.
- Node engine is pinned to `^22` (see `.nvmrc` = 22); ESM-only (`"type": "module"`).
- Multiple `tsconfig.pack-*.json` files exist because each build target (`bin`, `electron`, `postinstall`, `puppeteer`, `server`, `types`) is bundled independently via `tsup` with its own tsconfig — keep new build targets consistent with this pattern rather than adding conditionals to a shared config.
