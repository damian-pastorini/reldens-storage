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

    databaseName()
    {
        return this.rawModel.knex().client.config.connection.database || '';
    }

    id()
    {
        return this.rawModel.tableName || this.name();
    }

    name()
    {
        return this.rawName || this.rawModel.tableName;
    }

    tableName()
    {
        return this.rawModel.tableName;
    }

    create(params)
    {
        return this.queryBuilder().insert(params);
    }

    createWithRelations(params, relations)
    {
        return this.queryBuilder().insertGraphAndFetch(params);
    }

    update(filters, updatePatch)
    {
        let queryBuilder = this.queryBuilder(true, true, true);
        this.appendFilters(queryBuilder, filters);
        return queryBuilder.patch(updatePatch);
    }

    updateBy(field, fieldValue, updatePatch, operator = null)
    {
        let queryBuilder = this.queryBuilder(true, true, true);
        this.appendSingleFilter(queryBuilder, field, fieldValue, operator);
        return queryBuilder.patch(updatePatch);
    }

    updateById(id, params)
    {
        return this.queryBuilder().patchAndFetchById(id, params);
    }

    delete(id)
    {
        return this.queryBuilder().deleteById(id);
    }

    async count(filters)
    {
        let queryBuilder = this.queryBuilder(true, true, true);
        this.appendFilters(queryBuilder, filters);
        let count = await queryBuilder.count().first();
        return count ? count['count(*)'] : 0;
    }

    async countWithRelations(filters, relations)
    {
        let queryBuilder = this.queryBuilder(true, true, true);
        this.appendFilters(queryBuilder, filters);
        let count = await this.appendRelationsToQuery(queryBuilder, relations).count().first();
        return count ? count['count(*)'] : 0;
    }

    loadAll()
    {
        return this.queryBuilder();
    }

    loadAllWithRelations(relations)
    {
        return this.appendRelationsToQuery(this.queryBuilder(), relations);
    }

    load(filters)
    {
        let queryBuilder = this.queryBuilder(true, true, true);
        this.appendFilters(queryBuilder, filters);
        return queryBuilder;
    }

    loadWithRelations(filters, relations)
    {
        let queryBuilder = this.queryBuilder(true, true, true);
        this.appendFilters(queryBuilder, filters);
        return this.appendRelationsToQuery(queryBuilder, relations);
    }

    loadBy(field, fieldValue, operator = null)
    {
        let queryBuilder = this.queryBuilder(true, true, true);
        this.appendSingleFilter(queryBuilder, field, fieldValue, operator);
        return queryBuilder;
    }

    loadByWithRelations(field, fieldValue, relations, operator = null)
    {
        let queryBuilder = this.queryBuilder(true, true, true);
        this.appendSingleFilter(queryBuilder, field, fieldValue, operator);
        return this.appendRelationsToQuery(queryBuilder, relations);
    }

    loadById(id)
    {
        return this.queryBuilder().findById(id);
    }

    loadByIdWithRelations(id, relations)
    {
        return this.appendRelationsToQuery(this.queryBuilder().findById(id), relations);
    }

    loadByIds(ids)
    {
        return this.queryBuilder().findByIds(ids);
    }

    loadOne(filters)
    {
        let queryBuilder = this.queryBuilder(false, true, true);
        this.appendFilters(queryBuilder, filters);
        return queryBuilder.limit(1).first();
    }

    loadOneWithRelations(filters, relations)
    {
        let queryBuilder = this.queryBuilder(false, true, true);
        this.appendFilters(queryBuilder, filters);
        return this.appendRelationsToQuery(queryBuilder, relations).limit(1).first();
    }

    loadOneBy(field, fieldValue, operator = null)
    {
        let queryBuilder = this.queryBuilder(false, true, true);
        this.appendSingleFilter(queryBuilder, field, fieldValue, operator);
        return queryBuilder.limit(1).first();
    }

    loadOneByWithRelations(field, fieldValue, relations, operator = null)
    {
        let queryBuilder = this.queryBuilder(false, true, true);
        this.appendSingleFilter(queryBuilder, field, fieldValue, operator);
        return this.appendRelationsToQuery(queryBuilder, relations).limit(1).first();
    }

    queryBuilder(useLimit = false, useOffset = false, useSort = false)
    {
        let queryBuilder = this.rawModel.query();
        if(useLimit && 0 !== this.limit){
            queryBuilder.limit(this.limit)
        }
        if(useOffset && 0 !== this.offset){
            queryBuilder.offset(this.offset)
        }
        if(useSort && false !== this.sortBy && false !== this.sortDirection){
            queryBuilder.orderBy(this.sortBy, this.sortDirection)
        }
        return queryBuilder;
    }

    appendSingleFilter(queryBuilder, field, fieldValue, operator = null)
    {
        (null === operator) ? queryBuilder.where(field, fieldValue) : queryBuilder.where(field, operator, fieldValue);
        return queryBuilder;
    }

    appendFilters(queryBuilder, filters)
    {
        let filtersKeys = Object.keys(filters);
        if(0 === filtersKeys.length){
            return queryBuilder;
        }
        for(let i of filtersKeys){
            let filter = filters[i];
            sc.hasOwn(filter, 'operator')
                ? queryBuilder.where(i, filter.operator, filter.value)
                : queryBuilder.where(i, filter);
        }
        return queryBuilder;
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
