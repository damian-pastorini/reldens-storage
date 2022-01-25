/**
 *
 * Reldens - MikroOrmDriver
 *
 */

const { BaseDriver } = require('../base-driver');
const { ErrorManager, sc } = require('@reldens/utils');

class MikroOrmDriver extends BaseDriver
{

    constructor(props)
    {
        super(props);
        if(!props.orm){
            ErrorManager.error('Missing ORM on Mikro ORM driver.');
        }
        if(!this.rawModel){
            ErrorManager.error('Missing raw entity on Mikro ORM driver.');
        }
        this.orm = props.orm;
        this.repository = this.orm.em.getRepository(this.rawModel.entity);
    }

    databaseName()
    {
        return this.config.dbName || '';
    }

    id()
    {
        return this.rawModel.entity || this.name();
    }

    name()
    {
        return this.rawModel.entity || this.config.dbName;
    }

    tableName()
    {
        return this.rawModel.entity;
    }

    property(propertyName)
    {
        return this.rawModel[propertyName] || null;
    }

    create(params)
    {
        return this.orm.em.create(this.rawModel, params);
    }

    createWithRelations(params, relations)
    {
        return this.create(params, relations);
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
        let queryBuilder = this.orm.em.getKnex();
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

    async appendRelationsToQuery(queryBuilder, relations)
    {
        if(!sc.isArray(relations) || 0 === relations.length){
            relations = Object.keys(this.rawModel.relationMappings || {});
        }
        if(0 < relations.length){
            let result = await queryBuilder;
            return this.orm.em.populate(result, relations);
        }
        return queryBuilder;
    }

}

module.exports.MikroOrmDriver = MikroOrmDriver;
