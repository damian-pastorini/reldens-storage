[![Reldens - GitHub - Release](https://www.dwdeveloper.com/media/reldens/reldens-mmorpg-platform.png)](https://www.reldens.com/)

# Reldens - Storage

## About this package
This package provides standardized database drivers for Reldens projects.
It ensures consistent data access methods across different database types and ORM implementations.

## Features

### ORM Support
- **Objection JS** (via Knex) - For SQL databases (recommended)
  - MySQL, MariaDB, PostgreSQL support
  - Complex relation mappings
  - Query builder with filtering and sorting
- **Mikro-ORM** - For MongoDB/NoSQL support
  - MongoDB native support
  - Entity metadata decorators
  - Automatic schema synchronization
- **Prisma** - Modern database toolkit
  - Type-safe queries
  - Schema-first approach
  - Introspection and migration tools

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
npx reldens-storage generateEntities --user=[dbuser] --pass=[dbpass] --database=[dbname] --driver=[objection-js]
```

**Entity Generation Options:**
- `--user=[username]` - Database username (required)
- `--pass=[password]` - Database password (required)
- `--database=[name]` - Database name (required)
- `--driver=[driver]` - ORM driver: objection-js, mikro-orm, or prisma (default: objection-js)
- `--client=[client]` - Database client: mysql, mysql2, or mongodb (default: mysql2)
- `--host=[host]` - Database host (default: localhost)
- `--port=[port]` - Database port (default: 3306)
- `--path=[path]` - Project path for output files (default: current directory)
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
```javascript
const { ObjectionJsDataServer } = require('@reldens/storage');

const server = new ObjectionJsDataServer({
    client: 'mysql2',
    config: {
        user: 'reldens',
        password: 'reldens',
        database: 'reldens',
        host: 'localhost',
        port: 3306
    }
});

await server.connect();
const entities = server.generateEntities();
```

### MongoDB with Mikro-ORM
```javascript
const { MikroOrmDataServer } = require('@reldens/storage');

const server = new MikroOrmDataServer({
    client: 'mongodb',
    config: {
        user: 'reldens',
        password: 'reldens',
        database: 'reldens',
        host: 'localhost',
        port: 27017
    },
    connectStringOptions: 'authSource=reldens&readPreference=primary&ssl=false',
    rawEntities: yourEntities
});

await server.connect();
const entities = server.generateEntities();
```

### Using Prisma

First, generate your Prisma schema:
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

Then, use the PrismaDataServer in your code:
```javascript
const { PrismaDataServer } = require('@reldens/storage');

const server = new PrismaDataServer({
    client: 'mysql',
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
const entities = server.generateEntities();
```

Note: The PrismaDataServer requires the Prisma schema to be generated first. Make sure to run the `reldens-generate-prisma-schema` command before using PrismaDataServer.

### Loading Prisma Client Programmatically

If you need to load a Prisma Client instance in your CLI tools or applications:

Using the default connection from schema:
```javascript
const { PrismaClientLoader } = require('@reldens/storage');

const prismaClient = PrismaClientLoader.load(process.cwd(), null, null);
if(!prismaClient){
    console.error('Failed to load Prisma client');
    process.exit(1);
}
```

Using custom connection:
```javascript
const { PrismaClientLoader } = require('@reldens/storage');

const prismaClient = PrismaClientLoader.load(
    process.cwd(),
    null,
    {
        client: 'mysql',
        user: 'dbuser',
        password: 'dbpass',
        host: 'localhost',
        port: 3306,
        database: 'mydb'
    }
);

if(!prismaClient){
    console.error('Failed to load Prisma client');
    process.exit(1);
}
```

Parameters:
- `projectPath`: Project root directory
- `customPath`: Optional custom path to a Prisma client (null for default)
- `connectionData`: Optional database connection configuration object (null to use schema default)

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

const customDriver = new CustomDataServer(options);
const appServer = new ServerManager(serverConfig, eventsManager, customDriver);
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
const user = await dataServer.getEntity('users')
    .loadByIdWithRelations(userId, ['related_player']);

// Access nested relations
const player = await dataServer.getEntity('players')
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

- **MySQL/MariaDB**: Via ObjectionJS or Prisma
- **PostgreSQL**: Via Prisma
- **MongoDB**: Via MikroORM

## Links
- [Reldens Website](https://www.reldens.com/)
- [GitHub Repository](https://github.com/damian-pastorini/reldens/tree/master)

---

### [Reldens](https://www.reldens.com/ "Reldens")

##### [By DwDeveloper](https://www.dwdeveloper.com/ "DwDeveloper")
