/**
 *
 * Reldens - BaseDataServer
 *
 */

const { EntityManager } = require('./entity-manager');
const { ErrorManager, sc } = require('@reldens/utils');

class BaseDataServer
{

    constructor(props)
    {
        this.config = sc.get(props, 'config', false);
        this.client = sc.get(props, 'client', false);
        this.poolConfig = sc.get(props, 'poolConfig', false);
        this.connectString = sc.get(props, 'connectString', false);
        this.rawModel = sc.get(props, 'rawModel', false);
        this.name = sc.get(props, 'name', false);
        this.initialized = sc.get(props, 'initialized', false);
        this.rawEntities = props.rawEntities;
        let entities = props.entities || props.rawEntities ? this.generateEntities(props.rawEntities) : {};
        this.entityManager = new EntityManager({entities});
    }

    connect()
    {
        ErrorManager.error('BaseDriver connect() not implemented.');
    }

    generateEntities(rawEntities)
    {
        ErrorManager.error('BaseDriver generateEntities() not implemented.');
    }

    getEntity(entityName)
    {
        return this.entityManager.get(entityName);
    }

}

module.exports.BaseDataServer = BaseDataServer;
