/**
 *
 * Reldens - DrizzleDriver
 *
 */

const { QueryBuilderDriver } = require('../query-builder-driver');
const { Logger, sc } = require('@reldens/utils');

class DrizzleDriver extends QueryBuilderDriver
{

    constructor(props)
    {
        super(props);
        this.db = sc.get(props, 'db', false);
        this.orm = sc.get(props, 'orm', false);
        this.table = sc.get(this.rawModel, 'table', false);
        this.comparisonFunctions = {'=': 'eq', '!=': 'ne', '>': 'gt', '>=': 'gte', '<': 'lt', '<=': 'lte'};
    }

    column(field)
    {
        let column = sc.get(this.table, field, false);
        if(!column){
            Logger.error('Column "'+field+'" not defined on table "'+this.tableName()+'".');
        }
        return column;
    }

    prepareData(data)
    {
        let prepared = Object.assign({}, data);
        for(let key of Object.keys(prepared)){
            if(!sc.isString(prepared[key])){
                continue;
            }
            if('json' !== sc.get(this.column(key), 'dataType', '')){
                continue;
            }
            prepared[key] = sc.parseJson(prepared[key]);
        }
        return prepared;
    }

    async insertRow(data)
    {
        return Number(sc.get((await this.db.insert(this.table).values(this.prepareData(data))).shift(), 'insertId', 0));
    }

    selectRows(filters, options)
    {
        let query = 0 < options.select.length
            ? this.db.select(this.selectedColumns(options.select))
            : this.db.select();
        query = this.appendCondition(query.from(this.table), filters);
        if(0 < options.limit){
            query = query.limit(options.limit);
        }
        if(0 < options.offset){
            query = query.offset(options.offset);
        }
        if(options.sortBy && options.sortDirection){
            query = query.orderBy(this.orderByExpression(options));
        }
        return query;
    }

    orderByExpression(options)
    {
        if('DESC' === options.sortDirection.toUpperCase()){
            return this.orm.desc(this.column(options.sortBy));
        }
        return this.orm.asc(this.column(options.sortBy));
    }

    selectedColumns(select)
    {
        let columns = {};
        for(let field of select){
            columns[field] = this.column(field);
        }
        return columns;
    }

    appendCondition(query, filters)
    {
        let condition = this.filtersCondition(filters);
        if(!condition){
            return query;
        }
        return query.where(condition);
    }

    async update(filters, updatePatch)
    {
        let query = this.db.update(this.table).set(this.prepareData(updatePatch));
        return Number(sc.get((await this.appendCondition(query, filters)).shift(), 'affectedRows', 0));
    }

    async delete(filters = {})
    {
        let deleteResult = await this.appendCondition(this.db.delete(this.table), filters);
        return Number(sc.get(deleteResult.shift(), 'affectedRows', 0));
    }

    async count(filters = {})
    {
        let query = this.db.select({count: this.orm.count()}).from(this.table);
        let rows = await this.appendCondition(query, filters);
        let firstRow = rows.shift();
        if(!firstRow){
            return 0;
        }
        return Number(firstRow.count);
    }

    filtersCondition(filters = {})
    {
        let conditions = [];
        for(let key of Object.keys(filters)){
            conditions = this.appendFilterCondition(conditions, key, filters[key]);
        }
        if(0 === conditions.length){
            return null;
        }
        return this.orm.and(...conditions);
    }

    appendFilterCondition(conditions, key, filter)
    {
        if(('AND' === key || 'OR' === key) && sc.isArray(filter)){
            return this.appendGroupCondition(conditions, key, filter);
        }
        let operator = sc.get(filter, 'operator', '').toUpperCase();
        if('OR' === operator){
            return this.appendOrValueCondition(conditions, key, filter);
        }
        if(operator){
            conditions.push(this.operatorCondition(key, operator, filter));
            return conditions;
        }
        if(sc.hasOwn(this.relationsLoader.relationMappings, key) && sc.isObject(filter)){
            let mapping = this.relationsLoader.relationMappings[key];
            conditions.push(this.orm.inArray(this.column(mapping.from), this.relationSubQuery(mapping, filter)));
            return conditions;
        }
        if(null === filter){
            conditions.push(this.orm.isNull(this.column(key)));
            return conditions;
        }
        conditions.push(this.orm.eq(this.column(key), filter));
        return conditions;
    }

    appendGroupCondition(conditions, key, group)
    {
        let nested = [];
        for(let condition of group){
            let nestedCondition = this.filtersCondition(condition);
            if(nestedCondition){
                nested.push(nestedCondition);
            }
        }
        if(0 === nested.length){
            return conditions;
        }
        conditions.push('AND' === key ? this.orm.and(...nested) : this.orm.or(...nested));
        return conditions;
    }

    appendOrValueCondition(conditions, key, filter)
    {
        let orCondition = this.orm.eq(this.column(key), filter.value);
        if(0 === conditions.length){
            return [orCondition];
        }
        return [this.orm.or(this.orm.and(...conditions), orCondition)];
    }

    operatorCondition(field, operator, filter)
    {
        let column = this.column(field);
        if('IN' === operator){
            return this.orm.inArray(column, filter.value);
        }
        if('NOT' === operator){
            return this.orm.not(this.orm.eq(column, filter.value));
        }
        if('LIKE' === operator){
            return this.likeCondition(column, field, filter.value);
        }
        let sqlOperator = sc.get(this.operatorsMap, operator, filter.operator);
        let comparisonFunction = sc.get(this.comparisonFunctions, sqlOperator, false);
        if(!comparisonFunction){
            Logger.error('Unsupported operator "'+filter.operator+'" on Drizzle driver, "=" used instead.');
            return this.orm.eq(column, filter.value);
        }
        return this.orm[comparisonFunction](column, filter.value);
    }

    likeCondition(column, field, value)
    {
        let likeValue = '%'+String(value).replace(/%/g, '')+'%';
        if(this.isJsonField(field)){
            let castExpression = 'CAST(`'+this.tableName()+'`.`'+field+'` AS CHAR)';
            return this.orm.like(this.orm.sql.raw(castExpression), likeValue);
        }
        return this.orm.like(column, likeValue);
    }

    relationSubQuery(mapping, nestedFilters)
    {
        let relatedDriver = this.relationsLoader.relatedDriver(mapping);
        if(!relatedDriver){
            return [];
        }
        let subQuery = this.db.select({value: relatedDriver.column(mapping.to)}).from(relatedDriver.table);
        let condition = relatedDriver.filtersCondition(nestedFilters);
        if(!condition){
            return subQuery;
        }
        return subQuery.where(condition);
    }

}

module.exports.DrizzleDriver = DrizzleDriver;
