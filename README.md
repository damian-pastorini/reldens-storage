[![Reldens - GitHub - Release](https://www.dwdeveloper.com/media/reldens/reldens-mmorpg-platform.png)](https://www.reldens.com/)

# Reldens - Storage

## About this package
This package provides standardized database drivers for Reldens projects.
It ensures consistent data access methods across different database types and ORM implementations.

## Features

### ORM Support
- **Objection JS** (via Knex) - For SQL databases (recommended)
- **Mikro-ORM** - For MongoDB/NoSQL support
- **Prisma** - Modern database toolkit

### Entity Management
- Standardized CRUD operations
- Automatic entity generation from database schemas
- Type mapping between database and JavaScript
- Foreign key relationship handling
- ENUM field support with formatted values

### CLI Tools
Generate entity files directly from your database structure:
```bash
npx reldens-storage generateEntities --user=dbuser --pass=dbpass --database=dbname --driver=objection-js
```

Options:
- `--user` - Database username
- `--pass` - Database password
- `--host` - Database host (default: localhost)
- `--port` - Database port (default: 3306)
- `--database` - Database name
- `--driver` - ORM driver (objection-js|mikro-orm)
- `--client` - Database client (mysql|mysql2|mongodb)
- `--path` - Project path for output files

Generate Prisma schema for Prisma database:
```bash
npx reldens-storage-prisma --user=dbuser --pass=dbpass --database=dbname
```

Options:
- `--user` - Database username
- `--pass` - Database password
- `--host` - Database host (default: localhost)
- `--port` - Database port (default: 3306)
- `--database` - Database name
- `--client` - Database client (mysql|mysql2|postgresql|mongodb)
- `--path` - Project path for output files

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
npx reldens-storage-prisma --user=dbuser --pass=dbpass --database=dbname
```

Then, use the PrismaDataServer in your code:
```javascript
const { PrismaDataServer } = require('@reldens/storage');

const server = new PrismaDataServer({
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
const entities = server.generateEntities();
```

Note: The PrismaDataServer requires the Prisma schema to be generated first. Make sure to run the `reldens-storage-prisma` command before using PrismaDataServer.

## Custom Drivers

You can create custom storage drivers by extending the base classes:

1. Extend `BaseDataServer` and `BaseDriver`
2. Implement all required methods
3. Pass your custom server instance to Reldens ServerManager:

```javascript
const { ServerManager } = require('@reldens/server');
const YourCustomDriver = require('./your-custom-driver');

const customDriver = new YourCustomDriver(options);
const appServer = new ServerManager(serverConfig, eventsManager, customDriver);
```

## Links
- [Reldens Website](https://www.reldens.com/)
- [GitHub Repository](https://github.com/damian-pastorini/reldens/tree/master)

---

### [Reldens](https://www.reldens.com/ "Reldens")

##### [By DwDeveloper](https://www.dwdeveloper.com/ "DwDeveloper")
