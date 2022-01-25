/**
 *
 * Reldens - MikroOrmDataServer
 *
 */

const { MikroOrmDriver } = require('./mikro-orm-driver');
const { BaseDataServer } = require('../base-data-server');
const { MikroORM } = require('@mikro-orm/core');
const { Logger } = require('@reldens/utils');

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
            dbName: this.config.database,
            type: this.clientsMapped[(this.client || 'mongo')],
            clientUrl: this.connectString,
            host: this.config.host,
            port: this.config.port,
            user: this.config.user,
            password: this.config.password
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
                orm: this.orm
            });
        }
        this.entityManager.setEntities(this.entities);
        return this.entities;
    }

    name()
    {
        return this.name || 'Mikro-ORM Data Server Driver';
    }

}

module.exports.MikroOrmDataServer = MikroOrmDataServer;
