# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ CRITICAL: The Library Works - Fix The Tests

**This package is battle-tested in hundreds of production projects handling thousands of API calls successfully.**

**Default Assumption: Tests are failing because TEST CODE is incorrect, NOT because library code is broken.**

**Your Primary Task:**
- Fix test files in `tests/` directory to properly use the library
- Study working examples from reldens-cms and reldens main project
- Make all tests pass by correcting how they call the library APIs

**If You Suspect a Library Bug:**
- Present complete proof with production evidence
- Wait for user confirmation before proposing any library changes
- Do NOT modify `lib/` code without explicit approval

---

## Package Overview

**@reldens/storage** is the database abstraction layer for Reldens. It provides:
- Multi-ORM support (objection-js, mikro-orm, prisma)
- Entity/model generation from database schemas
- Unified API across different ORM drivers
- Database connection management
- Schema introspection and code generation
- Type mapping between database and JavaScript types

## Key Commands

```bash
# Generate entities from database
npx reldens-storage generateEntities --user=<user> --pass=<pass> --host=<host> --database=<db> --driver=<driver> --client=<client>

# Generate entities with override (overwrites existing entities)
npx reldens-storage generateEntities --user=<user> --pass=<pass> --database=<db> --driver=<driver> --override

# Generate Prisma schema
npx reldens-storage-prisma --host=<host> --port=<port> --database=<db> --user=<user> --password=<pass>

# Generate Prisma schema with database parameters
npx reldens-storage-prisma --host=<host> --database=<db> --user=<user> --password=<pass> --dbParams="authPlugin=mysql_native_password"

# Alternative: Use environment variable for database parameters
export RELDENS_DB_PARAMS="authPlugin=mysql_native_password&sslmode=require"
npx reldens-storage-prisma --host=<host> --database=<db> --user=<user> --password=<pass>
```

## Architecture

### Core Classes

**EntitiesGenerator** (`lib/entities-generator.js`):
- Main orchestrator for entity generation
- Coordinates all generation steps
- Detects existing entities and models
- Determines what needs to be generated or updated
- Key methods:
  - `generate()`: Main entry point for generation
  - `detectExistingEntities()`: Scans for existing entity files
  - `detectExistingModels()`: Scans for existing model files
  - `filterTablesToGenerate()`: Determines what needs generation
  - `entityNeedsUpdate()`: Checks if entity fields changed
  - `extractPrismaRelationsMetadata()`: Extracts Prisma relation info

**BaseDriver** (`lib/base-driver.js`):
- Abstract base class for ORM drivers
- Provides common interface for all database operations
- Stores operator mapping for all drivers (`this.operatorsMap`)
- Key methods (all must be implemented by drivers):
  - CRUD: `create()`, `update()`, `delete()`, `upsert()`
  - Read: `load()`, `loadById()`, `loadAll()`, `loadOne()`
  - Relations: `loadWithRelations()`, `createWithRelations()`
  - Count: `count()`, `countWithRelations()`
  - Query: `rawQuery()`, `executeCustomQuery()`
  - Helpers: `parseRelationsString()`, `isJsonField()`
- **Operator Mapping**: Maps string operators to SQL operators
  - `GT` → `>`, `GTE` → `>=`, `LT` → `<`, `LTE` → `<=`, `NE` → `!=`, `EQ` → `=`
  - Available to all drivers via `this.operatorsMap`

**BaseDataServer** (`lib/base-data-server.js`):
- Abstract base class for data servers
- Manages database connection and entity management
- Uses EntityManager for entity registry
- Key methods:
  - `connect()`: Establishes database connection
  - `generateEntities()`: Generates entities from raw models
  - `fetchEntitiesFromDatabase()`: Introspects database schema
  - `getEntity()`: Retrieves entity by name
  - `createConnectionString()`: Builds connection string

**EntityManager** (`lib/entity-manager.js`):
- Registry for managing entities
- Simple key-value store for entity instances
- Methods: `get()`, `add()`, `remove()`, `clear()`, `setEntities()`

**TypeMapper** (`lib/type-mapper.js`):
- Maps database types to JavaScript and Prisma types
- Handles MySQL types: int, varchar, text, json, datetime, enum, blob, etc.
- Methods:
  - `mapDbTypeToJsType()`: Returns JS type (number, string, Date, object, Buffer, boolean)
  - `mapDbTypeToPrismaType()`: Returns Prisma type (Int, String, DateTime, Json, Bytes, Boolean)

### Driver Implementations

**ObjectionJS Driver** (`lib/objection-js/`):
- `objection-js-driver.js`: Query builder using Objection.js API
- `objection-js-data-server.js`: Data server using Knex for connection
- Features:
  - Complex relation support via `relationMappings`
  - Uses `withGraphFetched()` for eager loading
  - Supports relation modifiers (orderBy, limit)
  - JSON field handling with `castText()` for LIKE queries
  - **Filter operators** (case-insensitive): OR, IN, NOT, LIKE, GT, GTE, LT, LTE, NE, EQ
  - **Operator conversion**: String operators converted to uppercase before processing
  - **Nested filtering**: AND/OR operators support nested conditions with proper SQL grouping
  - Methods: `appendFilters()`, `appendRelationsToQuery()`
  - **Upsert behavior**: Check if record exists → update if found, create if not

**MikroORM Driver** (`lib/mikro-orm/`):
- `mikro-orm-driver.js`: Driver implementation
- `mikro-orm-data-server.js`: Data server for MongoDB/SQL
- Features:
  - MongoDB support
  - Entity metadata decorators
  - Automatic schema synchronization

**Prisma Driver** (`lib/prisma/`):
- `prisma-driver.js`: Driver implementation with enhanced validation
- `prisma-data-server.js`: Data server using Prisma Client
- `prisma-schema-generator.js`: Schema generation and introspection
- `prisma-metadata-loader.js`: Loads field metadata including defaults
- `prisma-type-caster.js`: Type casting and normalization
- `prisma-relation-resolver.js`: Relation mapping and transformations
- `prisma-client-loader.js`: Utility for loading Prisma Client instances
- Features:
  - Schema-first approach with auto-introspection
  - Type-safe queries with Prisma Client
  - Custom `ensureRequiredFields()` validation for better error messages
  - Database default value support (skips validation for fields with defaults)
  - VARCHAR foreign key support using relation connect syntax
  - Introspection via `prisma db pull`
  - Binary targets configuration
  - Data proxy support
  - Windows permission error handling
  - **Prisma.DbNull handling**: PrismaDataServer passes `Prisma.DbNull` to driver, which passes it to type caster
  - **Type caster isolation**: PrismaTypeCaster never requires `@prisma/client` directly, receives `prismaDbNull` as prop

### Generators

**EntitiesGeneration** (`lib/generators/entities-generation.js`):
- Generates entity definition files
- Determines title property (label, title, name, key)
- Detects primary keys and auto-increment fields
- Handles ENUM values with formatted labels
- Generates property configurations with types
- Creates list/show/edit property arrays
- Methods:
  - `generateEntityFile()`: Creates entity file
  - `generatePropertiesConfig()`: Builds properties object
  - `determineTitleProperty()`: Finds display field
  - `getPropertyAttributes()`: Builds property metadata
  - `parseEnumValues()`: Extracts ENUM options

**ModelsGeneration** (`lib/generators/models-generation.js`):
- Generates ORM-specific model files
- Creates relation mappings for ObjectionJS
- Generates relation types for Prisma
- Handles forward and reverse relations
- Creates registered models file
- Relation key naming:
  - Single reference: `related_[table]`
  - Multiple references: `related_[table]_[column_suffix]`
- Methods:
  - `generateModelFile()`: Creates model file
  - `generateObjectionJsRelations()`: Builds relationMappings
  - `generatePrismaRelations()`: Builds relationTypes
  - `detectObjectionJsRelations()`: Finds forward relations
  - `detectReverseObjectionJsRelations()`: Finds reverse relations
  - `generateRegisteredModelsFile()`: Creates model registry
  - `countReferencesPerTable()`: Determines relation naming

**EntitiesConfigGeneration** (`lib/generators/entities-config-generation.js`):
- Generates `entities-config.js` file
- Contains entity-to-entity relation mappings
- Used by entity loader to resolve relations

**EntitiesTranslationsGeneration** (`lib/generators/entities-translations-generation.js`):
- Generates `entities-translations.js` file
- Creates i18n translation keys for entities

**BaseGenerator** (`lib/generators/base-generator.js`):
- Base class for all generators
- Provides `applyReplacements()` method for template processing

### Database Introspection

**MySQLTablesProvider** (`lib/mysql-tables-provider.js`):
- Queries `information_schema` for table structure
- Fetches columns with types, constraints, defaults
- Retrieves foreign key relationships
- Returns structured table data with:
  - Table name
  - Columns with type, length, nullable, key, extra, default
  - Referenced tables and columns for foreign keys
- Used by ObjectionJS and Prisma drivers

### Entity Templates

Located in `lib/entity-templates/`:
- `entity.template`: Base entity class template
- `objection-js-model.template`: ObjectionJS model template
- `mikro-orm-model.template`: MikroORM model template
- `prisma-model.template`: Prisma model template
- `entities-config.template`: Entities configuration template
- `entities-translations.template`: Translations template
- `registered-models.template`: Model registry template

Templates use placeholder replacement with `{{placeholderName}}` syntax.

## Workflow

1. **Database Connection**: Connect to database using appropriate driver
2. **Schema Introspection**: Read database schema (tables, columns, foreign keys)
3. **Entity Detection**: Scan for existing entities and models
4. **Change Detection**: Compare database schema with existing entities
5. **Entity Generation**:
   - Generate entity files with property definitions
   - Generate model files with ORM-specific code
   - Generate relation mappings
6. **Configuration**:
   - Update `entities-config.js` with new/updated entities
   - Update `entities-translations.js` with translation keys
   - Generate `registered-models-[driver].js` with model imports
7. **File Output**: Write all files to `generated-entities/` directory

## Generated File Structure

All generated files are created in the **generated-entities/** directory:

**Entity Definitions:**
- entities/[table-name]-entity.js

**Driver Models:**
- models/objection-js/[table-name]-model.js
- models/objection-js/registered-models-objection-js.js
- models/mikro-orm/[table-name]-model.js
- models/mikro-orm/registered-models-mikro-orm.js
- models/prisma/[table-name]-model.js
- models/prisma/registered-models-prisma.js

**Configuration Files:**
- entities-config.js (entity relation configuration)
- entities-translations.js (translation keys)

## Relation Keys Pattern

All generated entity relations follow the `related_*` prefix pattern:

- **Single reference**: `related_[table_name]`
  - Example: `related_players`, `related_users`
- **Multiple references to same table**: `related_[table_name]_[column_suffix]`
  - Example: `related_skills_skill`, `related_skills_owner`
  - The `_id` suffix is removed from column name when multiple references exist

This pattern is consistent across all ORM drivers and is defined in `entities-config.js`.

## Prisma Driver Validation System

### ensureRequiredFields() Method

The Prisma driver includes custom validation that differs from ObjectionJS and provides better error messages:

**Location:** `lib/prisma/prisma-driver.js` lines 201-223

**Purpose:** Validates that all required fields are present before sending data to Prisma Client

**Key Behavior:**
```javascript
ensureRequiredFields(data) {
    let missingFields = [];
    for(let field of this.requiredFields){
        if(sc.hasOwn(data, field)){
            continue;  // Field is present
        }
        if(sc.hasOwn(this.foreignKeyMappings, field)){
            let relationName = this.foreignKeyMappings[field];
            if(sc.hasOwn(data, relationName)){
                continue;  // FK mapped to relation (connect syntax)
            }
        }
        if(sc.hasOwn(this.fieldDefaults, field)){
            continue;  // Field has database default - skip validation
        }
        missingFields.push(field);
    }
    if(0 < missingFields.length){
        Logger.warning('Missing required fields for '+this.tableName()+': '+missingFields.join(', '));
    }
    return data;
}
```

**Important:** This validation runs BEFORE Prisma Client, allowing it to:
1. Provide clear error messages about missing fields
2. Allow database defaults to work (doesn't validate fields with defaults)
3. Support foreign key relation syntax (checks both FK field and relation)

### Database Default Values

**How It Works:**
- Metadata loader extracts default values from Prisma schema (`@default()` directive)
- Stored in `this.fieldDefaults` map during driver initialization
- Validation skips required fields that have defaults
- Prisma/database applies default when field is missing

**Example:**
```javascript
// Prisma schema
model scores_detail {
  kill_time  DateTime @default(now()) @db.DateTime(0)
}

// Admin panel sends data without kill_time
{
  player_id: 1001,
  obtained_score: 150
  // kill_time missing but has default
}

// Validation skips kill_time (has default)
// Prisma creates record, database applies DEFAULT CURRENT_TIMESTAMP
```

### Comparison with ObjectionJS

**ObjectionJS Driver:**
```javascript
create(params) {
    return this.queryBuilder().insert(params);
}
```
- No validation
- Passes data directly to Knex
- Database handles missing fields and defaults
- Less informative error messages

**Prisma Driver:**
```javascript
async create(params) {
    let preparedData = this.prepareDataWithRelations(params, true);
    this.ensureRequiredFields(preparedData);  // Custom validation
    try {
        return this.typeCaster.normalizeReturnData(await this.model.create({data: preparedData}));
```
- Custom validation before Prisma
- Better error messages
- Supports database defaults
- Type-safe queries

**Key Difference:** Prisma validates first, so it must be aware of database defaults to allow them to work.

### Foreign Key Handling

Both drivers handle foreign keys, but with different syntax:

**ObjectionJS:**
```javascript
// Direct FK field
{player_id: 1001}
```

**Prisma:**
```javascript
// Relation connect syntax
{players: {connect: {id: 1001}}}

// Also supports VARCHAR FKs
{related_table: {connect: {custom_id: "ABC123"}}}
```

The `prepareDataWithRelations()` method (lines 156-199) automatically converts FK fields to relation syntax.

## Important Notes

### Entity Management
- **DO NOT modify** generated entities directly (files in `generated-entities/`)
- Extend generated entities in custom model files if customization needed
- Custom models should be placed in project-specific directories
- Entity configuration (`entities-config.js`) defines relation keys used throughout codebase
- Relation keys are critical - changing them affects all code referencing relations

### Generation Behavior
- Generation is smart: only creates/updates entities that changed
- Detects new tables, field changes, missing configs, missing models
- Use `--override` flag to force regeneration of all files
- Override flag useful after major schema changes or driver switches
- Each driver has its own model structure and relation syntax

### Schema Changes
- Always regenerate entities after database schema changes
- Adding columns: entities auto-update with new fields
- Removing columns: entities auto-update, remove fields
- Changing relations: models regenerate with new relation mappings
- ENUM changes: entity updates with new available values

### Driver-Specific Notes
- **ObjectionJS**: Recommended driver, mature and stable
- **MikroORM**: Use for MongoDB or NoSQL requirements
- **Prisma**: Requires schema generation first, then entity generation
- Cannot mix drivers - regenerate all when switching drivers
- Each driver has different relation syntax in generated models

### Binary Executables
- `bin/reldens-storage.js`: Main CLI for entity generation
- `bin/generate-prisma-schema.js`: Prisma schema generator CLI
- Both are available via npx after package installation

### Environment Variables
- `RELDENS_DB_PARAMS`: Database connection parameters (used by Prisma)
- Format: `key1=value1&key2=value2`
- Example: `authPlugin=mysql_native_password&sslmode=require`

## PrismaClientLoader Utility

**Location:** `lib/prisma/prisma-client-loader.js`

**Purpose:** Shared utility for loading Prisma Client instances in CLI tools and applications.

**Exported From Package:** Yes, available via `const { PrismaClientLoader } = require('@reldens/storage');`

**Method:**
```javascript
PrismaClientLoader.load(projectPath, customPath, connectionData)
```

**Parameters:**
- `projectPath` (string): Project root directory path
- `customPath` (string|null): Optional custom path to a Prisma client (overrides default)
- `connectionData` (object|null): Optional database connection configuration with properties:
  - `client` (string): Database client type (mysql, postgresql, etc.)
  - `user` (string): Database username
  - `password` (string): Database password
  - `host` (string): Database host
  - `port` (number): Database port
  - `database` (string): Database name

**Returns:** PrismaClient instance or null on error

**Behavior:**
- If `customPath` is provided, uses that path
- Otherwise, uses a default path: `projectPath/prisma/client`
- Validates that Prisma Client exists at the path
- Requires `prismaModule.PrismaClient` export
- If `connectionData` is null: Uses default connection from Prisma schema datasource
- If `connectionData` is provided: Builds custom connection string and overrides datasource
- Returns initialized PrismaClient instance

**Usage Examples:**

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

**Used By:**
- `bin/reldens-storage.js`: CLI entity generator
- External packages: `@reldens/cms` CLI tools (update-password, generate-entities, generate-sitemap)

## Test Suite Architecture

**CRITICAL:** For detailed test suite architecture, execution flow, and lifecycle hooks, see: `.claude/test-architecture.md`

### The Golden Rule: Connect Once, Test Many

**DO NOT** create database connections, tables, or entities in `beforeEach()` hooks. These operations happen **ONCE per driver** in `before()` hooks.

**Correct test lifecycle:**
1. `before()` hook - RUNS ONCE per driver:
   - Connect to database
   - Create tables via SQL
   - Generate entities (introspects database, creates models)
   - For Prisma: Generate schema → Generate client → Reconnect
   - Get repository references

2. `beforeEach()` hook - RUNS BEFORE EACH TEST:
   - DELETE data from tables (fast cleanup)
   - Never drop/recreate tables
   - Never reconnect to database

3. `after()` hook - RUNS ONCE per driver:
   - DROP all tables
   - Disconnect from database

### Test Database Operations

- **cleanDatabase()**: Uses DELETE statements to clear data between tests (fast)
- **dropTestTables()**: Uses DROP TABLE statements for final cleanup (slow, runs once)
- **executeRawSQL()**: Creates tables from SQL schema file (slow, runs once)

### DataServer Flow

All three drivers follow this pattern:

```
1. new DataServer({config, rawEntities})
   ↓
2. await dataServer.connect()
   ↓
3. await executeRawSQL(dataServer, schemaSql)  ← Tables must exist before next step
   ↓
4. await generateTestEntities(dataServer, driverName)
   ├─ Introspects database schema
   ├─ Creates models from tables
   ├─ [Prisma only]: Generate schema + client + reconnect
   └─ Calls dataServer.generateEntities()
   ↓
5. dataServer.getEntity('entityName')  ← Returns repository
```

### Why Tables Must Exist Before Entity Generation

- `generateTestEntities()` calls `fetchEntitiesFromDatabase()`
- This queries MySQL `information_schema` for actual table structures
- Without tables, introspection returns empty/null
- Entity generation fails without table metadata

### Prisma Special Handling

Prisma requires additional subprocess steps during entity generation:

1. Generate `schema.prisma` file from database (subprocess: `npx reldens-storage-prisma`)
2. Generate PrismaClient code (subprocess: `npx prisma generate`)
3. Disconnect old client
4. Clear Node.js module cache
5. Reconnect with newly generated client
6. Now PrismaClient has models for the current database schema

This happens ONCE during the `before()` hook inside `generateTestEntities()`.

**For critical patterns including:**
- Why tests use dynamic models (not generated models)
- Prisma client loading pattern
- Common pitfalls and solutions

**See:** `.claude/test-architecture.md` - Critical Patterns section

### Test Files

**Integration tests:**
- `tests/integration/test-cross-driver-compatibility.js`: Full CRUD cycle for all 3 drivers
- `tests/integration/test-nested-filters.js`: Complex filter syntax (AND/OR/NOT/IN/LIKE)
- `tests/integration/test-relations.js`: Relation loading and nested relations

**Test helpers:**
- `tests/utils/test-helpers.js`: Database setup, entity generation, cleanup utilities

**All integration test files use the correct lifecycle pattern as of 2026-01-18.**

For complete details on test architecture, common issues, performance comparison, and troubleshooting, see `.claude/test-architecture.md`.
