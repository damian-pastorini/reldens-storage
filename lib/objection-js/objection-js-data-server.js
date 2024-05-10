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
        this.knex = await Knex({
            client: this.client,
            connection: this.config,
            pool: this.poolConfig,
            debug: this.debug,
            multipleStatements: this.multipleStatements
        });
        await this.rawModel.knex(this.knex);
        try {
            const [[{ currentTime }]] = await this.rawModel.knex().raw(
                'SELECT ROUND(UNIX_TIMESTAMP(NOW(6)) * 1000 + MICROSECOND(NOW(6)) / 1000) AS currentTime;'
            );
            this.initialized = currentTime;
        } catch (err) {
            Logger.critical('Connection failed, Objection JS error.', err);
        }
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
            if(!rawEntity?.knex){
                Logger.critical('Invalid raw entity "'+i+'".');
                continue;
            }
            this.entities[i] = new ObjectionJsDriver({rawModel: rawEntity, id: i, name: i, config: rawEntity.knex});
        }
        this.entityManager.setEntities(this.entities);
        return this.entities;
    }

    name()
    {
        return this.name || 'Objection JS Data Server Driver';
    }

    async rawQuery(content)
    {
        return await this.knex.raw(content);
    }

}

module.exports.ObjectionJsDataServer = ObjectionJsDataServer;
