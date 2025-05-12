/**
 *
 * Reldens - MikroOrmDataServer
 *
 */

const { MikroOrmDriver } = require('./mikro-orm-driver');
const { BaseDataServer } = require('../base-data-server');
const { MySQLTablesProvider } = require('../mysql-tables-provider');
const { MikroORM } = require('@mikro-orm/core');
const { MySqlDriver } = require('@mikro-orm/mysql');
const { MongoDriver } = require('@mikro-orm/mongodb');
const { ErrorManager, Logger, sc } = require('@reldens/utils');

class MikroOrmDataServer extends BaseDataServer
{

    orm = {};
    clientsMapped = {
        mysql: MySqlDriver,
        mongodb: MongoDriver
    };

    constructor(props)
    {
        super(props);
        this.entitiesPath = props.entitiesPath;
        this.warnWhenNoEntities = Boolean(props.warnWhenNoEntities);
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
            allowGlobalContext: true,
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
        providedSetup.discovery = {warnWhenNoEntities: this.warnWhenNoEntities};
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
        try {
            let queryResult = await this.orm.em.execute(content);
            if(!sc.isArray(queryResult) || 0 === queryResult.length){
                return false;
            }
            return queryResult;
        } catch(error) {
            Logger.error('Raw query failed: '+error.message);
            return false;
        }
    }

    async fetchEntitiesFromDatabase()
    {
        if(!this.initialized){
            Logger.error('Connection was not initialized, please use the connect method first.');
            return false;
        }
        try {
            if('mysql' === this.client){
                return await MySQLTablesProvider.fetchTables(this);
            }
            if('mongodb' === this.client){
                let tables = {};
                let collections = await this.orm.em.getDriver().getConnection().db().listCollections().toArray();
                for(let collection of collections){
                    tables[collection.name] = {
                        name: collection.name,
                        columns: {}
                    };
                }
                return tables;
            }
            ErrorManager.error('Unsupported client type: '+this.client);
        } catch(error) {
            ErrorManager.error('Failed to fetch tables from database: ' + error.message);
        }
    }

}

module.exports.MikroOrmDataServer = MikroOrmDataServer;
