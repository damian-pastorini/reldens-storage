/**
 *
 * Reldens - QueryBuilderDriver
 *
 */

const { BaseDriver } = require('./base-driver');
const { RelationsLoader } = require('./relations-loader');
const { ErrorManager, sc } = require('@reldens/utils');

class QueryBuilderDriver extends BaseDriver
{

    constructor(props)
    {
        super(props);
        this.server = sc.get(props, 'server', false);
        this.relationsLoader = new RelationsLoader({driver: this, server: this.server});
    }

    databaseName()
    {
        return sc.get(this.config, 'database', '');
    }

    id()
    {
        return this.rawId || this.rawModel.tableName;
    }

    name()
    {
        return this.rawName || this.rawModel.tableName;
    }

    tableName()
    {
        return this.rawModel.tableName;
    }

    idColumn()
    {
        return sc.get(this.rawModel, 'idColumn', 'id');
    }

    property(propertyName)
    {
        return this.rawModel[propertyName] || null;
    }

    insertRow(data)
    {
        ErrorManager.error('QueryBuilderDriver insertRow() not implemented.');
    }

    selectRows(filters, options)
    {
        ErrorManager.error('QueryBuilderDriver selectRows() not implemented.');
    }

    selectOptions(useLimit)
    {
        return {
            select: this.select,
            limit: useLimit ? this.limit : 0,
            offset: this.offset,
            sortBy: this.sortBy,
            sortDirection: this.sortDirection
        };
    }

    createSingleFilter(field, fieldValue, operator = null)
    {
        if(null === operator){
            return {[field]: fieldValue};
        }
        return {[field]: {operator, value: fieldValue}};
    }

    async create(params)
    {
        let insertId = await this.insertRow(params);
        let createdId = insertId ? insertId : sc.get(params, this.idColumn(), false);
        if(!createdId){
            return false;
        }
        return await this.loadById(createdId);
    }

    createWithRelations(params, relations)
    {
        return this.relationsLoader.createWithRelations(params, relations);
    }

    updateBy(field, fieldValue, updatePatch, operator = null)
    {
        return this.update(this.createSingleFilter(field, fieldValue, operator), updatePatch);
    }

    async updateById(id, params)
    {
        await this.update({[this.idColumn()]: id}, params);
        return await this.loadById(id);
    }

    async upsert(params, filters)
    {
        let idColumn = this.idColumn();
        let providedId = sc.get(params, idColumn, false);
        if(providedId){
            let existentById = await this.loadById(providedId);
            if(existentById){
                return await this.updateById(providedId, params);
            }
        }
        if(filters){
            let existent = await this.loadOne(filters);
            if(existent){
                return await this.updateById(existent[idColumn], params);
            }
        }
        return await this.create(params);
    }

    deleteById(id)
    {
        return this.delete({[this.idColumn()]: id});
    }

    countWithRelations(filters, relations)
    {
        return this.count(filters);
    }

    loadAll()
    {
        return this.selectRows({}, this.selectOptions(true));
    }

    load(filters = {})
    {
        return this.selectRows(filters, this.selectOptions(true));
    }

    async loadOne(filters)
    {
        let options = this.selectOptions(false);
        options.limit = 1;
        let rows = await this.selectRows(filters, options);
        return rows.shift() || null;
    }

    loadBy(field, fieldValue, operator = null)
    {
        return this.load(this.createSingleFilter(field, fieldValue, operator));
    }

    loadOneBy(field, fieldValue, operator = null)
    {
        return this.loadOne(this.createSingleFilter(field, fieldValue, operator));
    }

    loadById(id)
    {
        return this.loadOne({[this.idColumn()]: id});
    }

    loadByIds(ids)
    {
        return this.load({[this.idColumn()]: {operator: 'IN', value: ids}});
    }

    async loadAllWithRelations(relations)
    {
        return await this.relationsLoader.populate(await this.loadAll(), relations);
    }

    async loadWithRelations(filters, relations)
    {
        return await this.relationsLoader.populate(await this.load(filters), relations);
    }

    async loadByWithRelations(field, fieldValue, relations, operator = null)
    {
        return await this.relationsLoader.populate(await this.loadBy(field, fieldValue, operator), relations);
    }

    async loadByIdWithRelations(id, relations)
    {
        return await this.relationsLoader.populate(await this.loadById(id), relations);
    }

    async loadOneWithRelations(filters, relations)
    {
        return await this.relationsLoader.populate(await this.loadOne(filters), relations);
    }

    async loadOneByWithRelations(field, fieldValue, relations, operator = null)
    {
        return await this.relationsLoader.populate(await this.loadOneBy(field, fieldValue, operator), relations);
    }

    rawQuery(content)
    {
        return this.server.rawQuery(content);
    }

}

module.exports.QueryBuilderDriver = QueryBuilderDriver;
