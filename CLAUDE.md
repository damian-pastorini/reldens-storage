# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- Key methods (all must be implemented by drivers):
  - CRUD: `create()`, `update()`, `delete()`, `upsert()`
  - Read: `load()`, `loadById()`, `loadAll()`, `loadOne()`
  - Relations: `loadWithRelations()`, `createWithRelations()`
  - Count: `count()`, `countWithRelations()`
  - Query: `rawQuery()`, `executeCustomQuery()`
  - Helpers: `parseRelationsString()`, `isJsonField()`

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
  - Filter operators: OR, IN, NOT, LIKE
  - Methods: `appendFilters()`, `appendRelationsToQuery()`

**MikroORM Driver** (`lib/mikro-orm/`):
- `mikro-orm-driver.js`: Driver implementation
- `mikro-orm-data-server.js`: Data server for MongoDB/SQL
- Features:
  - MongoDB support
  - Entity metadata decorators
  - Automatic schema synchronization

**Prisma Driver** (`lib/prisma/`):
- `prisma-driver.js`: Driver implementation
- `prisma-data-server.js`: Data server using Prisma Client
- `prisma-schema-generator.js`: Schema generation and introspection
- Features:
  - Schema-first approach
  - Type-safe queries
  - Introspection via `prisma db pull`
  - Binary targets configuration
  - Data proxy support
  - Windows permission error handling

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

```
generated-entities/
├── entities/
│   ├── [table-name]-entity.js      # Entity definitions
│   └── ...
├── models/
│   ├── objection-js/
│   │   ├── [table-name]-model.js
│   │   └── registered-models-objection-js.js
│   ├── mikro-orm/
│   │   ├── [table-name]-model.js
│   │   └── registered-models-mikro-orm.js
│   └── prisma/
│       ├── [table-name]-model.js
│       └── registered-models-prisma.js
├── entities-config.js               # Entity relation configuration
└── entities-translations.js         # Translation keys
```

## Relation Keys Pattern

All generated entity relations follow the `related_*` prefix pattern:

- **Single reference**: `related_[table_name]`
  - Example: `related_players`, `related_users`
- **Multiple references to same table**: `related_[table_name]_[column_suffix]`
  - Example: `related_skills_skill`, `related_skills_owner`
  - The `_id` suffix is removed from column name when multiple references exist

This pattern is consistent across all ORM drivers and is defined in `entities-config.js`.

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
