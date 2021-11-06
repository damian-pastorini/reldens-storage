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

    update(filters, updatePatch)
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

    loadAllWithRelations(relations)
    {
        ErrorManager.error('BaseDriver loadAllWithRelations() not implemented.');
    }

    load(filters)
    {
        ErrorManager.error('BaseDriver load() not implemented.');
    }

    loadWithRelations(filters, relations)
    {
        ErrorManager.error('BaseDriver loadWithRelations() not implemented.');
    }

    loadBy(field, value)
    {
        ErrorManager.error('BaseDriver loadBy() not implemented.');
    }

    loadByWithRelations(field, value, relations)
    {
        ErrorManager.error('BaseDriver loadByWithRelations() not implemented.');
    }

    loadById(id)
    {
        ErrorManager.error('BaseDriver loadById() not implemented.');
    }

    loadByIdWithRelations(id, relations)
    {
        ErrorManager.error('BaseDriver loadByIdWithRelations() not implemented.');
    }

    loadOne(filters)
    {
        ErrorManager.error('BaseDriver load() not implemented.');
    }

    loadOneWithRelations(filters, relations)
    {
        ErrorManager.error('BaseDriver loadWithRelations() not implemented.');
    }

    loadOneBy(field, value)
    {
        ErrorManager.error('BaseDriver loadBy() not implemented.');
    }

    loadOneByWithRelations(field, value, relations)
    {
        ErrorManager.error('BaseDriver loadByWithRelations() not implemented.');
    }

}

module.exports.BaseDriver = BaseDriver;
