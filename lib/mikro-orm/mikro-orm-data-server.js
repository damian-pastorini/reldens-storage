/**
 *
 * Reldens - MikroOrmDataServer
 *
 */

const { MikroOrmDriver } = require('./mikro-orm-driver');
const { BaseDataServer } = require('../base-data-server');
const { MikroORM } = require('@mikro-orm/core');
const { MySqlDriver } = require('@mikro-orm/mysql');
const { MongoDriver } = require('@mikro-orm/mongodb');
const { Logger, ErrorManager } = require('@reldens/utils');

class MikroOrmDataServer extends BaseDataServer
{

    orm = {};
    clientsMapped = {
        mysql: MySqlDriver,
        mongodb: MongoDriver
    };

    constructor(props)
    {
        // @TODO - BETA - Finish implementation.
        super(props);
        this.entitiesPath = props.entitiesPath;
    }

    async connect()
    {
        if(this.initialized){
            return this.initialized;
        }
        let providedSetup = {
            driver: this.clientsMapped[(this.client || 'mongodb')],
            dbName: this.config.database,
            clientUrl: this.connectString,
            allowGlobalContext: true
        };
        if(this.rawEntities){
            providedSetup.entities = Object.values(this.rawEntities);
        }
        if(0 < Object.keys(this.entities).length){
            providedSetup.entities = this.entities;
        }
        if(this.entitiesPath){
            providedSetup.entities = this.entitiesPath;
        }
        this.orm = await MikroORM.init(providedSetup);
        this.initialized = Date.now();
        return this.initialized;
    }

    generateEntities()
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
        for(let i of Object.keys(this.rawEntities)){
            let rawEntity = this.rawEntities[i];
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
