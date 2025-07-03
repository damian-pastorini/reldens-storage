/**
 *
 * Reldens - BaseDataServer
 *
 */

const { EntityManager } = require('./entity-manager');
const { ErrorManager, Logger, sc } = require('@reldens/utils');

class BaseDataServer
{

    constructor(props)
    {
        this.config = sc.get(props, 'config', {});
        if(!this.config.host){
            this.config.host = 'localhost';
        }
        if(!this.config.port){
            this.config.port = 3306;
        }
        this.client = sc.get(props, 'client', '');
        this.poolConfig = sc.get(props, 'poolConfig', {});
        this.connectStringOptions = sc.get(props, 'connectStringOptions', '');
        this.connectString = sc.get(props, 'connectString', this.createConnectionString());
        this.debug = sc.get(props, 'debug', false);
        this.multipleStatements = sc.get(props, 'multipleStatements', false);
        this.rawModel = sc.get(props, 'rawModel', false);
        this.name = sc.get(props, 'name', false);
        this.initialized = sc.get(props, 'initialized', false);
        this.rawEntities = props.rawEntities;
        this.entities = props.entities || {};
        this.entitiesConfig = sc.get(props, 'entitiesConfig', {});
        this.entityManager = new EntityManager({entities: this.entities});
    }

    createConnectionString()
    {
        if('' === this.client){
            Logger.warning('Client is empty, connection may fail.');
        }
        if('' === this.config.user){
            Logger.warning('User is empty, connection may fail.');
        }
        return (this.client || '')+'://'
            +(this.config.user || '')
            +(this.config.password ? ':'+this.config.password : '')
            +'@'+this.config.host
            +':'+this.config.port
            +(this.config.database ? '/'+this.config.database : '')
            +(this.connectStringOptions ? '?'+this.connectStringOptions : '');
    }

    getEntity(entityName)
    {
        return this.entityManager.get(entityName);
    }

    generateEntities(rawEntities)
    {
        ErrorManager.error('BaseDriver generateEntities() not implemented.');
    }

    async connect()
    {
        ErrorManager.error('BaseDriver connect() not implemented.');
    }

    async fetchEntitiesFromDatabase()
    {
        ErrorManager.error('BaseDriver fetchEntitiesFromDatabase() not implemented.');
    }

}

module.exports.BaseDataServer = BaseDataServer;
