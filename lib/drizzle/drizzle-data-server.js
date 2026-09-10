/**
 *
 * Reldens - DrizzleDataServer
 *
 */

const { BaseDataServer } = require('../base-data-server');
const { DrizzleDriver } = require('./drizzle-driver');
const { DrizzleModulesValidator } = require('./drizzle-modules-validator');
const { MySQLTablesProvider } = require('../mysql-tables-provider');
const { Mysql2ConnectionConfig } = require('../mysql2-connection-config');
const { createPool } = require('mysql2/promise');
const { Logger, sc } = require('@reldens/utils');

class DrizzleDataServer extends BaseDataServer
{

    constructor(props)
    {
        super(props);
        this.drizzleModules = sc.get(props, 'drizzleModules', false);
        this.db = sc.get(this.drizzleModules, 'db', false);
    }

    async connect()
    {
        if(this.initialized){
            return this.initialized;
        }
        if(!DrizzleModulesValidator.validate(this.drizzleModules)){
            return false;
        }
        try {
            if(!this.db){
                this.db = this.drizzleModules.drizzle({client: createPool(this.poolConfiguration())});
                this.drizzleModules.db = this.db;
            }
            await this.db.execute(this.drizzleModules.orm.sql.raw('SELECT 1'));
            this.initialized = Date.now();
        } catch(error) {
            Logger.critical('Connection failed, Drizzle error: '+error.message);
        }
        return this.initialized;
    }

    poolConfiguration()
    {
        let poolConfiguration = Mysql2ConnectionConfig.sanitize(this.config);
        if(this.multipleStatements){
            poolConfiguration.multipleStatements = true;
        }
        return poolConfiguration;
    }

    async disconnect()
    {
        if(!this.db){
            return false;
        }
        await this.db.$client.end();
        this.db = false;
        this.initialized = false;
        return true;
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
            if(!sc.isString(sc.get(rawEntity, 'tableName', false))){
                Logger.critical('Invalid raw entity "'+i+'".');
                continue;
            }
            if(!sc.isObject(sc.get(rawEntity, 'table', false))){
                Logger.critical('Missing Drizzle table on raw entity "'+i+'".');
                continue;
            }
            this.entities[i] = new DrizzleDriver({
                rawModel: rawEntity,
                id: i,
                name: i,
                config: this.config,
                server: this,
                db: this.db,
                orm: this.drizzleModules.orm
            });
        }
        this.entityManager.setEntities(this.entities);
        return this.entities;
    }

    name()
    {
        return this.name || 'Drizzle Data Server Driver';
    }

    async rawQuery(content)
    {
        return (await this.db.execute(this.drizzleModules.orm.sql.raw(content))).shift() || false;
    }

    async fetchEntitiesFromDatabase()
    {
        if(!this.initialized){
            Logger.critical('Connection was not initialized, please use the connect method first.');
            return false;
        }
        try {
            return await MySQLTablesProvider.fetchTables(this);
        } catch(error) {
            Logger.critical('Drizzle Data Server tables fetch failed. '+error.message);
            return false;
        }
    }

}

module.exports.DrizzleDataServer = DrizzleDataServer;
