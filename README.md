[![Reldens - GitHub - Release](https://www.dwdeveloper.com/media/reldens/reldens-mmorpg-platform.png)](https://www.reldens.com/)

# Reldens - Storage

## About this package
This package provides standardized database drivers for Reldens projects.
It ensures consistent data access methods across different database types and ORM implementations.

## Features

### ORM Support
- **Knex** - SQL query builder, the default driver and the only one bundled with the package
  - MySQL/MariaDB through mysql2
  - Same filter grammar as the Objection JS driver
- **Kysely** - Type safe SQL query builder (optional)
  - MySQL/MariaDB through mysql2
  - Injected by the consumer through the `kyselyModules` object
- **Drizzle** - Modern TypeScript ORM (optional)
  - MySQL/MariaDB through mysql2
  - Injected by the consumer through the `drizzleModules` object
- **Objection JS** (via Knex) - For SQL databases (optional)
  - MySQL, MariaDB, PostgreSQL support
  - Complex relation mappings
  - Injected by the consumer through the `objectionModules` object
- **Mikro-ORM** - For MongoDB/NoSQL support (optional)
  - MongoDB native support
  - Entity metadata decorators
  - Injected by the consumer through the `mikroOrmModules` object
- **Prisma** - Modern database toolkit (optional)
  - Type-safe queries
  - Schema-first approach
  - Injected by the consumer through the `prismaModules` object

### Driver packages

The package only depends on `@reldens/utils`, `@reldens/server-utils`, `knex` and `mysql2`. Every other driver
expects its packages installed in the consumer project. Install the one you need:

```bash
# Kysely
npm install kysely

# Drizzle
npm install drizzle-orm

# Objection JS
npm install objection@3.1.5

# Mikro-ORM for MySQL/MariaDB
npm install @mikro-orm/core@7.2.0 @mikro-orm/mysql@7.2.0

# Mikro-ORM for MongoDB
npm install @mikro-orm/core@7.2.0 @mikro-orm/mongodb@7.2.0

# Prisma
npm install prisma @prisma/client @prisma/adapter-mariadb
```

Each data server accepts the driver classes through its `[driver]Modules` option, validated on `connect()`.
When the option is missing, the data server resolves the packages from the project `node_modules` through the
matching `*ModulesLoader` (`KyselyModulesLoader`, `DrizzleModulesLoader`, `ObjectionModulesLoader`,
`MikroOrmModulesLoader`), all exported by the package.

To try every driver at once without touching `package.json`, for example to run the full test suite:

```bash
npm install --no-save objection@3.1.5 @mikro-orm/core@7.2.0 @mikro-orm/mysql@7.2.0 @mikro-orm/mongodb@7.2.0 kysely drizzle-orm prisma@7.10.0 @prisma/client@7.10.0 @prisma/adapter-mariadb@7.10.0
RELDENS_TEST_OBJECTION_ENABLED=1 RELDENS_TEST_MIKRO_ORM_ENABLED=1 RELDENS_TEST_PRISMA_ENABLED=1 RELDENS_TEST_KYSELY_ENABLED=1 RELDENS_TEST_DRIZZLE_ENABLED=1 npm run test
```

Keep all the packages in that one command: any later `npm install`, with or without `--no-save`, prunes the
`--no-save` packages from a previous run. Without the flags `npm run test` only exercises the bundled knex driver.

The Knex, Kysely and Drizzle drivers share `QueryBuilderDriver` and load relations with one extra query per
relation level, using the `relationMappings` data emitted into the generated models. Relation filters become
`IN (SELECT ...)` sub queries, so counts are never inflated by joins.

### Entity Management
- Standardized CRUD operations across all drivers
- Automatic entity generation from database schemas
- Type mapping between database and JavaScript/Prisma types
- Foreign key relationship handling with smart naming
- ENUM field support with formatted values
- JSON field support with type casting
- Relation modifiers (orderBy, limit) for complex queries

### CLI Tools

**Generate entity files directly from your database structure:**
```bash
npx reldens-storage generateEntities --user=[dbuser] --pass=[dbpass] --database=[dbname] --driver=[knex]
```

**Entity Generation Options:**
- `--user=[username]` - Database username (required)
- `--pass=[password]` - Database password (required)
- `--database=[name]` - Database name (required)
- `--driver=[driver]` - ORM driver: knex, kysely, drizzle, objection-js, mikro-orm or prisma (default: knex). Only knex ships with the package, every other driver expects its packages installed in the project and passed as `[driver]Modules`, or resolved from the project `node_modules`.
- `--client=[client]` - Database client: mysql, mysql2, or mongodb (default: mysql2)
- `--host=[host]` - Database host (default: localhost)
- `--port=[port]` - Database port (default: 3306)
- `--path=[path]` - Project path for output files (default: current directory)
- `--prismaClientPath=[path]` - Prisma only: path to the generated Prisma client (default: `[path]/prisma/client`)
- `--prismaAdapter=[package-or-path]` - Prisma only: driver adapter package resolved from `[path]/node_modules`, or an absolute path (default: `@prisma/adapter-mariadb`)
- `--prismaAdapterClass=[export-name]` - Prisma only: adapter class exported by that package (default: `PrismaMariaDb`)
- `--override` - Regenerate all files even if they exist

**Smart Generation:**
- Only generates/updates entities that have changed
- Detects new tables, field changes, missing configurations
- Preserves custom code outside generated files
- Use `--override` to force complete regeneration

**Generate Prisma schema:**
```bash
npx reldens-storage-prisma --host=[host] --port=[port] --user=[dbuser] --password=[dbpass] --database=[dbname]
```

**Prisma Schema Generation Options:**
- `--host=[host]` - Database host (required)
- `--port=[port]` - Database port (required)
- `--user=[username]` - Database username (required)
- `--password=[password]` - Database password (required)
- `--database=[name]` - Database name (required)
- `--client=[client]` - Database client: mysql, postgresql (default: mysql)
- `--debug` - Enable debug mode
- `--dataProxy` - Enable Prisma data proxy
- `--checkInterval=[ms]` - Schema generation check interval (default: 1000)
- `--maxWaitTime=[ms]` - Maximum wait time for generation (default: 30000)
- `--prismaSchemaPath=[path]` - Path to Prisma schema directory (default: ./prisma)
- `--clientOutputPath=[path]` - Client output path (default: Prisma default)
- `--generateBinaryTargets=[targets]` - Comma-separated binary targets (default: native,debian-openssl-1.1.x)
- `--dbParams=[params]` - Database connection parameters (e.g., authPlugin=mysql_native_password)

**Prisma Workflow:**
1. Generate schema: `npx reldens-storage-prisma --host=... --database=...`
2. Schema file created at: `prisma/schema.prisma`
3. Prisma client generated automatically
4. Generate entities: `npx reldens-storage generateEntities --driver=prisma ...`

### Environment Variables

You can set database connection parameters using environment variables:

```bash
# Basic authentication plugin for AWS MySQL 8.0+
RELDENS_DB_PARAMS="authPlugin=mysql_native_password"

# SSL configuration for AWS RDS
RELDENS_DB_PARAMS="authPlugin=mysql_native_password&sslmode=require&sslcert=ca-cert.pem"

# Full SSL with client certificates
RELDENS_DB_PARAMS="authPlugin=mysql_native_password&sslmode=require&sslcert=ca-cert.pem&sslidentity=client.p12&sslpassword=certpass"
```

## Usage Examples

### SQL with Objection JS

Objection is not installed by this package, install it in your project first:
```bash
npm install objection@3.1.5
```

```javascript
const { ObjectionJsDataServer } = require('@reldens/storage');
const { Model } = require('objection');

let server = new ObjectionJsDataServer({
    client: 'mysql2',
    config: {
        user: 'reldens',
        password: 'reldens',
        database: 'reldens',
        host: 'localhost',
        port: 3306
    },
    rawEntities: yourEntities,
    objectionModules: {Model}
});

await server.connect();
let entities = server.generateEntities();
```

The `objectionModules` object only needs `Model`, the Objection base model class. The generated Objection models
read it from the package export `ObjectionJsRawModel`, which resolves `objection` from the project when it is
installed and is `false` otherwise.

### MongoDB with Mikro-ORM

Mikro-ORM is not installed by this package, install the core plus the driver for your database:
```bash
npm install @mikro-orm/core@7.2.0 @mikro-orm/mongodb@7.2.0
# or, for MySQL/MariaDB:
npm install @mikro-orm/core@7.2.0 @mikro-orm/mysql@7.2.0
```

```javascript
const { MikroOrmDataServer } = require('@reldens/storage');
const { MikroORM, EntityCaseNamingStrategy, Collection } = require('@mikro-orm/core');
const { MongoDriver } = require('@mikro-orm/mongodb');

let server = new MikroOrmDataServer({
    client: 'mongodb',
    config: {
        user: 'reldens',
        password: 'reldens',
        database: 'reldens',
        host: 'localhost',
        port: 27017
    },
    connectStringOptions: 'authSource=reldens&readPreference=primary&ssl=false',
    rawEntities: yourEntities,
    mikroOrmModules: {MikroORM, EntityCaseNamingStrategy, Collection, MongoDriver}
});

await server.connect();
let entities = server.generateEntities();
```

The `mikroOrmModules` object:
- `MikroORM`, `EntityCaseNamingStrategy`, `Collection`: from `@mikro-orm/core` (required)
- `MongoDriver`: from `@mikro-orm/mongodb`, required when `client` is `mongodb`
- `MySqlDriver`: from `@mikro-orm/mysql`, required for any other client

The generated Mikro-ORM models read `EntitySchema` from the package export `MikroOrmCore`, which resolves
`@mikro-orm/core` from the project when it is installed and is `false` otherwise.

### SQL with Knex

Knex is already a dependency of this package, nothing extra to install:

```javascript
const { KnexDataServer } = require('@reldens/storage');

let server = new KnexDataServer({
    client: 'mysql2',
    config: {
        user: 'reldens',
        password: 'reldens',
        database: 'reldens',
        host: 'localhost',
        port: 3306
    },
    rawEntities: yourEntities
});

await server.connect();
let entities = server.generateEntities();
```

### Using Kysely

Kysely is not installed by this package, install it in your project first:
```bash
npm install kysely
```

```javascript
const { KyselyDataServer } = require('@reldens/storage');
const { Kysely, MysqlDialect, sql } = require('kysely');

let server = new KyselyDataServer({
    config: {
        user: 'reldens',
        password: 'reldens',
        database: 'reldens',
        host: 'localhost',
        port: 3306
    },
    rawEntities: yourEntities,
    kyselyModules: {Kysely, MysqlDialect, sql}
});

await server.connect();
let entities = server.generateEntities();
```

The `kyselyModules` object:
- `sql`: the Kysely `sql` tag, used for the raw queries (required)
- `Kysely`: the Kysely class (required unless `db` is passed)
- `MysqlDialect`: the Kysely MySQL dialect (required unless `db` is passed)
- `db`: an already instantiated Kysely instance (optional, skips the instance construction)

Kysely is an ESM only package, so Node.js 22.12 or later is required to require it from CommonJS.

### Using Drizzle

Drizzle is not installed by this package, install it in your project first:
```bash
npm install drizzle-orm
```

```javascript
const { DrizzleDataServer } = require('@reldens/storage');
const { drizzle } = require('drizzle-orm/mysql2');
const DrizzleOrm = require('drizzle-orm');

let server = new DrizzleDataServer({
    config: {
        user: 'reldens',
        password: 'reldens',
        database: 'reldens',
        host: 'localhost',
        port: 3306
    },
    rawEntities: yourEntities,
    drizzleModules: {drizzle, orm: DrizzleOrm}
});

await server.connect();
let entities = server.generateEntities();
```

The `drizzleModules` object:
- `orm`: the `drizzle-orm` namespace, used for the conditions and the `sql` tag (required)
- `drizzle`: the factory exported by `drizzle-orm/mysql2` (required unless `db` is passed)
- `db`: an already instantiated Drizzle instance (optional, skips the instance construction)

Both objects are validated on `connect()`, the drivers refuse to start when a required class or method is missing.
The generated Drizzle models require `drizzle-orm/mysql-core` directly, so the package must be installed in the
project that loads them.

### Using Prisma

Prisma is not installed by this package. Install it in your project first:
```bash
npm install prisma @prisma/client @prisma/adapter-mariadb
```

Then generate your Prisma schema:
```bash
npx reldens-generate-prisma-schema --host=localhost --port=3306 --user=dbuser --password=dbpass --database=dbname
```

For AWS RDS with SSL:
```bash
# Set environment variable first
export RELDENS_DB_PARAMS="authPlugin=mysql_native_password&sslmode=require"

# Then generate schema
npx reldens-generate-prisma-schema --host=your-rds-host.amazonaws.com --port=3306 --user=dbuser --password=dbpass --database=dbname
```

Or pass parameters directly:
```bash
npx reldens-generate-prisma-schema --host=your-rds-host.amazonaws.com --port=3306 --user=dbuser --password=dbpass --database=dbname --dbParams="authPlugin=mysql_native_password&sslmode=require"
```

Then, pass your Prisma classes to the PrismaDataServer through the `prismaModules` object. Any Prisma driver
adapter works, `@prisma/adapter-mariadb` is only the example:
```javascript
const { PrismaDataServer } = require('@reldens/storage');
const { PrismaClient, Prisma } = require('./prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');

let server = new PrismaDataServer({
    client: 'mysql',
    config: {
        user: 'reldens',
        password: 'reldens',
        database: 'reldens',
        host: 'localhost',
        port: 3306
    },
    rawEntities: yourEntities,
    prismaModules: {PrismaClient, Prisma, PrismaAdapter: PrismaMariaDb}
});

await server.connect();
let entities = server.generateEntities();
```

The `prismaModules` object:
- `PrismaClient`: the class exported by your generated client (required unless `client` is passed)
- `Prisma`: the namespace exported by your generated client, used for `Prisma.DbNull` (required)
- `PrismaAdapter`: any Prisma driver adapter class, instantiated with the connection string (required unless `adapter` or `client` is passed)
- `adapter`: an already instantiated Prisma driver adapter, used as is (optional, replaces `PrismaAdapter`)
- `client`: an already instantiated Prisma client (optional, skips the client construction)

The object is validated on `connect()`, the driver refuses to start when a required class or method is missing.

Note: The PrismaDataServer requires the Prisma schema to be generated first. Make sure to run the `reldens-generate-prisma-schema` command before using PrismaDataServer.

### Loading Prisma Client Programmatically

If you need to load a Prisma Client instance in your CLI tools or applications:

Using the default connection from schema:
```javascript
const { PrismaClientLoader } = require('@reldens/storage');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const { Logger } = require('@reldens/utils');

let prismaModules = PrismaClientLoader.load(process.cwd(), null, null, {PrismaAdapter: PrismaMariaDb});
if(!prismaModules){
    Logger.error('Failed to load Prisma client');
    process.exit(1);
}
```

Using custom connection:
```javascript
const { PrismaClientLoader } = require('@reldens/storage');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const { Logger } = require('@reldens/utils');

let prismaModules = PrismaClientLoader.load(
    process.cwd(),
    null,
    {
        client: 'mysql',
        user: 'dbuser',
        password: 'dbpass',
        host: 'localhost',
        port: 3306,
        database: 'mydb'
    },
    {PrismaAdapter: PrismaMariaDb}
);

if(!prismaModules){
    Logger.error('Failed to load Prisma client');
    process.exit(1);
}
```

Parameters:
- `projectPath`: Project root directory
- `customPath`: Optional custom path to a Prisma client (null for default)
- `connectionData`: Optional database connection configuration object (null to use schema default)
- `prismaModules`: Object with the `PrismaAdapter` class (or an `adapter` instance)

Returns the completed `prismaModules` object (`PrismaClient`, `Prisma`, the adapter and the instantiated `client`), ready to be passed to `PrismaDataServer`, or null on error.

## Custom Drivers

You can create custom storage drivers by extending the base classes:

### Creating a Custom Driver

1. **Extend `BaseDataServer`** for connection management:
```javascript
const { BaseDataServer } = require('@reldens/storage');

class CustomDataServer extends BaseDataServer {
    async connect() {
        // Implement connection logic
    }

    async fetchEntitiesFromDatabase() {
        // Implement schema introspection
    }

    generateEntities() {
        // Generate entities from raw models
    }
}
```

2. **Extend `BaseDriver`** for query operations:
```javascript
const { BaseDriver } = require('@reldens/storage');

class CustomDriver extends BaseDriver {
    // Implement all required methods:
    // create(), update(), delete(), load(), loadById(), etc.
}
```

3. **Use your custom driver** in your application:
```javascript
const { ServerManager } = require('@reldens/server');
const CustomDataServer = require('./custom-data-server');

let customDriver = new CustomDataServer(options);
let appServer = new ServerManager(serverConfig, eventsManager, customDriver);
```

### Required Methods

All drivers must implement the methods defined in `BaseDriver`:
- **CRUD**: `create()`, `update()`, `delete()`, `upsert()`
- **Read**: `load()`, `loadById()`, `loadAll()`, `loadOne()`
- **Relations**: `loadWithRelations()`, `createWithRelations()`
- **Count**: `count()`, `countWithRelations()`
- **Helpers**: `tableName()`, `databaseName()`, `property()`

## Generated File Structure

When you run entity generation, all files are created in the **generated-entities/** directory:

**Entity Definitions:**
- entities/users-entity.js
- entities/players-entity.js

**ObjectionJS Models:**
- models/objection-js/users-model.js
- models/objection-js/players-model.js
- models/objection-js/registered-models-objection-js.js

**MikroORM Models:**
- models/mikro-orm/users-model.js
- models/mikro-orm/registered-models-mikro-orm.js

**Prisma Models:**
- models/prisma/users-model.js
- models/prisma/registered-models-prisma.js

**Configuration Files:**
- entities-config.js (entity relations)
- entities-translations.js (i18n keys)

### Entity Files
- **Entity classes**: Define properties, types, validations
- **Property metadata**: Type, required, reference, availableValues (for ENUMs)
- **Display properties**: Separate arrays for list, show, edit views

### Model Files
- **Driver-specific**: Each driver has its own model syntax
- **Relations**: Automatically generated based on foreign keys
- **Registered models**: Central registry for all models

### Relation Naming Pattern

All relations use the `related_*` prefix:
- **Single reference**: `related_users`, `related_players`
- **Multiple references**: `related_skills_skill`, `related_skills_owner`

Example usage:
```javascript
// Load user with related player
let user = await dataServer.getEntity('users')
    .loadByIdWithRelations(userId, ['related_player']);

// Access nested relations
let player = await dataServer.getEntity('players')
    .loadByIdWithRelations(playerId, ['related_state', 'related_scenes']);
```

## Architecture Overview

### Core Components

- **EntitiesGenerator**: Orchestrates entity generation
- **BaseDriver**: Abstract interface for database operations
- **BaseDataServer**: Connection and entity management
- **EntityManager**: Entity registry
- **TypeMapper**: Database type to JavaScript/Prisma type conversion

### Generators

- **EntitiesGeneration**: Creates entity definition files
- **ModelsGeneration**: Creates ORM-specific models
- **EntitiesConfigGeneration**: Creates configuration file
- **EntitiesTranslationsGeneration**: Creates translation keys

### Database Support

- **MySQL/MariaDB**: Via Knex (default), Kysely, Drizzle, ObjectionJS, MikroORM or Prisma
- **PostgreSQL**: Via Prisma
- **MongoDB**: Via MikroORM

## Links
- [Reldens Website](https://www.reldens.com/)
- [GitHub Repository](https://github.com/damian-pastorini/reldens/tree/master)

---

### [Reldens](https://www.reldens.com/ "Reldens")

##### [By DwDeveloper](https://www.dwdeveloper.com/ "DwDeveloper")
