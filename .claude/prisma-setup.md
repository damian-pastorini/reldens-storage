# Prisma Setup For Development And Tests

Prisma is not a dependency of this package. `package.json` does not list `prisma`, `@prisma/client` or
`@prisma/adapter-mariadb`, and no file under `lib/` requires them. The Prisma driver receives everything it needs
through the `prismaModules` object, so Prisma only has to exist in the project that uses the driver, or in this
repo when you want to run the Prisma driver tests.

## Install, Test, Uninstall Workflow

The goal is to run the Prisma driver tests and leave no trace in `package.json`, `package-lock.json` or
`node_modules`. The local `--no-save` sequence does exactly that and is the reliable one (PowerShell):

```powershell
npm install --no-save prisma@7.9.1 @prisma/client@7.9.1 @prisma/adapter-mariadb@7.9.1
$env:RELDENS_TEST_PRISMA_ENABLED = "1"
$env:RELDENS_LOG_LEVEL = "9"
npm run test
npm uninstall --no-save prisma @prisma/client @prisma/adapter-mariadb
```

Same sequence in Bash / Git Bash:

```bash
npm install --no-save prisma@7.9.1 @prisma/client@7.9.1 @prisma/adapter-mariadb@7.9.1
RELDENS_TEST_PRISMA_ENABLED=1 RELDENS_LOG_LEVEL=9 npm run test
npm uninstall --no-save prisma @prisma/client @prisma/adapter-mariadb
```

The global variant: global packages are never found by `require()`, so when the local resolution fails
`TestHelpers.registerNpmGlobalPaths()` runs `npm root -g`, appends that folder and its nested
`@prisma/client/node_modules` to `NODE_PATH`, re-initializes the module paths and stores the root in
`RELDENS_TEST_NPM_GLOBAL_ROOT` (inherited by the Prisma subprocess worker). No manual `NODE_PATH` is needed, but
the packages must be under the folder `npm root -g` prints (PowerShell):

```powershell
npm install -g prisma@7.9.1 @prisma/client@7.9.1 @prisma/adapter-mariadb@7.9.1
$env:RELDENS_TEST_PRISMA_ENABLED = "1"
$env:RELDENS_LOG_LEVEL = "9"
npm run test
npm uninstall -g prisma @prisma/client @prisma/adapter-mariadb
```

Only the `--no-save` sequence was executed end to end with the Prisma driver passing. The global lookup was
executed once against a global root that did not contain the packages, so its resolution path is verified but a
full Prisma driver run from a global install is not. If the pre-flight still says
`Prisma package not installed`, the packages are not under the folder `npm root -g` prints.

## Installing Prisma

### Local install without saving (recommended)

Run inside this repo, it installs the three packages into `node_modules` without touching `package.json` or
`package-lock.json`:

```bash
npm install --no-save prisma@7.9.1 @prisma/client@7.9.1 @prisma/adapter-mariadb@7.9.1
```

A later plain `npm install` removes them again, because they are not in the lock file. Re-run the command when
that happens.

To remove them by hand:

```bash
npm uninstall --no-save prisma @prisma/client @prisma/adapter-mariadb
```

### Global install

A global install alone does not work, because Node `require()` and `require.resolve()` never look into the
global `node_modules`:

- `TestHelpers.isPrismaAvailable()` resolves the three packages with `require.resolve()`.
- `tests/utils/test-helpers.js` and `tests/utils/prisma-subprocess-worker.js` require `@prisma/adapter-mariadb`.
- The generated client at `prisma/client` requires `@prisma/client-runtime-utils` at runtime.

Only `npx prisma` finds a global CLI. The test helpers compensate: `TestHelpers.registerNpmGlobalPaths()` adds
the `npm root -g` folder and its nested `@prisma/client/node_modules` to `NODE_PATH` at runtime when the local
resolution fails, see the workflow section above.

```bash
npm install -g prisma@7.9.1 @prisma/client@7.9.1 @prisma/adapter-mariadb@7.9.1
```

To remove the global install:

```bash
npm uninstall -g prisma @prisma/client @prisma/adapter-mariadb
```

## Enabling The Prisma Driver In The Tests

Two conditions must be true, checked by `TestHelpers.isPrismaEnabled()`:

1. `RELDENS_TEST_PRISMA_ENABLED` is exactly `1`. Default is disabled: `tests/.env.test.example` ships it as `0`.
2. `prisma`, `@prisma/client` and `@prisma/adapter-mariadb` resolve from this repo. The `prisma` CLI package is
   resolved through `prisma/package.json`, because its `exports` entry `"."` points to `build/types.js`, a file that
   is not shipped in 7.9.1, so `require.resolve('prisma')` throws even when the package is installed.

When the flag is not `1` the pre-flight package check does not list the Prisma packages and the drivers unit test
does not include the Prisma driver, so Prisma is not mentioned in the output at all.

When either condition fails the Prisma driver is left out of `TestHelpers.activeDriverNames()`, so
`DriverRegistry` never sets it up and `run-tests.js` never runs it. With the flag set to `1` but the packages
missing, the pre-flight package check reports the three packages as optional warnings instead of failing.

You can enable it in `tests/.env.test`:

```
RELDENS_TEST_PRISMA_ENABLED=1
```

`run-tests.js` loads `tests/.env.test` with `process.loadEnvFile()` only when `RELDENS_TEST_DB_HOST` is not
already set, and `loadEnvFile()` never overrides variables already present in the environment, so a value set in
the shell always wins over the file.

## Running The Tests

Bash / Git Bash:

```bash
RELDENS_TEST_PRISMA_ENABLED=1 RELDENS_LOG_LEVEL=9 npm run test
```

That command is correct: the two variables reach `node tests/run-tests.js`, the Prisma driver is enabled and the
`Logger` prints everything. Without `RELDENS_LOG_LEVEL=9` the run prints only the npm header.

PowerShell does not accept the `VAR=value command` prefix, use:

```powershell
$env:RELDENS_TEST_PRISMA_ENABLED = "1"
$env:RELDENS_LOG_LEVEL = "9"
npm run test
```

Only the Prisma driver (the `test:driver` script ends with an empty `--driver=`, so the argument must be passed
through `npm run test`):

```bash
RELDENS_TEST_PRISMA_ENABLED=1 RELDENS_LOG_LEVEL=9 npm run test -- --driver=prisma
```

Expected pre-flight output with the flag set and Prisma installed: `Package prisma verified: 7.9.1`,
`Package @prisma/client verified: 7.9.1` and `Package @prisma/adapter-mariadb verified: 7.9.1`. With the flag set
and Prisma missing: three `Optional package not installed` warnings and the Prisma driver absent from the driver
registry. With the flag unset: no Prisma line at all. Verified results: 324 tests without the Prisma driver, 406
with it.

## What The Prisma Driver Test Setup Does

`TestHelpers.setupDriver('prisma')`:

1. Forks `tests/utils/prisma-subprocess-worker.js`, which writes `prisma/schema.prisma` and `prisma.config.js`
   in the repo root, runs `npx prisma db pull` and `npx prisma generate`, and disconnects.
2. `TestHelpers.loadPrismaModules()` requires the generated client from `prisma/client`, requires
   `@prisma/adapter-mariadb`, instantiates the client with the adapter and returns
   `{PrismaClient, Prisma, PrismaAdapter, client}` (the tests use the MariaDB adapter, the driver accepts any).
3. Passes that object as `prismaModules` to `PrismaDataServer`, whose `connect()` validates it with
   `PrismaModulesValidator`.

`TestHelpers.cleanupGeneratedFiles()` removes `prisma/`, `prisma.config.js` and `generated-entities/` at the
start and at the end of a run unless `--skip-cleanup` is passed.
