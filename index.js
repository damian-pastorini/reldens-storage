/**
 *
 * Reldens - Storage
 *
 */

const { BaseDataServer } = require('./lib/base-data-server');
const { BaseDriver } = require('./lib/base-driver');
const { ObjectionJsDriver } = require('./lib/objection-js/objection-js-driver');
const { ObjectionJsDataServer } = require('./lib/objection-js/objection-js-data-server');
const { ObjectionModulesValidator } = require('./lib/objection-js/objection-modules-validator');
const { ObjectionModulesLoader } = require('./lib/objection-js/objection-modules-loader');
const { MikroOrmDriver } = require('./lib/mikro-orm/mikro-orm-driver');
const { MikroOrmDataServer } = require('./lib/mikro-orm/mikro-orm-data-server');
const { MikroOrmModulesValidator } = require('./lib/mikro-orm/mikro-orm-modules-validator');
const { MikroOrmModulesLoader } = require('./lib/mikro-orm/mikro-orm-modules-loader');
const { PackageResolver } = require('./lib/package-resolver');
const { EntitiesGenerator } = require('./lib/entities-generator');
const { EntityProperties } = require('./lib/entity-properties');
const { TypeMapper } = require('./lib/type-mapper');
const { MySQLTablesProvider } = require('./lib/mysql-tables-provider');
const { PrismaDriver } = require('./lib/prisma/prisma-driver');
const { PrismaDataServer } = require('./lib/prisma/prisma-data-server');
const { PrismaSchemaGenerator } = require('./lib/prisma/prisma-schema-generator');
const { PrismaClientLoader } = require('./lib/prisma/prisma-client-loader');
const { PrismaModulesValidator } = require('./lib/prisma/prisma-modules-validator');
const { QueryBuilderDriver } = require('./lib/query-builder-driver');
const { RelationsLoader } = require('./lib/relations-loader');
const { Mysql2ConnectionConfig } = require('./lib/mysql2-connection-config');
const { KnexDriver } = require('./lib/knex/knex-driver');
const { KnexDataServer } = require('./lib/knex/knex-data-server');
const { KnexModulesValidator } = require('./lib/knex/knex-modules-validator');
const { KnexModulesLoader } = require('./lib/knex/knex-modules-loader');
const { KyselyDriver } = require('./lib/kysely/kysely-driver');
const { KyselyDataServer } = require('./lib/kysely/kysely-data-server');
const { KyselyModulesValidator } = require('./lib/kysely/kysely-modules-validator');
const { KyselyModulesLoader } = require('./lib/kysely/kysely-modules-loader');
const { DrizzleDriver } = require('./lib/drizzle/drizzle-driver');
const { DrizzleDataServer } = require('./lib/drizzle/drizzle-data-server');
const { DrizzleModulesValidator } = require('./lib/drizzle/drizzle-modules-validator');
const { DrizzleModulesLoader } = require('./lib/drizzle/drizzle-modules-loader');
const { RELATION_PREFIX } = require('./lib/relation-key');

let objectionPackage = PackageResolver.optionalPackage('objection');
let mikroOrmCorePackage = PackageResolver.optionalPackage('@mikro-orm/core');

module.exports = {
    BaseDataServer,
    BaseDriver,
    DriversMap: {
        'objection-js': ObjectionJsDataServer,
        'mikro-orm': MikroOrmDataServer,
        'prisma': PrismaDataServer,
        'knex': KnexDataServer,
        'kysely': KyselyDataServer,
        'drizzle': DrizzleDataServer
    },
    DriversClassMap: {
        'ObjectionJsDataServer': 'objection-js',
        'MikroOrmDataServer': 'mikro-orm',
        'PrismaDataServer': 'prisma',
        'KnexDataServer': 'knex',
        'KyselyDataServer': 'kysely',
        'DrizzleDataServer': 'drizzle'
    },
    QueryBuilderDriver,
    RelationsLoader,
    Mysql2ConnectionConfig,
    KnexDataServer,
    KnexDriver,
    KyselyDataServer,
    KyselyDriver,
    KyselyModulesValidator,
    KyselyModulesLoader,
    DrizzleDataServer,
    DrizzleDriver,
    DrizzleModulesValidator,
    DrizzleModulesLoader,
    ObjectionJsDataServer,
    ObjectionJsDriver,
    ObjectionModulesValidator,
    ObjectionModulesLoader,
    ObjectionJsRawModel: objectionPackage ? objectionPackage.Model : false,
    MikroOrmCore: mikroOrmCorePackage,
    MikroOrmDataServer,
    MikroOrmDriver,
    MikroOrmModulesValidator,
    MikroOrmModulesLoader,
    PackageResolver,
    KnexModulesValidator,
    KnexModulesLoader,
    PrismaDataServer,
    PrismaDriver,
    PrismaSchemaGenerator,
    PrismaClientLoader,
    PrismaModulesValidator,
    EntitiesGenerator,
    EntityProperties,
    TypeMapper,
    MySQLTablesProvider,
    RELATION_PREFIX
};
