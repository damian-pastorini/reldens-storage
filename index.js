/**
 *
 * Reldens - Storage
 *
 */

const { BaseDataServer } = require('./lib/base-data-server');
const { BaseDriver } = require('./lib/base-driver');
const { ObjectionJsDriver } = require('./lib/objection-js-driver');
const { ObjectionJsDataServer } = require('./lib/objection-js-data-server');
const { MikroOrmDriver } = require('./lib/mikro-orm-driver');
const { ModelClassDeprecated } = require('./lib/objection-js-model-deprecated');

module.exports = {
    ModelClassDeprecated: ModelClassDeprecated,
    // databases:
    BaseDataServer: BaseDataServer,
    ObjectionJsDataServer: ObjectionJsDataServer,
    // drivers:
    BaseDriver: BaseDriver,
    ObjectionJsDriver: ObjectionJsDriver,
    MikroOrmDriver: MikroOrmDriver
};
