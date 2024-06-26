/**
 *
 * Reldens - MikroOrmDataServer
 *
 */

const { MikroOrmDriver } = require('./mikro-orm-driver');
const { BaseDataServer } = require('../base-data-server');
const { MikroORM } = require('@mikro-orm/core');
const { Logger, ErrorManager } = require('@reldens/utils');

class MikroOrmDataServer extends BaseDataServer
{

    orm = {};
    clientsMapped = {
        mysql: 'mysql',
        mongodb: 'mongo'
    };

    async connect()
    {
        if(this.initialized){
            return this.initialized;
        }
        this.orm = await MikroORM.init({
            entities: Object.values(this.rawEntities),
            type: this.clientsMapped[(this.client || 'mongo')],
            clientUrl: this.connectString,
            allowGlobalContext: true
        });
        this.initialized = Date.now();
        return this.initialized;
    }

    generateEntities(rawEntities)
    {
        if(!this.initialized){
            Logger.critical('In order to generate entities with Mikro ORM driver you need to connect to the server.');
            return {};
        }
        if(!this.rawEntities){
            Logger.warning('Empty raw entities array, none entities generated.');
            return {};
        }
        this.entities = {};
        for(let i of Object.keys(rawEntities)){
            let rawEntity = rawEntities[i];
            this.entities[i] = new MikroOrmDriver({
                rawModel: rawEntity,
                id: i,
                name: i,
                config: this.orm.driver.connection.options,
                orm: this.orm,
                server: this
            });
        }
        this.entityManager.setEntities(this.entities);
        return this.entities;
    }

    name()
    {
        return this.name || 'Mikro-ORM Data Server Driver';
    }

    async rawQuery(content)
    {
        // @TODO - BETA - Implement.
        ErrorManager.error('MikroORM rawQuery() not implemented.');
    }

}

module.exports.MikroOrmDataServer = MikroOrmDataServer;
