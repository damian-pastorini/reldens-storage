/**
 *
 * Reldens - KnexDataServer
 *
 */

const { BaseDataServer } = require('../base-data-server');
const { KnexDriver } = require('./knex-driver');
const { MySQLTablesProvider } = require('../mysql-tables-provider');
const { Mysql2ConnectionConfig } = require('../mysql2-connection-config');
const { KnexModulesValidator } = require('./knex-modules-validator');
const { KnexModulesLoader } = require('./knex-modules-loader');
const { Logger, sc } = require('@reldens/utils');

class KnexDataServer extends BaseDataServer
{

    constructor(props)
    {
        super(props);
        this.knexModules = sc.get(props, 'knexModules', false);
        this.knex = sc.get(this.knexModules, 'knex', false);
    }

    async connect()
    {
        if(this.initialized){
            return this.initialized;
        }
        if(!this.knexModules){
            this.knexModules = KnexModulesLoader.load(this.projectRoot);
        }
        if(!KnexModulesValidator.validate(this.knexModules)){
            return false;
        }
        if(!this.knex){
            this.knex = await this.knexModules.Knex({
                client: this.client,
                connection: this.sanitizeConnectionConfig(this.config),
                pool: this.poolConfig,
                debug: this.debug,
                multipleStatements: this.multipleStatements
            });
            this.knexModules.knex = this.knex;
        }
        try {
            const [[{ currentTime }]] = await this.knex.raw(
                'SELECT ROUND(UNIX_TIMESTAMP(NOW(6)) * 1000 + MICROSECOND(NOW(6)) / 1000) AS currentTime;'
            );
            this.initialized = currentTime;
        } catch(error) {
            Logger.critical(this.connectionErrorMessage(), error);
        }
        return this.initialized;
    }

    connectionErrorMessage()
    {
        return 'Connection failed, Knex error.';
    }

    sanitizeConnectionConfig(config)
    {
        if('mysql2' !== this.client){
            return config;
        }
        return Mysql2ConnectionConfig.sanitize(config);
    }

    async disconnect()
    {
        if(!this.knex){
            return false;
        }
        await this.knex.destroy();
        this.knex = false;
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
            this.entities[i] = new KnexDriver({
                rawModel: rawEntity,
                id: i,
                name: i,
                config: this.config,
                server: this,
                knex: this.knex
            });
        }
        this.entityManager.setEntities(this.entities);
        return this.entities;
    }

    name()
    {
        return this.name || 'Knex Data Server Driver';
    }

    async rawQuery(content)
    {
        return (await this.knex.raw(content)).shift() || false;
    }

    async fetchEntitiesFromDatabase()
    {
        if(!this.initialized){
            Logger.error('Connection was not initialized, please use the connect method first.');
            return false;
        }
        return await MySQLTablesProvider.fetchTables(this);
    }

}

module.exports.KnexDataServer = KnexDataServer;
