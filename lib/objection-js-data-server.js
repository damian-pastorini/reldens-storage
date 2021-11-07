/**
 *
 * Reldens - ObjectionJsDataServer
 *
 */

const { BaseDataServer } = require('./base-data-server');
const { ModelClass } = require('./objection-js-model-deprecated');
const { ObjectionJsDriver } = require('./objection-js-driver');
const Knex = require('knex');
const { sc } = require('@reldens/utils');

class ObjectionJsDataServer extends BaseDataServer
{

    constructor(props)
    {
        super(props);
        this.rawModel = sc.getDef(props, 'rawModel', ModelClass);
        this.knex = false;
    }

    connect()
    {
        if(this.initialized){
            return this.initialized;
        }
        // initialize knex, the query builder:
        this.knex = Knex({client: this.client, connection: this.config, pool: this.poolConfig});
        // give the knex instance to Objection:
        this.rawModel.knex(this.knex);
        this.initialized = Date.now();
    }

    generateEntities(rawEntities)
    {
        let entities = {};
        for(let i of Object.keys(rawEntities)){
            let rawEntity = rawEntities[i];
            entities[i] = new ObjectionJsDriver({rawModel: rawEntity, id: i, name: i, config: rawEntity.knex});
        }
        return entities;
    }

    name()
    {
        return this.name || 'Objection JS Data Server Driver';
    }

}

module.exports.ObjectionJsDataServer = ObjectionJsDataServer;
