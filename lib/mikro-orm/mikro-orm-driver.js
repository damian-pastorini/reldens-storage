/**
 *
 * Reldens - MikroOrmDriver
 *
 */

const { BaseDriver } = require('../base-driver');
const { Logger, sc } = require('@reldens/utils');
const { Collection } = require('@mikro-orm/core');

class MikroOrmDriver extends BaseDriver
{

    constructor(props)
    {
        super(props);
        if(!props.orm){
            Logger.critical('Missing ORM on Mikro ORM driver.');
            return false;
        }
        if(!props.server){
            Logger.critical('Missing Server Driver on Mikro ORM driver.');
            return false;
        }
        if(!this.rawModel){
            Logger.critical('Missing raw entity on Mikro ORM driver.');
            return false;
        }
        this.orm = props.orm;
        this.server = props.server;
        this.entitySchema = (sc.isObject(this.rawModel) && sc.hasOwn(this.rawModel, 'schema')) ? this.rawModel.schema : this.rawModel;
        this.repository = this.orm.em.getRepository(this.entitySchema);
        this.mikroOrmOperators = {
            'GT': '$gt',
            'GTE': '$gte',
            'LT': '$lt',
            'LTE': '$lte',
            'NE': '$ne',
            'NOT': '$ne',
            'IN': '$in',
            'NOT IN': '$nin'
        };
        this.fkMappings = this.rawModel._fkMappings || this.entitySchema._fkMappings || {};
    }

    databaseName()
    {
        return this.config.dbName || '';
    }

    id()
    {
        return (this.rawModel.entity || this.rawModel).name || this.name();
    }

    name()
    {
        return (this.rawModel.entity || this.rawModel).name || this.config.dbName;
    }

    tableName()
    {
        return (this.rawModel.entity || this.rawModel).name;
    }

    property(propertyName)
    {
        return this.rawModel[propertyName] || null;
    }

    getAllRelations()
    {
        if(!this.entitySchema.meta || !this.entitySchema.meta.properties){
            return [];
        }
        let relations = [];
        for(let propName of Object.keys(this.entitySchema.meta.properties)){
            let prop = this.entitySchema.meta.properties[propName];
            if(prop.kind === 'm:1' || prop.kind === '1:m' || prop.kind === 'm:n'){
                relations.push(propName);
            }
        }
        return relations;
    }

    async create(params)
    {
        let transformed = this.transformFkToRelations(params);
        let newInstance = await this.orm.em.create(this.entitySchema, transformed);
        await this.orm.em.upsert(newInstance);
        await this.orm.em.flush();
        return newInstance;
    }

    async createWithRelations(params, relations)
    {
        if(!sc.isArray(relations) || 0 === relations.length){
            relations = this.getAllRelations();
        }
        let newInstance = await this.create(params);
        await this.createNested(newInstance, params, relations);
        return await this.appendRelationsToCollection(newInstance, relations);
    }

    async applyUpdateToEntities(processedFilters, updatePatch)
    {
        let entities = await this.repository.find(processedFilters, this.queryBuilder(true, true, true));
        if(0 === entities.length){
            return false;
        }
        let transformed = this.transformFkToRelations(updatePatch);
        for(let entity of entities){
            Object.assign(entity, transformed);
            await this.orm.em.upsert(entity);
            await this.orm.em.flush();
        }
        return entities;
    }

    async update(filters, updatePatch)
    {
        let processedFilters = this.processFilters(filters);
        return this.applyUpdateToEntities(processedFilters, updatePatch);
    }

    async updateBy(field, fieldValue, updatePatch, operator = null)
    {
        let filter = this.createSingleFilter(field, fieldValue, operator);
        let processedFilters = this.processFilters(filter);
        return this.applyUpdateToEntities(processedFilters, updatePatch);
    }

    async updateById(id, params)
    {
        let entities = await this.update({id}, params);
        if(!entities){
            return false;
        }
        if(1 < entities.length){
            Logger.warning('Multiple entities updated by ID: '+entities.map(e => e.id).join(', '));
        }
        return entities.shift();
    }

    async upsert(params, filters)
    {
        if(params.id){
            let existent = await this.loadById(params.id);
            if(existent){
                let patch = Object.assign({}, params);
                delete patch.id;
                return this.updateById(params.id, patch);
            }
        }
        if(filters){
            let existent = await this.loadOne(filters);
            if(existent){
                let transformed = this.transformFkToRelations(params);
                return this.updateById(existent.id, transformed);
            }
        }
        return this.create(params);
    }

    async delete(filters = {})
    {
        let processedFilters = this.processFilters(filters);
        let entries = await this.repository.find(processedFilters);
        if(!entries || 0 === entries.length){
            return false;
        }
        for(let entry of entries){
            await this.orm.em.remove(entry);
        }
        await this.orm.em.flush();
        return true;
    }

    async deleteById(id)
    {
        let entity = await this.loadById(id);
        if(!entity){
            return false;
        }
        await this.orm.em.remove(entity);
        await this.orm.em.flush();
        return true;
    }

    async count(filters)
    {
        let processedFilters = this.processFilters(filters);
        return this.repository.count(processedFilters);
    }

    async countWithRelations(filters, relations)
    {
        if(!sc.isArray(relations) || 0 === relations.length){
            relations = this.getAllRelations();
        }
        let processedFilters = this.processFilters(filters);
        if(0 === relations.length || !this.entitySchema.meta || !this.entitySchema.meta.properties){
            return this.repository.count(processedFilters);
        }
        let queryBuilder = this.orm.em.createQueryBuilder(this.entitySchema);
        let properties = this.entitySchema.meta.properties;
        let aliasCounter = 0;
        for(let relationName of relations){
            let prop = properties[relationName];
            if(!prop || !prop.kind || (prop.kind !== 'm:1' && prop.kind !== '1:m')){
                continue;
            }
            let relationDriver = this.server.entityManager.get(prop.entity);
            if(!relationDriver || !relationDriver.entitySchema){
                continue;
            }
            let alias = 'rel_'+aliasCounter;
            if('m:1' === prop.kind && prop.joinColumn){
                queryBuilder.leftJoin(relationName, alias, 'e.'+prop.joinColumn+' = '+alias+'.id');
            }
            if('1:m' === prop.kind && prop.mappedBy){
                let mappedProp = relationDriver.entitySchema.meta.properties[prop.mappedBy];
                if(mappedProp && mappedProp.joinColumn){
                    queryBuilder.leftJoin(relationName, alias, 'e.id = '+alias+'.'+mappedProp.joinColumn);
                }
            }
            aliasCounter++;
        }
        if(sc.isObject(processedFilters) && 0 < Object.keys(processedFilters).length){
            queryBuilder.where(processedFilters);
        }
        return queryBuilder.getCount();
    }

    loadAll()
    {
        return this.repository.findAll();
    }

    async loadAllWithRelations(relations)
    {
        if(!sc.isArray(relations) || 0 === relations.length){
            relations = this.getAllRelations();
        }
        let entities = await this.loadAll();
        return await this.appendRelationsToCollection(entities, relations);
    }

    load(filters)
    {
        let processedFilters = this.processFilters(filters);
        return this.repository.find(processedFilters, this.queryBuilder(true, true, true));
    }

    async loadWithRelations(filters, relations)
    {
        if(!sc.isArray(relations) || 0 === relations.length){
            relations = this.getAllRelations();
        }
        let processedFilters = this.processFilters(filters);
        let entitiesCollection = await this.repository.find(processedFilters, this.queryBuilder(true, true, true));
        return await this.appendRelationsToCollection(entitiesCollection, relations);
    }

    loadBy(field, fieldValue, operator = null)
    {
        let filter = this.createSingleFilter(field, fieldValue, operator);
        let processedFilters = this.processFilters(filter);
        return this.repository.find(processedFilters, this.queryBuilder(true, true, true));
    }

    async loadByWithRelations(field, fieldValue, relations, operator = null)
    {
        if(!sc.isArray(relations) || 0 === relations.length){
            relations = this.getAllRelations();
        }
        let filter = this.createSingleFilter(field, fieldValue, operator);
        let processedFilters = this.processFilters(filter);
        let entitiesCollection = await this.repository.find(processedFilters, this.queryBuilder(true, true, true));
        return await this.appendRelationsToCollection(entitiesCollection, relations);
    }

    loadById(id)
    {
        return this.loadOneBy('id', id);
    }

    async loadByIdWithRelations(id, relations)
    {
        if(!sc.isArray(relations) || 0 === relations.length){
            relations = this.getAllRelations();
        }
        let entity = await this.loadOneBy('id', id);
        return await this.appendRelationsToCollection(entity, relations);
    }

    loadByIds(ids)
    {
        let processedFilters = this.processFilters({id: {$in: ids}});
        return this.repository.find(processedFilters);
    }

    loadOne(filters)
    {
        let processedFilters = this.processFilters(filters);
        return this.repository.findOne(processedFilters, this.queryBuilder(false, true, true));
    }

    async loadOneWithRelations(filters, relations)
    {
        if(!sc.isArray(relations) || 0 === relations.length){
            relations = this.getAllRelations();
        }
        let processedFilters = this.processFilters(filters);
        let entitiesCollection = await this.repository.findOne(processedFilters, this.queryBuilder(false, true, true));
        return this.appendRelationsToCollection(entitiesCollection, relations);
    }

    loadOneBy(field, fieldValue, operator = null)
    {
        let filter = this.createSingleFilter(field, fieldValue, operator);
        let processedFilters = this.processFilters(filter);
        return this.repository.findOne(processedFilters, this.queryBuilder(false, true, true));
    }

    async loadOneByWithRelations(field, fieldValue, relations, operator = null)
    {
        if(!sc.isArray(relations) || 0 === relations.length){
            relations = this.getAllRelations();
        }
        let filter = this.createSingleFilter(field, fieldValue, operator);
        let processedFilters = this.processFilters(filter);
        let entitiesCollection = await this.repository.findOne(processedFilters, this.queryBuilder(false, true, true));
        return this.appendRelationsToCollection(entitiesCollection, relations);
    }

    processFilters(filters)
    {
        if(!sc.isObject(filters)){
            return filters;
        }
        let processedFilters = {};
        for(let key of Object.keys(filters)){
            let value = filters[key];
            if('AND' === key && sc.isArray(value)){
                processedFilters.$and = value.map(condition => this.processFilters(condition));
                continue;
            }
            if('OR' === key && sc.isArray(value)){
                processedFilters.$or = value.map(condition => this.processFilters(condition));
                continue;
            }
            if(sc.hasOwn(value, 'operator') && sc.hasOwn(value, 'value')){
                processedFilters[key] = this.applyOperator(value.value, value.operator, key);
                continue;
            }
            if(sc.isObject(value) && !sc.isArray(value)){
                processedFilters[key] = this.processFilters(value);
                continue;
            }
            processedFilters[key] = value;
        }
        return processedFilters;
    }

    applyOperator(value, operator, fieldName = null)
    {
        let upperOperator = operator ? operator.toUpperCase() : '';
        if('LIKE' === upperOperator){
            return this.handleLikeOperator(value, fieldName);
        }
        if('EQ' === upperOperator){
            return value;
        }
        if(sc.hasOwn(this.mikroOrmOperators, upperOperator)){
            return {[this.mikroOrmOperators[upperOperator]]: value};
        }
        return value;
    }

    handleLikeOperator(value, fieldName)
    {
        let cleanValue = String(value).replace(/%/g, '');
        if(this.isJsonField(fieldName)){
            return {$like: '%'+cleanValue+'%'};
        }
        return {$like: '%'+cleanValue+'%'};
    }

    queryBuilder(useLimit = false, useOffset = false, useSort = false)
    {
        let queryBuilder = {};
        if(0 < this.select.length){
            queryBuilder.select = this.select;
        }
        if(useLimit && 0 !== this.limit){
            queryBuilder.limit = this.limit;
        }
        if(useOffset && 0 !== this.offset){
            queryBuilder.offset = this.offset;
        }
        if(useSort && this.sortBy && this.sortDirection){
            queryBuilder.orderBy = {
                [this.sortBy]: this.sortDirection,
            };
        }
        return queryBuilder;
    }

    createSingleFilter(field, fieldValue, operator = null)
    {
        let filter = {};
        if(null === operator) {
            filter[field] = fieldValue;
            return filter;
        }
        filter[field] = {operator, value: fieldValue};
        return filter;
    }

    convertCollectionsToArrays(entity)
    {
        if(!entity){
            return entity;
        }
        for(let key of Object.keys(entity)){
            if(entity[key] && entity[key] instanceof Collection){
                entity[key] = entity[key].getItems();
            }
        }
        return entity;
    }

    addFkFieldsFromRelations(entity)
    {
        if(!entity){
            return entity;
        }
        for(let fkColumn of Object.keys(this.fkMappings)){
            let mapping = this.fkMappings[fkColumn];
            let relation = entity[mapping.relationKey];
            if(!relation){
                continue;
            }
            if(sc.hasOwn(relation, mapping.referencedColumn)){
                entity[fkColumn] = relation[mapping.referencedColumn];
                continue;
            }
            if(sc.hasOwn(relation, 'id')){
                entity[fkColumn] = relation.id;
            }
        }
        return entity;
    }

    async appendRelationsToCollection(entitiesCollection, relations)
    {
        if(!relations || 0 === relations.length){
            return entitiesCollection;
        }
        if(!entitiesCollection){
            return entitiesCollection;
        }
        await this.orm.em.populate(entitiesCollection, relations);
        if(sc.isArray(entitiesCollection)){
            for(let entity of entitiesCollection){
                this.convertCollectionsToArrays(entity);
            }
            return entitiesCollection;
        }
        return this.convertCollectionsToArrays(entitiesCollection);
    }

    async createNested(newInstance, params, relations)
    {
        if(!this.entitySchema.meta || !this.entitySchema.meta.properties){
            return false;
        }
        let properties = this.entitySchema.meta.properties;
        for(let relationName of Object.keys(properties)){
            let prop = properties[relationName];
            if(!prop.kind || (prop.kind !== 'm:1' && prop.kind !== '1:m')){
                continue;
            }
            if(sc.isArray(relations) && 0 < relations.length && -1 === relations.indexOf(relationName)){
                continue;
            }
            let relationDriver = this.server.entityManager.get(prop.entity);
            if(!relationDriver){
                Logger.warning('Entity not found for relation:', prop.entity);
                continue;
            }
            let isOneToMany = '1:m' === prop.kind;
            let isManyToOne = 'm:1' === prop.kind;
            if(isManyToOne && sc.hasOwn(params, relationName)){
                await this.createOne(params, relationName, relationDriver, newInstance, prop);
                continue;
            }
            if(isOneToMany && sc.hasOwn(params, relationName) && sc.isArray(params[relationName])){
                await this.createMany(params, relationName, relationDriver, newInstance, prop);
            }
        }
    }

    async createOne(params, relationName, relationDriver, newInstance, prop)
    {
        let nestedData = params[relationName];
        if(prop.joinColumn){
            nestedData[prop.joinColumn] = newInstance.id;
        }
        let nestedObject = await relationDriver.create(nestedData);
        await this.orm.em.flush();
        newInstance[relationName] = nestedObject;
    }

    async createMany(params, relationName, relationDriver, newInstance, prop)
    {
        let nestedArray = [];
        for(let objectData of params[relationName]){
            if(prop.joinColumn){
                objectData[prop.joinColumn] = newInstance.id;
            }
            let nestedObject = await relationDriver.create(objectData);
            await this.orm.em.flush();
            nestedArray.push(nestedObject);
        }
        newInstance[relationName] = nestedArray;
    }

    transformFkToRelations(params)
    {
        if(!params || 'object' !== typeof params){
            return params;
        }
        let transformed = {...params};
        for(let fkColumn of Object.keys(this.fkMappings)){
            if(!sc.hasOwn(params, fkColumn) || null === params[fkColumn]){
                continue;
            }
            let mapping = this.fkMappings[fkColumn];
            transformed[mapping.relationKey] = this.orm.em.getReference(mapping.entityName, params[fkColumn]);
            delete transformed[fkColumn];
        }
        return transformed;
    }

}

module.exports.MikroOrmDriver = MikroOrmDriver;
