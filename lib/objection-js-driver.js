/**
 *
 * Reldens - ObjectionJsDriver
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
        return this.id || this.name();
    }

    name()
    {
        return this.name || this.rawModel.tableName;
    }

    create(params)
    {
        this.rawModel.query().insert(params);
    }

    update(where, params)
    {
        return this.rawModel.query().patch(params).where(where);
    }

    updateBy(field, fieldValue, updatePatch)
    {
        return this.rawModel.query().patch(updatePatch).where(field, fieldValue);
    }

    updateById(id, params)
    {
        return this.rawModel.query().patch(params).where(this.id, id);
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

    load(where)
    {
        return this.rawModel.query().where(where);
    }

    loadBy(field, value)
    {
        return this.rawModel.query().where(field, value);
    }

}

module.exports.ObjectionJsDriver = ObjectionJsDriver;
