/**
 *
 * Reldens - ObjectionJsDriver
 *
 * This module handle the database queries.
 *
 */

const { BaseDriver } = require('./base-driver');

class ObjectionJsDriver extends BaseDriver
{

    constructor(props)
    {
        super(props);
    }

    id()
    {
        return this.rawModel.tableName || this.id || this.name || 'Objection JS';
    }

    name()
    {
        return this.rawModel.tableName || this.name || 'Objection JS';
    }

    create(params)
    {
        this.rawModel.query().insert(params);
    }

    update(where, params)
    {
        return this.rawModel.query().patch(params).where(where);
    }

    updateById(id, params)
    {
        return this.rawModel.query().patch(params).where(this.id, id);
    }

    updateBy(field, fieldValue, updatePatch)
    {
        return this.rawModel.query().patch(updatePatch).where(field, fieldValue);
    }

    delete(id)
    {
        return this.rawModel.delete().where(this.id, id);
    }

    count(filters)
    {
        return this.rawModel.query().count().where(filters);
    }

    loadAll()
    {
        return this.rawModel.query();
    }

    loadBy(field, value)
    {
        return this.rawModel.query().where(field, value);
    }

}

module.exports.ObjectionJsDriver = ObjectionJsDriver;
