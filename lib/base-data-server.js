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
        this.config = sc.getDef(props, 'config', false);
        this.client = sc.getDef(props, 'client', false);
        this.poolConfig = sc.getDef(props, 'poolConfig', false);
        this.connectString = sc.getDef(props, 'connectString', false);
        this.rawModel = sc.getDef(props, 'rawModel', false);
        this.name = sc.getDef(props, 'name', false);
        this.initialized = sc.getDef(props, 'initialized', false);
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
        this.entityManager.get(entityName);
    }

}

module.exports.BaseDataServer = BaseDataServer;
