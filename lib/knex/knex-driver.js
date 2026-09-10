/**
 *
 * Reldens - KnexDriver
 *
 */

const { QueryBuilderDriver } = require('../query-builder-driver');
const { sc } = require('@reldens/utils');

class KnexDriver extends QueryBuilderDriver
{

    constructor(props)
    {
        super(props);
        this.knex = sc.get(props, 'knex', false);
    }

    queryBuilder()
    {
        return this.knex(this.tableName());
    }

    async insertRow(data)
    {
        return (await this.queryBuilder().insert(data)).shift() || 0;
    }

    selectRows(filters, options)
    {
        let query = this.queryBuilder();
        this.appendFilters(query, filters);
        if(0 < options.select.length){
            query.select(...options.select);
        }
        if(0 < options.limit){
            query.limit(options.limit);
        }
        if(0 < options.offset){
            query.offset(options.offset);
        }
        if(options.sortBy && options.sortDirection){
            query.orderBy(options.sortBy, options.sortDirection);
        }
        return query;
    }

    update(filters, updatePatch)
    {
        return this.appendFilters(this.queryBuilder(), filters).update(updatePatch);
    }

    delete(filters = {})
    {
        return this.appendFilters(this.queryBuilder(), filters).delete();
    }

    async count(filters = {})
    {
        let result = await this.appendFilters(this.queryBuilder(), filters).count('* as count').first();
        if(!result){
            return 0;
        }
        return Number(result.count);
    }

    appendFilters(query, filters = {})
    {
        for(let key of Object.keys(filters)){
            this.appendFilter(query, key, filters[key]);
        }
        return query;
    }

    appendFilter(query, key, filter)
    {
        if('AND' === key && sc.isArray(filter)){
            this.appendAndConditions(query, filter);
            return;
        }
        if('OR' === key && sc.isArray(filter)){
            this.appendOrConditions(query, filter);
            return;
        }
        let operator = sc.get(filter, 'operator', '').toUpperCase();
        if(operator){
            this.appendOperatorFilter(query, key, operator, filter);
            return;
        }
        if(sc.hasOwn(this.relationsLoader.relationMappings, key) && sc.isObject(filter)){
            let mapping = this.relationsLoader.relationMappings[key];
            query.whereIn(mapping.from, this.relationSubQuery(mapping, filter));
            return;
        }
        query.where(key, filter);
    }

    appendAndConditions(query, conditions)
    {
        for(let condition of conditions){
            query.where(nestedQuery => this.appendFilters(nestedQuery, condition));
        }
    }

    appendOrConditions(query, conditions)
    {
        query.where(outerQuery => {
            for(let condition of conditions){
                outerQuery.orWhere(innerQuery => this.appendFilters(innerQuery, condition));
            }
        });
    }

    appendOperatorFilter(query, field, operator, filter)
    {
        if('OR' === operator){
            query.orWhere(field, filter.value);
            return;
        }
        if('IN' === operator){
            query.whereIn(field, filter.value);
            return;
        }
        if('NOT' === operator){
            query.whereNot(field, filter.value);
            return;
        }
        if('LIKE' === operator){
            this.appendLikeFilter(query, field, filter.value);
            return;
        }
        query.where(field, sc.get(this.operatorsMap, operator, filter.operator), filter.value);
    }

    appendLikeFilter(query, field, value)
    {
        let likeValue = '%'+String(value).replace(/%/g, '')+'%';
        if(this.isJsonField(field)){
            query.whereRaw('CAST(?? AS CHAR) LIKE ?', [field, likeValue]);
            return;
        }
        query.where(field, 'like', likeValue);
    }

    relationSubQuery(mapping, nestedFilters)
    {
        let subQuery = this.knex(mapping.tableName).select(mapping.to);
        let relatedDriver = this.relationsLoader.relatedDriver(mapping);
        if(!relatedDriver){
            return subQuery;
        }
        return relatedDriver.appendFilters(subQuery, nestedFilters);
    }

}

module.exports.KnexDriver = KnexDriver;
