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

npm test                # jest --passWithNoTests — unit tests (*.spec.ts, colocated under src/); currently none exist, so this passes trivially
npm test -- app.controller   # run a single test file by name pattern
npm run test:watch
npm run test:cov
npm run test:e2e         # jest --config ./test/jest-e2e.json (test/*.e2e-spec.ts)
npm run test:debug       # attaches the Node inspector, runs jest --runInBand
```

## Architecture

- `src/main.ts` bootstraps the app via `NestFactory.create(AppModule)`, applies shared setup through `configureApp` (`src/bootstrap.ts`, currently a global `ValidationPipe({ whitelist: true, transform: true })`), and listens on `process.env.PORT ?? 3001`. `test/*.e2e-spec.ts` files reuse `configureApp` directly so e2e requests go through the same pipes as production.
- `src/app.module.ts` wires the feature modules together: `PrismaModule`, `AuthModule`, `MeetingsModule`.
- `src/prisma/` — `PrismaModule` is `@Global()` and exports `PrismaService` (extends the generated `PrismaClient` from `src/generated/prisma`, connects via `@prisma/adapter-pg` using `DATABASE_URL`). Schema lives in `prisma/schema.prisma`; models are `User` and `Meeting` (one-to-many via `Meeting.ownerId`, `onDelete: Cascade`).
- `src/jwt/` — the shared JWT auth mechanism, deliberately kept independent of the `auth` feature module (registration/login) so any module can protect its own routes without importing `auth`'s controller/handlers. There is no `@nestjs/passport`/`passport-jwt` dependency. `jwt.module.ts` exports `JwtModule` (registers `@nestjs/jwt`'s own `JwtModule` — aliased to `NestJwtModule` inside this one file to avoid a name clash with our own class of the same name — with `JWT_SECRET` from `ConfigService`, 1h expiry) plus `JwtAuthGuard`. `jwt-auth.guard.ts` reads the `Authorization: Bearer <token>` header and verifies it with `JwtService.verifyAsync`, attaching `AuthenticatedUser` to `request.user`. `current-user.decorator.ts` exposes it to controllers as `@CurrentUser()` (throws `UnauthorizedException` if used on a route not behind `JwtAuthGuard`). `jwt.types.ts` holds `JwtPayload` (`{ sub, email }`), `AuthenticatedUser`, and `RequestWithUser`. Any module that needs to guard routes imports this `JwtModule` directly (not `AuthModule`).
- `src/auth/` — registration/login. Uses `@nestjs/cqrs` (`CommandBus` + `EventBus`): `AuthController` dispatches `RegisterCommand`/`LoginCommand` to handlers under `commands/handlers`, which publish `UserRegisteredEvent`/`UserLoggedInEvent` (logged by handlers under `events/handlers`). Passwords are hashed with `argon2`. `token.util.ts#signAccessToken` signs a `JwtPayload` (from `../jwt/jwt.types`) via the `JwtModule` imported from `../jwt/jwt.module`.
- `src/meetings/` — CRUD-style CQRS module following the same `commands/`+`queries/`(`impl`+`handlers`) layout as `auth`. `MeetingsController` imports `JwtModule` from `../jwt/jwt.module` directly and is guarded with `@UseGuards(JwtAuthGuard)`; every command/query is scoped to `@CurrentUser().userId` as `ownerId`. `GET /meetings/:id` throws `NotFoundException` both when the id doesn't exist and when it belongs to another user (no 403 — existence isn't leaked). `meeting.types.ts` holds the `MeetingResult` response shape and the `toMeetingResult` mapper off the Prisma `Meeting` model.
- `nest-cli.json` sets `sourceRoot: "src"` and `deleteOutDir: true` (build always clears `dist/` first).
- `tsconfig.json` extends the root `tsconfig.base.json` and adds Nest-specific options: `module`/`moduleResolution: nodenext`, `experimentalDecorators` + `emitDecoratorMetadata` (required for Nest's decorator-based DI), and `outDir: dist`. `tsconfig.build.json` extends `tsconfig.json` and excludes `test/**` and `*.spec.ts` from production builds. Note: with `emitDecoratorMetadata` on, interface-typed parameters in decorated method signatures (e.g. controller methods using `@CurrentUser()`) must be imported with `import type`, or `nest build` fails with TS1272.
- `eslint.config.mjs` imports the root `eslint.config.mjs` as `baseConfig` and spreads it first, then applies `typescript-eslint`'s `recommendedTypeChecked` (type-aware linting via `projectService`) plus `eslint-plugin-prettier/recommended`. Notable rule overrides: `@typescript-eslint/no-explicit-any` is off, `no-floating-promises` and `no-unsafe-argument` are downgraded to warnings.
- `prisma.config.ts` (root of this app) loads `.env` via `dotenv/config` and points Prisma at `prisma/schema.prisma` and `DATABASE_URL`; `docker-compose.yml` at the repo root provides a local Postgres for `DATABASE_URL` to point at.

## CQRS pattern

`auth` and `meetings` both use `@nestjs/cqrs`; new feature modules with reads/writes should follow the same shape:

- `CqrsModule` is imported per feature module (it is not global) alongside the module's own command/query/event handlers, listed as regular `providers`.
- Writes: `commands/impl/*.command.ts` — plain data classes (e.g. `RegisterCommand`, `CreateMeetingCommand`) carrying only constructor args, no logic. `commands/handlers/*.handler.ts` — one `@CommandHandler(SomeCommand)` class per command, `implements ICommandHandler<SomeCommand, Result>`, does the actual work (Prisma calls, hashing, etc.) in `execute()`.
- Reads: same split under `queries/impl/*.query.ts` + `queries/handlers/*.handler.ts`, using `@QueryHandler`/`IQueryHandler` and `QueryBus` instead.
- Controllers stay thin: they only build a command/query instance and `return this.commandBus.execute(...)` / `this.queryBus.execute(...)` — no Prisma access or business logic in the controller itself.
- Optional side effects (logging, notifications, etc., not part of the request/response) go through `events/impl/*.event.ts` + `events/handlers/*.handler.ts` (`@EventsHandler`/`IEventHandler`, `handle()` returns `void`), published from inside a command handler via `EventBus.publish(...)` after the write succeeds. `auth`'s `RegisterHandler`/`LoginHandler` publish `UserRegisteredEvent`/`UserLoggedInEvent`, each just logged by their handler — there's no other subscriber yet. `meetings` doesn't publish any events currently; add one only when something actually needs to react to a meeting being created/changed.
- One class per file (command, query, event, or handler), named consistently in pairs (`CreateMeetingCommand` ↔ `CreateMeetingHandler`).

When you add modules, change the folder layout, or otherwise change this app's architecture, update the Architecture section above in the same change.
