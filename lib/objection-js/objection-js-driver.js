/**
 *
 * Reldens - ObjectionJsDriver
 *
 */

const { BaseDriver } = require('../base-driver');
const { sc } = require('@reldens/utils');

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

    createWithRelations(params, relations)
    {
        return this.rawModel.query().insertGraphAndFetch(params);
    }

    update(filters, updatePatch)
    {
        return this.rawModel.query().patch(updatePatch).where(filters);
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
        return this.rawModel.query().delete().where(this.id, id);
    }

    count(filters)
    {
        return this.rawModel.query().count().where(filters);
    }

    loadAll()
    {
        return this.rawModel.query();
    }

    loadAllWithRelations(relations)
    {
        return this.appendRelationsToQuery(this.rawModel.query(), relations);
    }

    load(filters)
    {
        return this.rawModel.query().where(filters);
    }

    loadWithRelations(filters, relations)
    {
        return this.appendRelationsToQuery(this.rawModel.query().where(filters), relations);
    }

    loadBy(field, value)
    {
        return this.rawModel.query().where(field, value);
    }

    loadByWithRelations(field, value, relations)
    {
        return this.appendRelationsToQuery(this.rawModel.query().where(field, value), relations);
    }

    loadById(id)
    {
        return this.rawModel.query().findById(id);
    }

    loadByIdWithRelations(id, relations)
    {
        return this.appendRelationsToQuery(this.rawModel.query().findById(id), relations);
    }

    loadOne(filters)
    {
        return this.rawModel.query().where(filters).limit(1).first();
    }

    loadOneWithRelations(filters, relations)
    {
        return this.appendRelationsToQuery(this.rawModel.query().where(field, value), relations).limit(1).first();
    }

    loadOneBy(field, value)
    {
        return this.rawModel.query().where(field, value).first();
    }

    loadOneByWithRelations(field, value, relations)
    {
        return this.appendRelationsToQuery(this.rawModel.query().where(field, value), relations).limit(1).first();
    }

    appendRelationsToQuery(queryBuilder, relations)
    {
        if(!sc.isArray(relations) || relations.length === 0){
            relations = Object.keys(this.rawModel.relationMappings || {});
        }
        if(relations.length > 0){
            queryBuilder.withGraphFetched('['+relations.join(',')+']');
        }
        return queryBuilder;
    }

}

module.exports.ObjectionJsDriver = ObjectionJsDriver;
