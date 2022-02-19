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
        await this.orm.em.flush();
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
            await this.repository.persist(entity).flush();
            await this.orm.em.flush();
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
            await this.repository.persist(entity).flush();
            await this.orm.em.flush();
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
        let entities = await this.loadAll();
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
        if('function' !== typeof this.rawModel.entity.relationMappings){
            return entitiesCollection;
        }
        if(!sc.isArray(relations) || 0 === relations.length){
            relations = Object.keys(this.rawModel.entity.relationMappings() || {});
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
        // @TODO - BETA - Refactor and improve.
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

    async createNested(newInstance, params)
    {
        if('function' !== typeof this.rawModel.entity.relationMappings){
            return false;
        }
        let relationMappings = this.rawModel.entity.relationMappings();
        for(let i of Object.keys(relationMappings)){
            // @TODO - BETA - Refactor and improve.
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
