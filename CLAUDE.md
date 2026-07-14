# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository structure

This is an npm workspaces monorepo (no Turborepo/Nx, no pnpm/yarn) with two apps and a reserved package folder:

- `apps/api` — Nest.js backend (see `apps/api/CLAUDE.md`)
- `apps/web` — Next.js frontend (see `apps/web/CLAUDE.md`)
- `packages/*` — reserved for code shared between `api` and `web` (types, configs, utils). Currently empty.

`node_modules` is hoisted to the repo root by npm workspaces; there is no per-app `node_modules`. Always run `npm install` from the repo root, never inside an app directory.

## Commands

Run from the repo root:

```bash
npm install              # installs deps for every workspace

npm run dev:api           # nest start --watch
npm run dev:web           # next dev

npm run build:api         # nest build
npm run build:web         # next build

npm run lint              # lints both apps
npm run lint:api
npm run lint:web

npm run format:api        # prettier --write
npm run format:web

npm run test              # runs test:api then test:web
npm run test:api          # jest unit tests + jest e2e tests (apps/api)
npm run test:web          # apps/web has no test framework yet; currently a no-op placeholder
```

To run a script directly against one workspace instead of using the root aliases: `npm run <script> --workspace api` or `--workspace web`.

## Shared configuration

Both apps extend root-level config rather than duplicating it:

- `tsconfig.base.json` — common `compilerOptions` (`strict`, `esModuleInterop`, `skipLibCheck`, etc.). Each app's `tsconfig.json` sets `"extends": "../../tsconfig.base.json"` and only overrides what differs (module system, JSX, decorators, target).
- `.prettierrc` — lives only at the repo root. Neither app has its own `.prettierrc`; Prettier resolves the config by walking up from the file being formatted, so the root file applies to both.
- `eslint.config.mjs` (root) — a minimal flat-config array (shared ignores plus `prefer-const`/`eqeqeq`). Each app's own `eslint.config.mjs` imports this as `baseConfig` from `../../eslint.config.mjs` and spreads it as the first entry, then layers its own framework-specific config (Next's `eslint-config-next`, Nest's `typescript-eslint` + `eslint-plugin-prettier`) on top. Nest and Next need fundamentally different rule sets (JSX/React vs. Node/decorators), so the shared file intentionally stays small — do not try to move framework-specific rules into it.

## Keeping this documentation current

This file and each app's `CLAUDE.md` (`apps/api/CLAUDE.md`, `apps/web/CLAUDE.md`) describe the architecture as it exists today. When a change alters that architecture — a new app or package, a moved/renamed workspace, a changed shared-config wiring, a new top-level module or convention inside an app — update the relevant `CLAUDE.md` in the same change. Docs that drift from the code are worse than no docs.
