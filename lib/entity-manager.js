/**
 *
 * Reldens - EntityManager
 *
 */

const { sc } = require('@reldens/utils');

class EntityManager
{

    constructor(props)
    {
        this.entities = sc.get(props, 'entities', {});
    }

    setEntities(entities)
    {
        this.entities = entities;
    }

    get(key)
    {
        return this.entities[key];
    }

    add(key, entity)
    {
        return this.entities[key] = entity;
    }

    remove(key)
    {
        delete this.entities[key];
    }

    clear()
    {
        this.entities = {};
    }

}

module.exports.EntityManager = EntityManager;
