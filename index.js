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

module.exports = {
    // base:
    BaseDataServer: BaseDataServer,
    BaseDriver: BaseDriver,
    // objection-js:
    ObjectionJsDataServer: ObjectionJsDataServer,
    ObjectionJsDriver: ObjectionJsDriver,
    ObjectionJsRawModel: Model,
    // mikro-orm:
    MikroOrmCore,
    MikroOrmDataServer: MikroOrmDataServer,
    MikroOrmDriver: MikroOrmDriver
};
