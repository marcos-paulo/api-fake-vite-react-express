# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

`api-fake` is an installable npm package (published as a tarball, not to a registry — see `package:pack`) that runs alongside another project. Once installed in a host project, it exposes an Express + React UI for toggling "fake"/mock API endpoints on and off, and rewrites a proxy config file in the **host project** (not this repo) so the host's own dev server can point live routes at these fakes. It ships four interchangeable runtime shells around the same server: a plain browser, a Puppeteer app-window, an Electron app-window, and a terminal UI (Ink/React). `src/boot/shells-registry.ts` is the single source of truth for which shells exist and what each one needs — browser, puppeteer and the TUI have a real production path; Electron is dev-only (it depends on a native runtime this package never bundles or downloads automatically).

Everything under `src/` compiles to `dist/`, and `dist/` plus `scripts/` (assembled at package time, not a real directory in this repo — see "Layout of `src/`" below) is what actually gets packed and installed into a consumer project (see `src/release/prepare-release-package.ts`).

## Layout of `src/`

`src/` is grouped by audience, not by framework:

- **`app/`** — the application itself, the only thing that ends up running for the end user.
  - `app/backend/` — the single Express server (`server.ts`), routes, middleware, dynamic-endpoints engine.
  - `app/frontend/` — everything that renders or delivers UI:
    - `frontend/core/` — business logic shared between the two real UIs (`useEndpoints`, `useEndpointFilter`), parameterized by injection (HTTP client, live-reload transport, an optional "open file" override) — no framework/transport hardcoded here.
    - `frontend/web/` — the React DOM shell (browser tab), thin wrappers around `frontend/core` plus its own components.
    - `frontend/tui/` — the Ink shell (terminal), same pattern: thin wrappers around `frontend/core`.
    - `frontend/shells/{puppeteer,electron}/` — processes that only open a native window pointed at `frontend/web`; they render nothing of their own and don't touch `frontend/core`.
- **`boot/`** — decides and wires up what runs, in dev and in production: the `bin/` entrypoints (`api-fake-prod.ts`, `api-fake-dev.ts`, `api-fake-init.ts`), `shells-registry.ts`, `process-supervisor.ts` (spawn + wait-for-port + log-piping + SIGINT/SIGTERM shutdown cascade, shared by the dev and prod entrypoints), and `wait-for-port.ts`.
- **`release/`** — the build/pack/publish pipeline for this package itself (`build-bin.ts`, `build-postinstall.ts`, `prepare-release-package.ts`, `release.ts`, `run-tools.ts`). Only the maintainer runs this; it's never executed by a consumer and isn't part of what gets published.
- **`shared/`** — cross-cutting infrastructure with no endpoint business logic: `config.ts` (the config loader, see below) and `eslint-config.ts`. Consumed by `app/*`, `boot/*` and `release/*`, never the other way around.
- **`tooling/`** — scripts that run in the **consumer's** npm lifecycle, not in this repo's: `tooling/postinstall/download-puppeteer.ts` (automatic) and `tooling/init/*` (the one-time `api-fake-init` scaffolding, see below).
- **`types/`** — shared type contracts, unchanged by any of the above.

There is no `/bin` or `/scripts` directory at the repo root anymore — the old root-level dev wrappers and the `.mjs` build scripts were folded into `src/boot/bin/api-fake-dev.ts` and `src/release/*.ts` respectively, both run via `tsx` like everything else in this repo (no reason for some scripts to skip type-stripping and others not to).

## Common commands

There is no test suite configured in this repo (no `test` script, no test runner).

```bash
npm run dev:browser          # backend + frontend, opens in a normal browser (main dev loop)
npm run dev -- <shell>       # unified dev launcher: browser | puppeteer | electron | tui
npm run dev:with:puppeteer   # backend + frontend + a Puppeteer app-window shell
npm run dev:with:electron    # backend + frontend + an Electron app-window shell (first ensures dist/electron exists)
npm run lint                 # eslint .
npm run build                # full production build: types -> server -> client -> puppeteer -> tui -> bin -> postinstall -> shared-config
npm run package:prepare      # assembles dist/ + a generated scripts/ into dist-package/ with a trimmed package.json
npm run package:pack         # cleans, builds, prepares, and `npm pack`s dist-package/ into dist-target/
```

`npm run dev -- tui` is the only way to run the TUI in dev — Ink's raw-mode keyboard handling needs to own the real terminal TTY, which `concurrently` (used by `dev:browser`/`dev:with:puppeteer`/`dev:with:electron`) breaks by multiplexing stdio. `src/boot/bin/api-fake-dev.ts` special-cases this: it spawns the backend in the background with logs redirected to a file, waits for its port, then hands the TUI process the terminal directly. For every other shell it just delegates to the matching `dev:with:<shell>`/`dev:browser` script unchanged.

Individual build steps (`build:types`, `build:server`, `build:client`, `build:puppeteer`, `build:tui`, `build:bin`, `build:electron`, `build:postinstall`, `build:shared-config`) each target one `tsconfig.pack-*.json` and can be run standalone when iterating on one output. `build:bin` compiles every entrypoint under `src/boot/bin/` that's actually published (`api-fake-prod.ts` and the `api-fake-init` scaffolding CLI — **not** `api-fake-dev.ts`, which is dev-only tooling run straight from source, never compiled or shipped) via `tsconfig.pack-bin.json`; `build:postinstall` compiles what actually runs automatically on install (`src/tooling/postinstall/download-puppeteer.ts`) via `tsconfig.pack-postinstall.json`. `build:electron` is deliberately **not** part of the `build` aggregate — Electron stays dev-only (see `shells-registry.ts`'s `prodReady: false`), so nothing in the release pipeline needs its output.

`npm run server:dev:watch` / `npm run client:dev:wait` / `npm run puppeteer:dev` / `npm run electron:dev` / `npm run tui:dev` are the pieces the `dev:*` scripts (and `api-fake-dev.ts`) orchestrate; run one directly only when debugging that piece in isolation. These wait on the backend/client TCP ports via `tsx src/boot/wait-for-port.ts --api|--app` (reading `getConfig()` live) rather than a literal `wait-on tcp:<port>` — a hardcoded port would silently hang forever if the consumer changed `APP_PORT`/`API_PORT` in `api-fake.config.json`. Note there's no explicit host in that check (`tcp:<port>`, not `tcp:127.0.0.1:<port>`) — Vite's dev server can end up bound to `::1` only depending on the environment, and pinning `127.0.0.1` there just hangs.

## Architecture

### Runtime shells vs. the server

There is exactly one Express server (`src/app/backend/server.ts`) and one Vite/React client (`src/app/frontend/web/`). None of the 4 shells run a different server — they just decide what UI wraps the same client/server pair: a browser tab, a Puppeteer `--app=` window, an Electron `BrowserWindow`, or an Ink terminal app that talks to the backend directly (bypassing the Vite/React client entirely — it's a second, independent frontend on the same API, not a wrapper around the first one). `src/boot/bin/api-fake-prod.ts` is the production combined entrypoint: given `--shell=<id>` (default `puppeteer`), it looks up the shell in `shells-registry.ts`, spawns the compiled server, waits for its TCP port via `process-supervisor.ts`, then spawns the shell's compiled UI entry as a child process — or, for `browser`, prints the ready URL and spawns nothing (the server already serves the built client statically).

`src/shared/config.ts` reads/creates `api-fake.config.json` in the **consumer's** working directory (`process.env.API_FAKE_WORKDIR ?? process.cwd()`), merges it over defaults, resolves path-like keys (`WORKSPACES_ROOT_PATH`, `PROXY_CONFIG_FILE`) relative to that workdir, and runs `configValidators` at import time — an invalid config calls `process.exit(1)` with a formatted, colorized help message. This module is a side-effecting singleton (`loadConfig()` runs at the bottom of the file); everything else calls `getConfig()`. It lives in `shared/`, not `app/backend/`, because 4 of the 5 build targets (server, puppeteer, electron, tui, the prod/dev boot entrypoints) need it — it's cross-cutting infrastructure, not server code.

### Shared frontend logic (`app/frontend/core/`)

`app/frontend/web` and `app/frontend/tui` are two independent UIs — React DOM vs. Ink — but both run on `react`, and the actual business logic (fetch endpoints, toggle pending changes, save, filter by regex) is identical between them. That logic lives once in `app/frontend/core/hooks/{useEndpoints,useEndpointFilter}.ts`, parameterized by injection for the 3 things that genuinely differ per shell: the HTTP client instance, the live-reload subscription hook (SSE via `EventSource` in the browser, a manual `fetch` parsing the same SSE stream in the TUI, since Node has no native `EventSource`), and an optional "handle this before hitting the API" hook (the TUI uses it to open files in `nvim`/`tmux` instead of asking the server to open VS Code). `web/hooks/*.ts` and `tui/hooks/*.ts` are thin wrappers that just wire up their shell's specific instances and call into `core/`. If you ever see near-duplicate logic reappear between `web/` and `tui/`, it belongs in `core/` instead.

### Project scaffolding vs. automatic postinstall

`api-fake` deliberately keeps two separate lifecycles apart, the same distinction as `npm install` vs. `tsc --init`:

- **Automatic, runs on every install**: `src/tooling/postinstall/download-puppeteer.ts`, wired to the packaged `postinstall` hook (see `src/release/prepare-release-package.ts`). It only ever downloads a browser binary — safe and cheap to re-run on every `npm install`/`npm ci` in the consumer project.
- **Explicit, run once by the consumer**: `src/boot/bin/api-fake-init.ts` (packaged bin `api-fake-init`, run via `npx api-fake-init`). It scaffolds the consumer's `package.json` scripts/`"type": "module"` (`src/tooling/init/setup-package-scripts.ts`) and lint/format/TS config files (`src/tooling/init/setup-lint-config.ts`) — one-time, idempotent (each step no-ops with a warning if the target already exists/differs), and never runs automatically, so re-running `npm install` in the consumer project doesn't repeatedly touch their files or spam warnings.

### Dynamic endpoints (the core feature)

`app/backend/dynamic-endpoints.ts` defines the `ServerEndpoints` singleton (`endpointsServer`) that:

- Watches the active workspace's `endpoints/` directory (`WORKSPACES_ROOT_PATH/ACTIVE_WORKSPACE/endpoints/*.ts|*.js`) and dynamically `import()`s each file, expecting `export const endpoint: EndpointObject` (validated by `isEndpointObject` in `src/types/dynamic-endpoints.types.ts`).
- Watches the host project's proxy config file (`PROXY_CONFIG_FILE`) and, via `PROXY_CONFIG_FILE_ADDRESS_KEY` (a comma-separated key path), locates the specific object inside it to rewrite.
- Tracks which endpoints are "enabled" in `initialEnabledEndpoints.json` inside the workspace folder, and on every reload/toggle writes both that file and the proxy config file back out — enabling an endpoint here means adding `serverAddress -> localhostAddress` into the host's proxy map; disabling removes it.
- Uses `LoadingGate` (`app/backend/loading-gate.ts`) as a readiness/mutex primitive: any request handled by `dynamic-endpoints-middleware.ts` should conceptually wait for in-flight endpoint reloads, and `beginLoading()`/`reloadEndpointModules()` wrap their work in `loadingGate.run()`.
- Cache-busts endpoint module re-imports on file change (`?t=${Date.now()}` query on the import specifier) since Node ESM caches by resolved URL.
- Detects and flags duplicate `serverAddress` registrations across endpoint files (`detectDuplicateEndpoints`).

`app/backend/endpoint-module-resolver.ts` registers a Node ESM loader hook (as a `data:` URL, via `node:module`'s `register`) so that endpoint files living **outside this package**, in the consumer's own `endpoints/` folder, can use extensionless relative imports (`./utils/foo` instead of `./utils/foo.ts`) even though Node's native TS type-stripping still requires explicit extensions for module resolution.

Request flow for a fake endpoint: `dynamic-endpoints-middleware.ts` runs early in the Express chain and matches `req.path` against `endpointsServer.enabledEndpointModules`. If the path instead matches a *loaded but currently disabled* endpoint (`endpointsServer.loadedModules`), it 404s with a debug log instead of falling through — helpful when you forgot to enable it. Any other unmatched path calls `next()` toward `production-static-middleware.ts` (serves `dist/client` when not under Vite) and finally a global error handler. There is no fixed path prefix (e.g. `/api/`) reserved for fake endpoints — `serverAddress`/`localhostAddress` are freely defined per endpoint (see `EndpointObject` in `src/types/dynamic-endpoints.types.ts`).

### Client <-> server sync

The React client (`app/frontend/web/App.tsx`, `components/ListEndpoints.tsx`) talks to routes under `app/backend/routes/` (`endpoints-route.ts` lists endpoints, `change-state-endpoint-route.ts` toggles them, `open-endpoint-file-route.ts` opens an endpoint file in the editor, `shutdown-route.ts`/`simulate-error-route.ts`). Live updates use SSE: `events-route.ts` holds open `/api/events` connections and `notifySseClients()` (wired up in `server-bootstrap.ts` via `endpointsServer.onReload(...)`) pushes a `data: reload` message whenever endpoints or the proxy config change, so the UI re-fetches without polling. The TUI (`app/frontend/tui/`) consumes the exact same routes through its own `api-client.ts` and a hand-rolled SSE consumer (`hooks/useReloadSubscription.ts`) since Node has no native `EventSource` — see "Shared frontend logic" above for how the two UIs share everything except that transport.

### Config resolution model

Both `src/shared/config.ts` and `vite.config.ts` need the same config. `vite.config.ts` only dynamically imports `getConfig()` in dev mode (guarded by an `isBuild` check based on `process.env.VITE`/`NODE_ENV`) so that a production client build doesn't need a live config file. The Vite dev server proxies `/api` to `API_PORT` and exposes `API_PORT` to client code via a `define`d global (`__VITE_API_PORT__`) so the client can open the SSE connection directly rather than through the proxy.

### Logging convention

`src/app/backend/logger.ts` implements a stack-based, indented section logger (`logger.startSection(name)` / `log.step/info/warn/success/error` / `log.endSection()`). Nearly all server-side code follows this pattern for structured, nested console output — match it when adding server logic rather than using bare `console.log`.

## Conventions

- Naming conventions for functions/callbacks/state (verb prefixes `fetch`/`save`/`handle`, phase suffixes `Start`/`Success`/`Error`, avoiding gerund function names, decomposing async flows into per-phase `useCallback`s) are documented in detail in `docs/naming-conventions.md` — read it before naming client-side async logic.
- Browser-opening behavior for the Vite dev server (`BROWSER`/`BROWSER_ARGS` config keys, precedence order) is documented in `docs/browser-configuration.md`. This only governs the Vite **dev** server's auto-open; the production `browser` shell (`api-fake-prod.ts --shell=browser`) just starts the server and prints the URL, it doesn't auto-launch anything.
- ESLint (`eslint.config.js`) has different rule sets per area: browser/React globals by default, Node globals + `no-console: off` for `src/app/backend/**` and `src/shared/**`, and `no-console: off` for CLI/build scripts (`src/boot/**`, `src/release/**`, `src/tooling/init`, `src/tooling/postinstall`, `src/app/frontend/shells/puppeteer`, `src/app/frontend/shells/electron`, `src/app/frontend/tui`, `vite.config.ts`). Imports are auto-sorted via `simple-import-sort`; type-only imports must use a separate `import type { X }` declaration (`consistent-type-imports`, `fixStyle: 'separate-type-imports'`) — the inline `import { type X }` form is avoided because Node's native TS type-stripping only elides whole `import type` statements, not inline type specifiers, which breaks type-only imports from packages (like `api-fake` itself) that publish no runtime entry point.
- Prettier: single quotes, semicolons, 100-char print width, trailing commas everywhere, `arrowParens: always`.
- Node engine is pinned to `^22` (see `.nvmrc` = 22); ESM-only (`"type": "module"`).
- Multiple `tsconfig.pack-*.json` files exist because each build target (`bin`, `electron`, `postinstall`, `puppeteer`, `server`, `shared-config`, `tui`, `types`) is bundled independently via `tsup` with its own tsconfig — keep new build targets consistent with this pattern rather than adding conditionals to a shared config. `tsconfig.pack-server.json` is the one exception with a widened `rootDir`/`include` (covers `src/app/backend` **and** `src/shared`, not just the former) — its `--dts` build fails TypeScript's rootDir check otherwise, since `server.ts` imports `shared/config.ts`.
- Only `src/release/*.ts` (this repo's own build/pack pipeline) and the two files actually published — `src/boot/bin/api-fake-prod.ts`, `api-fake-init.ts` — matter for what ships. Everything else under `src/boot/` (`api-fake-dev.ts`, `shells-registry.ts`, `process-supervisor.ts`, `wait-for-port.ts`) is dev-only orchestration, run straight from source via `tsx`, never compiled into `dist/`.
