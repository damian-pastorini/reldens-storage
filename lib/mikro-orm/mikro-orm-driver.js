/**
 *
 * Reldens - MikroOrmDriver
 *
 */

const { BaseDriver } = require('../base-driver');
const { ErrorManager, Logger, sc } = require('@reldens/utils');

class MikroOrmDriver extends BaseDriver
{

    constructor(props)
    {
        super(props);
        if(!props.orm){
            ErrorManager.error('Missing ORM on Mikro ORM driver.');
        }
        if(!props.server){
            ErrorManager.error('Missing Server Driver on Mikro ORM driver.');
        }
        if(!this.rawModel){
            ErrorManager.error('Missing raw entity on Mikro ORM driver.');
        }
        this.orm = props.orm;
        this.server = props.server;
        this.repository = this.orm.em.getRepository(this.rawModel.entity);
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

    async create(params)
    {
        let newInstance = this.rawModel.entity.createByProps(params);
        await this.repository.persist(newInstance).flush();
        return newInstance;
    }

    async createWithRelations(params, relations)
    {
        let newInstance = await this.create(params, relations);
        await this.createNested(newInstance, params);
        return newInstance;
    }

    async update(filters, updatePatch)
    {
        let entities = await this.repository.find(filters, this.queryBuilder(true, true, true));
        if(0 === entities.length){
            return false;
        }
        for(let entity of entities){
            Object.assign(entity, updatePatch);
            this.repository.persist(entity).flush();
        }
        return entities;
    }

    async updateBy(field, fieldValue, updatePatch, operator = null)
    {
        let filter = this.createSingleFilter(field, fieldValue, operator);
        let entities = await this.repository.find(filter, this.queryBuilder(true, true, true));
        if(0 === entities.length){
            return false;
        }
        for(let entity of entities){
            Object.assign(entity, updatePatch);
            this.repository.persist(entity).flush();
        }
        return entities;
    }

    updateById(id, params)
    {
        return this.update({id}, params);
    }

    async delete(filters = {})
    {
        let entries = await this.load(filters);
        if (!entries){
            return false;
        }
        for(let entry of Object.keys(entries)){
            await this.repository.nativeDelete(entry.id);
        }
    }

    deleteById(id)
    {
        return this.repository.nativeDelete(id);
    }

    async count(filters)
    {
        return this.repository.count(filters);
    }

    async countWithRelations(filters, relations)
    {
        // @TODO - BETA - Look a way to filter by sub-entities properties before count.
        return this.count(filters);
    }

    loadAll()
    {
        return this.repository.findAll();
    }

    async loadAllWithRelations(relations)
    {
        let entities = await this.repository.find(filter, this.queryBuilder(true, true, true));
        return await this.appendRelationsToCollection(entities, relations);
    }

    load(filters)
    {
        return this.repository.find(filters, this.queryBuilder(true, true, true));
    }

    async loadWithRelations(filters, relations)
    {
        let entitiesCollection = await this.repository.findAll(filters, this.queryBuilder(true, true, true));
        return await this.appendRelationsToCollection(entitiesCollection, relations);
    }

    loadBy(field, fieldValue, operator = null)
    {
        let filter = this.createSingleFilter(field, fieldValue, operator);
        return this.repository.find(filter, this.queryBuilder(true, true, true));
    }

    async loadByWithRelations(field, fieldValue, relations, operator = null)
    {
        let filter = this.createSingleFilter(field, fieldValue, operator);
        let entitiesCollection = await this.repository.find(filter, this.queryBuilder(true, true, true));
        return await this.appendRelationsToCollection(entitiesCollection, relations);
    }

    loadById(id)
    {
        return this.loadBy({id});
    }

    async loadByIdWithRelations(id, relations)
    {
        let entity = await this.loadBy({id});
        return await this.appendRelationsToCollection(entity, relations);
    }

    loadByIds(ids)
    {
        this.repository.find({id: {$in: ids}});
    }

    loadOne(filters)
    {
        return this.repository.findOne(filters, this.queryBuilder(false, true, true));
    }

    async loadOneWithRelations(filters, relations)
    {
        let entitiesCollection = await this.loadOne(filters);
        return this.appendRelationsToCollection(entitiesCollection, relations);
    }

    loadOneBy(field, fieldValue, operator = null)
    {
        let filter = this.createSingleFilter(field, fieldValue, operator);
        return this.repository.findOne(filter, this.queryBuilder(false, true, true));
    }

    async loadOneByWithRelations(field, fieldValue, relations, operator = null)
    {
        let filter = this.createSingleFilter(field, fieldValue, operator);
        let entitiesCollection = await this.repository.findOne(filter, this.queryBuilder(false, true, true));
        return this.appendRelationsToCollection(entitiesCollection, relations);
    }

    queryBuilder(useLimit = false, useOffset = false, useSort = false)
    {
        let queryBuilder = {};
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
        filter[field] = {};
        filter[field][operator] = fieldValue;
        return filter;
    }

    async appendRelationsToCollection(entitiesCollection, relations)
    {
        // @TODO - BETA - Refactor. I would like to use populate but it may not work if the driver is not Mongo DB.
        if(typeof this.rawModel.entity.relationsMappings !== 'function'){
            return false;
        }
        if(!sc.isArray(relations) || 0 === relations.length){
            relations = Object.keys(this.rawModel.entity.relationsMappings() || {});
        }
        if(0 === relations.length){
            return entitiesCollection;
        }
        for(let entity of entitiesCollection){
            await this.appendRelatedEntities(entity, relations);
        }
        return entitiesCollection;
    }

    async appendRelatedEntities(entity, relations)
    {
        // @TODO - BETA - Refactor and improve.
        if(typeof this.rawModel.entity.relationsMappings !== 'function'){
            return false;
        }
        let relationsMappings = typeof this.rawModel.entity.relationsMappings();
        for(let i of relations){
            let relation = relationsMappings[i];
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
    }

    async createNested(newInstance, params)
    {
        if(typeof this.rawModel.entity.relationsMappings !== 'function'){
            return false;
        }
        let relationsMappings = this.rawModel.entity.relationsMappings();
        for(let i of Object.keys(relationsMappings)){
            // @TODO - BETA - Refactor and improve.
            let relationData = relationsMappings[i];
            let relationEntity = this.server.entityManager.get(relationData.entityName).rawModel.entity;
            if(!relationEntity){
                Logger.warning('Factory not found for relation definition:', relationData);
                continue;
            }
            let isManyToOne = 'm:1' === relationData.reference;
            let isOneToMany = '1:m' === relationData.reference;
            if(isManyToOne){
                if(!sc.hasOwn(params, relationData.join.from) || !params[relationData.join.from]){
                    continue;
                }
                await this.createOne(params, i, relationEntity, newInstance, relationData);
                continue;
            }
            if(isOneToMany){
                await this.createMany(params, i, relationEntity, newInstance, relationData);
            }
        }
    }

    async createOne(params, i, relationEntity, newInstance, relationData)
    {
        params[i] = newInstance[relationData.join.from];
        let nestedObject = relationEntity.createByProps(params[i]);
        await this.repository.persist(nestedObject).flush();
        await this.orm.em.flush();
        newInstance[i] = nestedObject;
    }

    async createMany(params, i, relationEntity, newInstance, relationData)
    {
        let nestedArray = [];
        for(let objectData of params[i]){
            objectData[relationData.join.to] = newInstance[relationData.join.from];
            let nestedObject = relationEntity.createByProps(objectData);
            await this.repository.persist(nestedObject).flush();
            await this.orm.em.flush();
            nestedArray.push(nestedObject);
        }
        newInstance[i] = nestedArray;
    }

}

module.exports.MikroOrmDriver = MikroOrmDriver;
