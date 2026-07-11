# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This is the Nest.js backend (`apps/api`), part of a larger npm workspaces monorepo — see the root `CLAUDE.md` for monorepo-wide commands and shared config. Package name is `api` (not `backend`).

## Commands

Run from this directory, or via `npm run <script> --workspace api` from the repo root:

```bash
npm run start:dev      # nest start --watch
npm run build           # nest build (outputs to dist/)
npm run lint            # eslint --fix over {src,apps,libs,test}/**/*.ts
npm run format           # prettier --write over src/ and test/

npm test                # jest — all unit tests (*.spec.ts, colocated under src/)
npm test -- app.controller   # run a single test file by name pattern
npm run test:watch
npm run test:cov
npm run test:e2e         # jest --config ./test/jest-e2e.json (test/*.e2e-spec.ts)
npm run test:debug       # attaches the Node inspector, runs jest --runInBand
```

## Architecture

This is currently a bare Nest.js starter — no domain modules have been added yet:

- `src/main.ts` bootstraps the app via `NestFactory.create(AppModule)` and listens on `process.env.PORT ?? 3000`.
- `src/app.module.ts` / `app.controller.ts` / `app.service.ts` are the single generated module/controller/service triplet — the template for how future feature modules should be structured (module wires controller + service via Nest's DI).
- `nest-cli.json` sets `sourceRoot: "src"` and `deleteOutDir: true` (build always clears `dist/` first).
- `tsconfig.json` extends the root `tsconfig.base.json` and adds Nest-specific options: `module`/`moduleResolution: nodenext`, `experimentalDecorators` + `emitDecoratorMetadata` (required for Nest's decorator-based DI), and `outDir: dist`. `tsconfig.build.json` extends `tsconfig.json` and excludes `test/**` and `*.spec.ts` from production builds.
- `eslint.config.mjs` imports the root `eslint.config.mjs` as `baseConfig` and spreads it first, then applies `typescript-eslint`'s `recommendedTypeChecked` (type-aware linting via `projectService`) plus `eslint-plugin-prettier/recommended`. Notable rule overrides: `@typescript-eslint/no-explicit-any` is off, `no-floating-promises` and `no-unsafe-argument` are downgraded to warnings.

When you add modules, change the folder layout, or otherwise change this app's architecture, update the Architecture section above in the same change.
