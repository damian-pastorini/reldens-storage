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
npx reldens-storage generateEntities --user=[dbuser] --pass=[dbpass] --database=[dbname] --driver=[objection-js]
```

Options:
- `--user=[username]` - Database username
- `--pass=[password]` - Database password
- `--host=[host]` - Database host (default: localhost)
- `--port=[port]` - Database port (default: 3306)
- `--database=[name]` - Database name
- `--driver=[driver]` - ORM driver (objection-js|mikro-orm|prisma)
- `--client=[client]` - Database client (mysql|mysql2|mongodb)
- `--path=[path]` - Project path for output files
- `--override` - Regenerate all files even if they exist

Generate Prisma schema:
```bash
npx reldens-generate-prisma-schema --host=[host] --port=[port] --user=[dbuser] --password=[dbpass] --database=[dbname]
```

Options:
- `--host=[host]` - Database host (required)
- `--port=[port]` - Database port (required)
- `--user=[username]` - Database username (required)
- `--password=[password]` - Database password (required)
- `--database=[name]` - Database name (required)
- `--client=[client]` - Database client (default: mysql)
- `--debug` - Enable debug mode
- `--dataProxy` - Enable data proxy
- `--checkInterval=[ms]` - Check interval in milliseconds (default: 1000)
- `--maxWaitTime=[ms]` - Max wait time in milliseconds (default: 30000)
- `--prismaSchemaPath=[path]` - Path to Prisma schema directory
- `--clientOutputPath=[path]` - Client output path (if not set, uses Prisma default)
- `--generateBinaryTargets=[targets]` - Comma-separated binary targets (default: native,debian-openssl-1.1.x)
- `--dbParams=[params]` - Database connection parameters (e.g., authPlugin=mysql_native_password)

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
