/**
 *
 * Reldens - BaseDriver
 *
 */

const { ErrorManager, sc } = require('@reldens/utils');

class BaseDriver
{

    constructor(props)
    {
        this.config = sc.getDef(props, 'config', false);
        this.rawModel = sc.getDef(props, 'rawModel', false);
        this.id = sc.getDef(props, 'id', false);
        this.name = sc.getDef(props, 'name', false);
    }

    id()
    {
        ErrorManager.error('BaseDriver id() not implemented.');
    }

    name()
    {
        ErrorManager.error('BaseDriver name() not implemented.');
    }

    create(params)
    {
        ErrorManager.error('BaseDriver create() not implemented.');
    }

    update(where, params)
    {
        ErrorManager.error('BaseDriver update() not implemented.');
    }

    updateBy(field, fieldValue, updatePatch)
    {
        ErrorManager.error('BaseDriver updateBy() not implemented.');
    }

    updateById(id, params)
    {
        ErrorManager.error('BaseDriver updateById() not implemented.');
    }

    delete(id)
    {
        ErrorManager.error('BaseDriver delete() not implemented.');
    }

    count(filters)
    {
        ErrorManager.error('BaseDriver count() not implemented.');
    }

    loadAll()
    {
        ErrorManager.error('BaseDriver loadAll() not implemented.');
    }

    load(where)
    {
        ErrorManager.error('BaseDriver load() not implemented.');
    }

    loadBy(field, value)
    {
        ErrorManager.error('BaseDriver loadBy() not implemented.');
    }

}

module.exports.BaseDriver = BaseDriver;
