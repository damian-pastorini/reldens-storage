/**
 *
 * Reldens - DataServer
 *
 * This module handle the database connection and queries.
 *
 */

const { Model } = require('objection');
const Knex = require('knex');
const { Logger, ErrorManager } = require('@reldens/utils');

class DataServer
{

    initialize()
    {
        // db config:
        this.prepareDbConfig();
        // check for errors:
        if(!this.config.user){
            ErrorManager.error('Missing storage user configuration.');
        }
        if(!this.config.database){
            ErrorManager.error('Missing storage database name configuration.');
        }
        // log connection data before prepare objection (in case you have some missing data in the config):
        let {host, port, database, user, password} = this.config;
        this.connectString = `${this.client}://${user}${(password ? ':'+password : '')}@${host}:${port}/${database}`;
        Logger.info(['DataServer Config:', this.config, this.poolConfig, this.connectString]);
        try {
            this.prepareObjection();
            Logger.info('Objection JS ready!');
        } catch (err) {
            ErrorManager.error('Objection JS - ERROR: '+err);
        }
    }

    prepareDbConfig()
    {
        // @NOTE: see the sample.env file in the module root for the variables setup.
        this.client = process.env.RELDENS_DB_CLIENT || 'mysql';
        this.config = {
            host: process.env.RELDENS_DB_HOST || 'localhost',
            port: Number(process.env.RELDENS_DB_PORT) || 3306,
            database: process.env.RELDENS_DB_NAME || false,
            user: process.env.RELDENS_DB_USER || false,
            password: process.env.RELDENS_DB_PASSWORD || ''
        };
        if(process.env.RELDENS_DB_LIMIT){
            this.config.connectionLimit = Number(process.env.RELDENS_DB_LIMIT);
        }
        this.poolConfig = {
            min: Number(process.env.RELDENS_DB_POOL_MIN) || 2,
            max: Number(process.env.RELDENS_DB_POOL_MAX) || 30
        };
    }

    prepareObjection()
    {
        // initialize knex, the query builder:
        this.knex = Knex({client: this.client, connection: this.config, pool: this.poolConfig});
        // give the knex instance to Objection.
        this.model = Model.knex(this.knex);
    }

}

module.exports.DataServer = new DataServer();
