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

    async create(params)
    {
        ErrorManager.error('BaseDriver create() not implemented.');
    }

    async update(filters, updatePatch)
    {
        ErrorManager.error('BaseDriver update() not implemented.');
    }

    async updateBy(field, fieldValue, updatePatch)
    {
        ErrorManager.error('BaseDriver updateBy() not implemented.');
    }

    async updateById(id, params)
    {
        ErrorManager.error('BaseDriver updateById() not implemented.');
    }

    async delete(id)
    {
        ErrorManager.error('BaseDriver delete() not implemented.');
    }

    async count(filters)
    {
        ErrorManager.error('BaseDriver count() not implemented.');
    }

    async loadAll()
    {
        ErrorManager.error('BaseDriver loadAll() not implemented.');
    }

    async loadAllWithRelations(relations)
    {
        ErrorManager.error('BaseDriver loadAllWithRelations() not implemented.');
    }

    async load(filters)
    {
        ErrorManager.error('BaseDriver load() not implemented.');
    }

    async loadWithRelations(filters, relations)
    {
        ErrorManager.error('BaseDriver loadWithRelations() not implemented.');
    }

    async loadBy(field, value)
    {
        ErrorManager.error('BaseDriver loadBy() not implemented.');
    }

    async loadByWithRelations(field, value, relations)
    {
        ErrorManager.error('BaseDriver loadByWithRelations() not implemented.');
    }

    async loadById(id)
    {
        ErrorManager.error('BaseDriver loadById() not implemented.');
    }

    async loadByIdWithRelations(id, relations)
    {
        ErrorManager.error('BaseDriver loadByIdWithRelations() not implemented.');
    }

    async loadOne(filters)
    {
        ErrorManager.error('BaseDriver load() not implemented.');
    }

    async loadOneWithRelations(filters, relations)
    {
        ErrorManager.error('BaseDriver loadWithRelations() not implemented.');
    }

    async loadOneBy(field, value)
    {
        ErrorManager.error('BaseDriver loadBy() not implemented.');
    }

    async loadOneByWithRelations(field, value, relations)
    {
        ErrorManager.error('BaseDriver loadByWithRelations() not implemented.');
    }

    async orderBy(result)
    {
        ErrorManager.error('BaseDriver orderBy() not implemented.');
    }

}

module.exports.BaseDriver = BaseDriver;
