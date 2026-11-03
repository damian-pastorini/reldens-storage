/**
 *
 * Reldens - KyselyDataServer
 *
 */

const { BaseDataServer } = require('../base-data-server');
const { KyselyDriver } = require('./kysely-driver');
const { KyselyModulesValidator } = require('./kysely-modules-validator');
const { MySQLTablesProvider } = require('../mysql-tables-provider');
const { Mysql2ConnectionConfig } = require('../mysql2-connection-config');
const { createPool } = require('mysql2');
const { Logger, sc } = require('@reldens/utils');

class KyselyDataServer extends BaseDataServer
{

    constructor(props)
    {
        super(props);
        this.kyselyModules = sc.get(props, 'kyselyModules', false);
        this.db = sc.get(this.kyselyModules, 'db', false);
    }

    async connect()
    {
        if(this.initialized){
            return this.initialized;
        }
        if(!KyselyModulesValidator.validate(this.kyselyModules)){
            return false;
        }
        try {
            if(!this.db){
                this.db = new this.kyselyModules.Kysely({
                    dialect: new this.kyselyModules.MysqlDialect({pool: createPool(this.poolConfiguration())})
                });
                this.kyselyModules.db = this.db;
            }
            await this.kyselyModules.sql.raw('SELECT 1').execute(this.db);
            this.initialized = Date.now();
        } catch(error) {
            Logger.critical('Connection failed, Kysely error: '+error.message);
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
        await this.db.destroy();
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
            this.entities[i] = new KyselyDriver({
                rawModel: rawEntity,
                id: i,
                name: i,
                config: this.config,
                server: this,
                db: this.db,
                sql: this.kyselyModules.sql
            });
        }
        this.entityManager.setEntities(this.entities);
        return this.entities;
    }

    name()
    {
        return this.name || 'Kysely Data Server Driver';
    }

    async rawQuery(content)
    {
        let result = await this.kyselyModules.sql.raw(content).execute(this.db);
        if(!sc.hasOwn(result, 'numAffectedRows')){
            return result.rows;
        }
        return {
            affectedRows: Number(sc.get(result, 'numAffectedRows', 0)),
            insertId: Number(sc.get(result, 'insertId', 0))
        };
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
            Logger.critical('Kysely Data Server tables fetch failed. '+error.message);
            return false;
        }
    }

}

module.exports.KyselyDataServer = KyselyDataServer;
