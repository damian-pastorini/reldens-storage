/**
 *
 * Reldens - KyselyDriver
 *
 */

const { QueryBuilderDriver } = require('../query-builder-driver');
const { sc } = require('@reldens/utils');

class KyselyDriver extends QueryBuilderDriver
{

    constructor(props)
    {
        super(props);
        this.db = sc.get(props, 'db', false);
        this.sql = sc.get(props, 'sql', false);
    }

    async insertRow(data)
    {
        let result = await this.db.insertInto(this.tableName()).values(data).executeTakeFirst();
        return Number(sc.get(result, 'insertId', 0) || 0);
    }

    selectRows(filters, options)
    {
        let query = this.db.selectFrom(this.tableName());
        query = 0 < options.select.length ? query.select(options.select) : query.selectAll();
        query = this.appendFilters(query, filters);
        if(0 < options.limit){
            query = query.limit(options.limit);
        }
        if(0 < options.offset){
            query = query.offset(options.offset);
        }
        if(options.sortBy && options.sortDirection){
            query = query.orderBy(options.sortBy, options.sortDirection.toLowerCase());
        }
        return query.execute();
    }

    async update(filters, updatePatch)
    {
        let query = this.appendFilters(this.db.updateTable(this.tableName()).set(updatePatch), filters);
        let result = await query.executeTakeFirst();
        return Number(sc.get(result, 'numUpdatedRows', 0));
    }

    async delete(filters = {})
    {
        let result = await this.appendFilters(this.db.deleteFrom(this.tableName()), filters).executeTakeFirst();
        return Number(sc.get(result, 'numDeletedRows', 0));
    }

    async count(filters = {})
    {
        let query = this.db.selectFrom(this.tableName()).select(builder => builder.fn.countAll().as('count'));
        let result = await this.appendFilters(query, filters).executeTakeFirst();
        if(!result){
            return 0;
        }
        return Number(result.count);
    }

    appendFilters(query, filters = {})
    {
        if(0 === Object.keys(filters).length){
            return query;
        }
        return query.where(builder => this.filtersExpression(builder, filters) || builder.lit(true));
    }

    filtersExpression(builder, filters)
    {
        let expressions = [];
        for(let key of Object.keys(filters)){
            expressions = this.appendExpression(builder, expressions, key, filters[key]);
        }
        if(0 === expressions.length){
            return null;
        }
        return builder.and(expressions);
    }

    appendExpression(builder, expressions, key, filter)
    {
        if(('AND' === key || 'OR' === key) && sc.isArray(filter)){
            return this.appendGroupExpression(builder, expressions, key, filter);
        }
        let operator = sc.get(filter, 'operator', '').toUpperCase();
        if('OR' === operator){
            return this.appendOrValueExpression(builder, expressions, key, filter);
        }
        if(operator){
            expressions.push(this.operatorExpression(builder, key, operator, filter));
            return expressions;
        }
        if(sc.hasOwn(this.relationsLoader.relationMappings, key) && sc.isObject(filter)){
            let mapping = this.relationsLoader.relationMappings[key];
            expressions.push(builder(mapping.from, 'in', this.relationSubQuery(builder, mapping, filter)));
            return expressions;
        }
        if(null === filter){
            expressions.push(builder(key, 'is', null));
            return expressions;
        }
        expressions.push(builder(key, '=', filter));
        return expressions;
    }

    appendGroupExpression(builder, expressions, key, conditions)
    {
        let nested = [];
        for(let condition of conditions){
            let expression = this.filtersExpression(builder, condition);
            if(expression){
                nested.push(expression);
            }
        }
        if(0 === nested.length){
            return expressions;
        }
        expressions.push('AND' === key ? builder.and(nested) : builder.or(nested));
        return expressions;
    }

    appendOrValueExpression(builder, expressions, key, filter)
    {
        let orExpression = builder(key, '=', filter.value);
        if(0 === expressions.length){
            return [orExpression];
        }
        return [builder.or([builder.and(expressions), orExpression])];
    }

    operatorExpression(builder, field, operator, filter)
    {
        if('IN' === operator){
            return builder(field, 'in', filter.value);
        }
        if('NOT' === operator){
            return builder.not(builder(field, '=', filter.value));
        }
        if('LIKE' === operator){
            return this.likeExpression(builder, field, filter.value);
        }
        return builder(field, sc.get(this.operatorsMap, operator, filter.operator), filter.value);
    }

    likeExpression(builder, field, value)
    {
        let likeValue = '%'+String(value).replace(/%/g, '')+'%';
        if(this.isJsonField(field)){
            return builder(builder.cast(field, 'char'), 'like', likeValue);
        }
        return builder(field, 'like', likeValue);
    }

    relationSubQuery(builder, mapping, nestedFilters)
    {
        let subQuery = builder.selectFrom(mapping.tableName).select(mapping.to);
        let relatedDriver = this.relationsLoader.relatedDriver(mapping);
        if(!relatedDriver){
            return subQuery;
        }
        let expression = relatedDriver.filtersExpression(builder, nestedFilters);
        if(!expression){
            return subQuery;
        }
        return subQuery.where(expression);
    }

}

module.exports.KyselyDriver = KyselyDriver;
