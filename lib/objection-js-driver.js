/**
 *
 * Reldens - ObjectionJsDriver
 *
 */

const { BaseDriver } = require('./base-driver');
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

    async create(params)
    {
        this.rawModel.query().insert(params);
    }

    async update(filters, updatePatch)
    {
        return this.rawModel.query().patch(updatePatch).where(filters);
    }

    async updateBy(field, fieldValue, updatePatch)
    {
        return this.rawModel.query().patch(updatePatch).where(field, fieldValue);
    }

    async updateById(id, params)
    {
        return this.rawModel.query().patch(params).where(this.id, id);
    }

    async delete(id)
    {
        return this.rawModel.delete().where(this.id, id);
    }

    async count(filters)
    {
        return this.rawModel.query().count().where(filters);
    }

    async loadAll()
    {
        return this.rawModel.query();
    }

    async loadAllWithRelations(relations)
    {
        return this.appendRelationsToQuery(this.rawModel.query(), relations);
    }

    async load(filters)
    {
        return this.rawModel.query().where(filters);
    }

    async loadWithRelations(filters, relations)
    {
        return this.appendRelationsToQuery(this.rawModel.query().where(filters), relations);
    }

    async loadBy(field, value)
    {
        return this.rawModel.query().where(field, value);
    }

    async loadByWithRelations(field, value, relations)
    {
        return this.appendRelationsToQuery(this.rawModel.query().where(field, value), relations);
    }

    async loadById(id)
    {
        return this.rawModel.query().findById(id);
    }

    async loadByIdWithRelations(id, relations)
    {
        return this.appendRelationsToQuery(this.rawModel.query().findById(id), relations);
    }

    async loadOne(filters)
    {
        return this.rawModel.query().where(filters).limit(1).first();
    }

    async loadOneWithRelations(filters, relations)
    {
        return this.appendRelationsToQuery(this.rawModel.query().where(field, value), relations).limit(1).first();
    }

    async loadOneBy(field, value)
    {
        return this.rawModel.query().where(field, value).first();
    }

    async loadOneByWithRelations(field, value, relations)
    {
        return this.appendRelationsToQuery(this.rawModel.query().where(field, value), relations).limit(1).first();
    }

    async orderBy(result, fieldName)
    {
        return result.modifiers({
            orderByKey(builder){
                builder.orderBy(fieldName);
            }
        });
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
