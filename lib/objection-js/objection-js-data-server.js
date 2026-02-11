/**
 *
 * Reldens - ObjectionJsDataServer
 *
 */

const { BaseDataServer } = require('../base-data-server');
const { ObjectionJsDriver } = require('./objection-js-driver');
const { MySQLTablesProvider } = require('../mysql-tables-provider');
const { Model } = require('objection');
const Knex = require('knex');
const { Logger, sc } = require('@reldens/utils');

class ObjectionJsDataServer extends BaseDataServer
{

    constructor(props)
    {
        super(props);
        this.knex = false;
        if(!this.rawModel){
            this.rawModel = Model;
        }
        this.validMySQL2Options = [
            'authPlugins', 'authSwitchHandler', 'bigNumberStrings', 'charset', 'charsetNumber', 'compress',
            'connectAttributes', 'connectTimeout', 'database', 'dateStrings', 'debug', 'decimalNumbers',
            'enableKeepAlive', 'flags', 'host', 'insecureAuth', 'infileStreamFactory', 'isServer',
            'keepAliveInitialDelay', 'localAddress', 'maxPreparedStatements', 'multipleStatements',
            'namedPlaceholders', 'nestTables', 'password', 'password1', 'password2', 'password3', 'passwordSha1',
            'pool', 'port', 'queryFormat', 'rowsAsArray', 'socketPath', 'ssl', 'stream', 'stringifyObjects',
            'supportBigNumbers', 'timezone', 'trace', 'typeCast', 'uri', 'user', 'disableEval', 'connectionLimit',
            'maxIdle', 'idleTimeout', 'Promise', 'queueLimit', 'waitForConnections', 'jsonStrings', 'gracefulEnd'
        ];
    }

    async connect()
    {
        if(this.initialized){
            return this.initialized;
        }
        let connectionConfig = this.sanitizeConnectionConfig(this.config);
        this.knex = await Knex({
            client: this.client,
            connection: connectionConfig,
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

    sanitizeConnectionConfig(config)
    {
        if('mysql2' !== this.client){
            return config;
        }
        let cleanConfig = {};
        for(let prop of this.validMySQL2Options){
            if(sc.hasOwn(config, prop)){
                cleanConfig[prop] = config[prop];
            }
        }
        return cleanConfig;
    }

    async disconnect()
    {
        if(!this.knex){
            return false;
        }
        await this.knex.destroy();
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
        let result = await this.knex.raw(content);
        return result[0] || false;
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

module.exports.ObjectionJsDataServer = ObjectionJsDataServer;
