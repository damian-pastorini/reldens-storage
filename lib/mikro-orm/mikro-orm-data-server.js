/**
 *
 * Reldens - MikroOrmDataServer
 *
 */

const { MikroOrmDriver } = require('./mikro-orm-driver');
const { BaseDataServer } = require('../base-data-server');
const { MySQLTablesProvider } = require('../mysql-tables-provider');
const { MikroOrmModulesValidator } = require('./mikro-orm-modules-validator');
const { MikroOrmModulesLoader } = require('./mikro-orm-modules-loader');
const { Logger, sc } = require('@reldens/utils');

class MikroOrmDataServer extends BaseDataServer
{

    orm = {};
    mysqlClients = ['mysql', 'mysql2'];

    constructor(props)
    {
        super(props);
        this.entitiesPath = props.entitiesPath;
        this.warnWhenNoEntities = Boolean(props.warnWhenNoEntities);
        this.mikroOrmModules = sc.get(props, 'mikroOrmModules', false);
    }

    clientDriver()
    {
        if('mongodb' === this.client){
            return this.mikroOrmModules.MongoDriver;
        }
        return this.mikroOrmModules.MySqlDriver;
    }

    getEntitiesToRegister()
    {
        if(this.entitiesPath){
            return this.entitiesPath;
        }
        if(0 < Object.keys(this.entities).length){
            return this.entities;
        }
        if(!this.rawEntities){
            return [];
        }
        let entities = [];
        for(let i of Object.keys(this.rawEntities)){
            let rawEntity = this.rawEntities[i];
            entities.push((rawEntity && rawEntity.schema) ? rawEntity.schema : rawEntity);
        }
        return entities;
    }

    async connect()
    {
        if(this.initialized){
            return this.initialized;
        }
        if(!this.client){
            this.client = 'mongodb';
        }
        if(!this.mikroOrmModules){
            this.mikroOrmModules = MikroOrmModulesLoader.load(this.projectRoot, this.client);
        }
        if(!MikroOrmModulesValidator.validate(this.mikroOrmModules, this.client)){
            return false;
        }
        let providedSetup = {
            driver: this.clientDriver(),
            dbName: this.config.database,
            clientUrl: this.connectString,
            allowGlobalContext: true,
            multipleStatements: this.multipleStatements,
            namingStrategy: this.mikroOrmModules.EntityCaseNamingStrategy
        };
        if(0 < Object.keys(this.poolConfig).length){
            providedSetup.pool = this.poolConfig;
        }
        providedSetup.entities = this.getEntitiesToRegister();
        providedSetup.discovery = {warnWhenNoEntities: this.warnWhenNoEntities};
        this.orm = await this.mikroOrmModules.MikroORM.init(providedSetup);
        this.initialized = Date.now();
        return this.initialized;
    }

    async disconnect()
    {
        if(!this.orm){
            return false;
        }
        await this.orm.close();
        this.initialized = null;
        return true;
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
                config: { dbName: this.orm.config.get('dbName') },
                orm: this.orm,
                server: this,
                mikroOrmModules: this.mikroOrmModules
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
            let queryResult = await this.orm.em.execute(content, [], 'run');
            let rows = sc.get(queryResult, 'rows', []);
            if(!sc.isArray(rows)){
                return false;
            }
            if(0 < rows.length){
                return rows;
            }
            if(0 < queryResult.affectedRows){
                return {affectedRows: queryResult.affectedRows, insertId: queryResult.insertId};
            }
            return rows;
        } catch(error) {
            Logger.error('Raw query failed: '+error.message);
            return false;
        }
    }

    async fetchEntitiesFromDatabase()
    {
        if(!this.initialized){
            Logger.critical('Connection was not initialized, please use the connect method first.');
            return false;
        }
        try {
            if(-1 !== this.mysqlClients.indexOf(this.client)){
                return await MySQLTablesProvider.fetchTables(this);
            }
            if('mongodb' === this.client){
                return await this.fetchMongoCollections();
            }
            Logger.critical('Unsupported client type: '+this.client);
        } catch(error) {
            Logger.critical('MikroORM tables fetch failed. ' + error.message);
        }
        return false;
    }

    async fetchMongoCollections()
    {
        let tables = {};
        let collections = await this.orm.em.getDriver().getConnection().db().listCollections().toArray();
        for(let collection of collections){
            tables[collection.name] = {name: collection.name, columns: {}};
        }
        return tables;
    }

}

module.exports.MikroOrmDataServer = MikroOrmDataServer;
