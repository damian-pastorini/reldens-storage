/**
 *
 * Reldens - MikroOrmDriver
 *
 */

const { BaseDriver } = require('../base-driver');
const { Logger, sc } = require('@reldens/utils');

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
        this.repository = this.orm.em.getRepository(this.rawModel);
    }

    databaseName()
    {
        return this.config.dbName || '';
    }

    id()
    {
        return this.rawModel.entity.name || this.name();
    }

    name()
    {
        return this.rawModel.entity.name || this.config.dbName;
    }

    tableName()
    {
        return this.rawModel.entity.name;
    }

    property(propertyName)
    {
        return this.rawModel[propertyName] || null;
    }

    getAllRelations()
    {
        if('function' !== typeof this.rawModel.entity.relationMappings){
            return [];
        }
        return Object.keys(this.rawModel.entity.relationMappings() || {});
    }

    async create(params)
    {
        let newInstance = await this.orm.em.create(this.rawModel, params);
        await this.orm.em.upsert(newInstance);
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

    async update(filters, updatePatch)
    {
        let processedFilters = this.processFilters(filters);
        let entities = await this.repository.find(processedFilters, this.queryBuilder(true, true, true));
        if(0 === entities.length){
            return false;
        }
        for(let entity of entities){
            Object.assign(entity, updatePatch);
            await this.orm.em.upsert(entity);
            await this.orm.em.flush();
        }
        return entities;
    }

    async updateBy(field, fieldValue, updatePatch, operator = null)
    {
        let filter = this.createSingleFilter(field, fieldValue, operator);
        let processedFilters = this.processFilters(filter);
        let entities = await this.repository.find(processedFilters, this.queryBuilder(true, true, true));
        if(0 === entities.length){
            return false;
        }
        for(let entity of entities){
            Object.assign(entity, updatePatch);
            await this.orm.em.upsert(entity);
            await this.orm.em.flush();
        }
        return entities;
    }

    updateById(id, params)
    {
        return this.update({id}, params);
    }

    async upsert(params, filters)
    {
        if(params.id){
            let patch = Object.assign({}, params);
            delete patch.id;
            return this.updateById(params.id, patch);
        }
        if(filters){
            let existent = await this.loadOne(filters);
            if(existent){
                return this.updateById(existent.id, params);
            }
        }
        return this.create(params);
    }

    async delete(filters = {})
    {
        let processedFilters = this.processFilters(filters);
        let entries = await this.repository.find(processedFilters);
        if(!entries){
            return false;
        }
        for(let entry of entries){
            await this.repository.nativeDelete(entry.id);
        }
    }

    deleteById(id)
    {
        return this.repository.nativeDelete(id);
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
        return this.repository.count(processedFilters);
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
        return this.loadBy('id', id);
    }

    async loadByIdWithRelations(id, relations)
    {
        if(!sc.isArray(relations) || 0 === relations.length){
            relations = this.getAllRelations();
        }
        let entity = await this.loadBy('id', id);
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
        let operatorsMap = {
            '=': value,
            '!=': {$ne: value},
            '>': {$gt: value},
            '>=': {$gte: value},
            '<': {$lt: value},
            '<=': {$lte: value},
            'IN': {$in: value},
            'NOT IN': {$nin: value}
        };
        return operatorsMap[upperOperator] || value;
    }

    handleLikeOperator(value, fieldName)
    {
        let cleanValue = String(value).replace(/%/g, '');
        if(this.isJsonField(fieldName)){
            return {$like: '%' + cleanValue + '%'};
        }
        return {$like: '%' + cleanValue + '%'};
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
        if(useSort && false !== this.sortBy && false !== this.sortDirection){
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

    async appendRelationsToCollection(entitiesCollection, relations)
    {
        if('function' !== typeof this.rawModel.entity.relationMappings){
            return entitiesCollection;
        }
        if(!sc.isArray(relations) || 0 === relations.length){
            relations = this.getAllRelations();
        }
        if(0 === relations.length){
            return entitiesCollection;
        }
        if(sc.isArray(entitiesCollection)){
            for(let entity of entitiesCollection){
                await this.appendRelatedEntities(entity, relations);
            }
        }
        if(!sc.isArray(entitiesCollection)){
            await this.appendRelatedEntities(entitiesCollection, relations);
        }
        return entitiesCollection;
    }

    async appendRelatedEntities(entity, relations)
    {
        if('function' !== typeof this.rawModel.entity.relationMappings){
            return entity;
        }
        let relationMappings = this.rawModel.entity.relationMappings();
        for(let i of relations){
            let relation = relationMappings[i];
            let relationRepository = this.server.getEntity(relation.entityName);
            let isManyToOne = 'm:1' === relation.reference;
            let isOneToMany = '1:m' === relation.reference;
            if(isManyToOne){
                entity[i] = await relationRepository.loadOneBy(relation.join.to, entity[relation.join.from]);
            }
            if(isOneToMany){
                entity[i] = await relationRepository.loadBy(relation.join.to, entity[relation.join.from]);
            }
        }
        return entity;
    }

    async createNested(newInstance, params, relations)
    {
        if('function' !== typeof this.rawModel.entity.relationMappings){
            return false;
        }
        let relationMappings = this.rawModel.entity.relationMappings();
        for(let i of Object.keys(relationMappings)){
            if(sc.isArray(relations) && 0 < relations.length && -1 === relations.indexOf(i)){
                continue;
            }
            let relation = relationMappings[i];
            let relationEntity = this.server.entityManager.get(relation.entityName).rawModel.entity;
            if(!relationEntity){
                Logger.warning('Factory not found for relation definition:', relation);
                continue;
            }
            let isArray = sc.isArray(params);
            if(!isArray){
                if(!sc.hasOwn(params, relation.join.from) || !params[relation.join.from]){
                    continue;
                }
                await this.createOne(params, i, relationEntity, newInstance, relation);
                continue;
            }
            if(isArray){
                await this.createMany(params, i, relationEntity, newInstance, relation);
            }
        }
    }

    async createOne(params, i, relationEntity, newInstance, relation)
    {
        params[i] = newInstance[relation.join.from];
        let nestedObject = relationEntity.createByProps(params[i]);
        await this.repository.persist(nestedObject).flush();
        await this.orm.em.flush();
        newInstance[i] = nestedObject;
    }

    async createMany(params, i, relationEntity, newInstance, relation)
    {
        let nestedArray = [];
        for(let objectData of params[i]){
            objectData[relation.join.to] = newInstance[relation.join.from];
            let nestedObject = relationEntity.createByProps(objectData);
            await this.repository.persist(nestedObject).flush();
            await this.orm.em.flush();
            nestedArray.push(nestedObject);
        }
        newInstance[i] = nestedArray;
    }

}

module.exports.MikroOrmDriver = MikroOrmDriver;
