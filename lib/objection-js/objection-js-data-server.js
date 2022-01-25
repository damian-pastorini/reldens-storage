/**
 *
 * Reldens - ObjectionJsDataServer
 *
 */

const { BaseDataServer } = require('../base-data-server');
const { ObjectionJsDriver } = require('./objection-js-driver');
const { Model } = require('objection');
const Knex = require('knex');
const { Logger } = require('@reldens/utils');

class ObjectionJsDataServer extends BaseDataServer
{

    constructor(props)
    {
        super(props);
        this.knex = false;
        if(!this.rawModel){
            this.rawModel = Model;
        }
    }

    async connect()
    {
        if(this.initialized){
            return this.initialized;
        }
        // initialize knex, the query builder:
        this.knex = await Knex({client: this.client, connection: this.config, pool: this.poolConfig});
        // give the knex instance to Objection:
        this.rawModel.knex(this.knex);
        this.initialized = Date.now();
        return this.initialized;
    }

    generateEntities()
    {
        if(!this.rawEntities){
            Logger.warning('Empty raw entities array, none entities generated.');
            return {};
        }
        this.entities = {};
        for(let i of Object.keys(this.rawEntities)){
            let rawEntity = this.rawEntities[i];
            this.entities[i] = new ObjectionJsDriver({rawModel: rawEntity, id: i, name: i, config: rawEntity.knex});
        }
        this.entityManager.setEntities(this.entities);
        return this.entities;
    }

    name()
    {
        return this.name || 'Objection JS Data Server Driver';
    }

}

module.exports.ObjectionJsDataServer = ObjectionJsDataServer;
