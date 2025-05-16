/**
 *
 * Reldens - Storage
 *
 */

const { BaseDataServer } = require('./lib/base-data-server');
const { BaseDriver } = require('./lib/base-driver');
const { ObjectionJsDriver } = require('./lib/objection-js/objection-js-driver');
const { ObjectionJsDataServer } = require('./lib/objection-js/objection-js-data-server');
const { Model } = require('objection');
const { MikroOrmDriver } = require('./lib/mikro-orm/mikro-orm-driver');
const { MikroOrmDataServer } = require('./lib/mikro-orm/mikro-orm-data-server');
const MikroOrmCore = require('@mikro-orm/core');
const { EntitiesGenerator } = require('./lib/entities-generator');
const { EntityProperties } = require('./lib/entity-properties');
const { TypeMapper } = require('./lib/type-mapper');
const { MySQLTablesProvider } = require('./lib/mysql-tables-provider');
const { PrismaDriver } = require('./lib/prisma/prisma-driver');
const { PrismaDataServer } = require('./lib/prisma/prisma-data-server');
const { PrismaSchemaGenerator } = require('./lib/prisma/prisma-schema-generator');

module.exports = {
    // base:
    BaseDataServer,
    BaseDriver,
    DriversMap: {
        'objection-js': ObjectionJsDataServer,
        'mikro-orm': MikroOrmDataServer,
        'prisma': PrismaDataServer
    },
    DriversClassMap: {
        'ObjectionJsDataServer': 'objection-js',
        'MikroOrmDataServer': 'mikro-orm',
        'PrismaDataServer': 'prisma-server'
    },
    // objection-js:
    ObjectionJsDataServer,
    ObjectionJsDriver,
    ObjectionJsRawModel: Model,
    // mikro-orm:
    MikroOrmCore,
    MikroOrmDataServer,
    MikroOrmDriver,
    // prisma:
    PrismaDataServer,
    PrismaDriver,
    PrismaSchemaGenerator,
    // entities:
    EntitiesGenerator,
    EntityProperties,
    TypeMapper,
    MySQLTablesProvider
};
