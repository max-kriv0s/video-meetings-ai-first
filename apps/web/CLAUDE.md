# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

This is the Next.js frontend (`apps/web`), part of a larger npm workspaces monorepo — see the root `CLAUDE.md` for monorepo-wide commands and shared config. Package name is `web` (not `frontend`).

## Commands

Run from this directory, or via `npm run <script> --workspace web` from the repo root:

```bash
npm run dev      # next dev (Turbopack)
npm run build     # next build
npm run lint       # eslint
npm run format      # prettier --write over src/**/*.{ts,tsx}
```

There is no test setup in this app yet.

## Architecture

App Router, TypeScript, `src/` directory, import alias `@/*` → `./src/*`.

- `src/app/layout.tsx` is the root layout. It wraps `children` in `<Providers>` (from `src/app/providers.tsx`) and sets `suppressHydrationWarning` on `<html>` — required because `next-themes` patches the `class` attribute on the client after hydration.
- `src/app/providers.tsx` is a client component (`"use client"`) that sets up `next-themes`'s `ThemeProvider` with `attribute="class"`, enabling light/dark/system theme switching by toggling the `.dark` class on `<html>`.
- UI components come from **HeroUI v3** (`@heroui/react`, formerly NextUI). This is the current major version, built on React Aria + Tailwind CSS v4 (not the old CSS-in-JS NextUI v2) — **no `HeroUIProvider` or other wrapper component is needed**. Do not add one; do not add `framer-motion` (v3 doesn't use it, unlike v2).
- `src/app/globals.css` imports HeroUI's stylesheet via `@import "@heroui/react/styles"`, which itself pulls in Tailwind's base styles — there is no separate `@import "tailwindcss"` line. HeroUI's theme already defines `--background`/`--foreground` and other CSS variables for light/dark mode (switched via the `.dark` class from `next-themes`); don't redefine those in `:root` as create-next-app's template normally does.
- `tsconfig.json` extends the root `tsconfig.base.json` and adds Next-specific options (`moduleResolution: bundler`, `jsx: react-jsx`, the `next` TS plugin, path alias).
- `eslint.config.mjs` imports the root `eslint.config.mjs` as `baseConfig` and spreads it first, ahead of `eslint-config-next`'s `core-web-vitals` and `typescript` configs.

When you add routes, restructure `src/`, or otherwise change this app's architecture, update the Architecture section above in the same change.
