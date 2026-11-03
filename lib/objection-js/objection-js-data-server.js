/**
 *
 * Reldens - ObjectionJsDataServer
 *
 */

const { KnexDataServer } = require('../knex/knex-data-server');
const { ObjectionJsDriver } = require('./objection-js-driver');
const { ObjectionModulesValidator } = require('./objection-modules-validator');
const { ObjectionModulesLoader } = require('./objection-modules-loader');
const { Logger, sc } = require('@reldens/utils');

class ObjectionJsDataServer extends KnexDataServer
{

    constructor(props)
    {
        super(props);
        this.objectionModules = sc.get(props, 'objectionModules', false);
    }

    async connect()
    {
        if(!this.objectionModules){
            this.objectionModules = ObjectionModulesLoader.load(this.projectRoot);
        }
        if(!ObjectionModulesValidator.validate(this.objectionModules)){
            return false;
        }
        if(!this.rawModel){
            this.rawModel = this.objectionModules.Model;
        }
        let initialized = await super.connect();
        if(this.knex){
            await this.rawModel.knex(this.knex);
        }
        return initialized;
    }

    connectionErrorMessage()
    {
        return 'Connection failed, Objection JS error.';
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

}

module.exports.ObjectionJsDataServer = ObjectionJsDataServer;
