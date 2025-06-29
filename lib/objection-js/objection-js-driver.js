/**
 *
 * Reldens - ObjectionJsDriver
 *
 */

const { BaseDriver } = require('../base-driver');
const { sc } = require('@reldens/utils');

class ObjectionJsDriver extends BaseDriver
{

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

    property(propertyName)
    {
        return this.rawModel[propertyName] || null;
    }

    isJsonField(fieldName)
    {
        if(!this.server || !this.server.entitiesConfig || !this.rawName){
            return false;
        }
        let entityConfig = sc.get(this.server.entitiesConfig, this.rawName, {});
        let properties = sc.get(entityConfig, 'properties', {});
        let fieldConfig = sc.get(properties, fieldName, {});
        let fieldType = sc.get(fieldConfig, 'type', '');
        return 'json' === fieldType.toLowerCase();
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

    async upsert(params, filters)
    {
        if(params.id){
            let patch = Object.assign({}, params);
            delete patch.id;
            return this.queryBuilder().patchAndFetchById(params.id, patch).onConflict().merge();
        }
        if(filters){
            let existent = await this.loadOne(filters);
            if(existent){
                return this.queryBuilder().patchAndFetchById(existent.id, params).onConflict().merge();
            }
        }
        return this.create(params);
    }

    delete(filters)
    {
        let queryBuilder = this.queryBuilder(true, true, true);
        return this.appendFilters(queryBuilder, filters).delete();
    }

    deleteById(id)
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
        if(0 < this.select.length){
            queryBuilder.select(...this.select);
        }
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
        if(null === operator){
            queryBuilder.where(field, fieldValue);
            return queryBuilder;
        }
        if('LIKE' === operator.toUpperCase()){
            this.handleLikeFilter(queryBuilder, field, fieldValue);
            return queryBuilder;
        }
        queryBuilder.where(field, operator, fieldValue);
        return queryBuilder;
    }

    handleLikeFilter(queryBuilder, field, fieldValue)
    {
        let cleanValue = String(fieldValue).replace(/%/g, '');
        if(this.isJsonField(field)){
            let { ref } = this.rawModel.knex();
            queryBuilder.where(ref(field).castText(), 'like', '%' + cleanValue + '%');
            return;
        }
        queryBuilder.where(field, 'like', '%' + cleanValue + '%');
    }

    appendFilters(queryBuilder, filters = {})
    {
        let filtersKeys = Object.keys(filters);
        if(0 === filtersKeys.length){
            return queryBuilder;
        }
        for(let i of filtersKeys){
            let filter = filters[i];
            if('OR' === i && sc.isArray(filter)){
                queryBuilder.where(function(){
                    for(let condition of filter){
                        this.orWhere(function(){
                            this.appendFilters(this, condition);
                        }.bind(this));
                    }
                }.bind(this));
                continue;
            }
            let filterOperator = sc.get(filter, 'operator');
            if(filterOperator){
                if('OR' === filterOperator){
                    queryBuilder.orWhere(i, filter.value);
                    continue;
                }
                if('IN' === filterOperator){
                    queryBuilder.whereIn(i, filter.value);
                    continue;
                }
                if('NOT' === filterOperator){
                    queryBuilder.whereNot(i, filter.value);
                    continue;
                }
                if('LIKE' === filterOperator){
                    this.handleLikeFilter(queryBuilder, i, filter.value);
                    continue;
                }
                queryBuilder.where(i, filter.operator, filter.value);
                continue;
            }
            queryBuilder.where(i, filter);
        }
        return queryBuilder;
    }

    appendRelationsToQuery(queryBuilder, relations, relationsModifiers)
    {
        if(!sc.isArray(relations) || 0 === relations.length){
            relations = Object.keys(this.rawModel.relationMappings || {});
        }
        if(0 < relations.length){
            queryBuilder.withGraphFetched('['+relations.join(',')+']');
        }
        this.appendRelationsModifiers(queryBuilder, relations, relationsModifiers);
        return queryBuilder;
    }

    appendRelationsModifiers(queryBuilder, relations, relationsModifiers)
    {
        if(!sc.isArray(relationsModifiers)){
            return queryBuilder;
        }
        for(let relationModifier of relationsModifiers){
            let relationKey = sc.get(relationModifier, 'key');
            if(!relationKey){
                continue;
            }
            if(-1 === relations.indexOf(relationKey)){
                continue;
            }
            let relationOrderBy = sc.get(relationModifier, 'orderBy', {});
            let relationOrderByField = sc.get(relationOrderBy, 'field', {});
            let relationLimit = sc.get(relationModifier, 'limit');
            if(!relationOrderByField && !relationLimit){
                continue;
            }
            queryBuilder.modifyGraph(relationKey, builder => {
                if(relationOrderByField) {
                    builder.orderBy(relationOrderByField, sc.get(relationOrderBy, 'direction', 'desc'));
                }
                if(relationLimit){
                    builder.limit(relationLimit);
                }
            });
        }
        return queryBuilder;
    }
}

module.exports.ObjectionJsDriver = ObjectionJsDriver;
