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
        this.mikroOrmModules = sc.get(props, 'mikroOrmModules', false);
        if(!this.mikroOrmModules){
            Logger.critical('Missing Mikro ORM modules on Mikro ORM driver.');
            return false;
        }
        this.Collection = this.mikroOrmModules.Collection;
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
            if('m:1' === prop.kind || '1:1' === prop.kind || '1:m' === prop.kind || 'm:n' === prop.kind){
                relations.push(propName);
            }
        }
        return relations;
    }

    isOwningRelation(prop)
    {
        if('m:1' === prop.kind){
            return true;
        }
        return '1:1' === prop.kind && Boolean(prop.owner);
    }

    isInverseRelation(prop)
    {
        if('1:m' === prop.kind){
            return true;
        }
        return '1:1' === prop.kind && !prop.owner;
    }

    inverseRelationOwnerJoinColumn(prop, relationDriver)
    {
        if(!this.isInverseRelation(prop)){
            return false;
        }
        if(!prop.mappedBy){
            return false;
        }
        if(!relationDriver.entitySchema){
            return false;
        }
        if(!relationDriver.entitySchema.meta){
            return false;
        }
        let mappedProp = relationDriver.entitySchema.meta.properties[prop.mappedBy];
        if(!mappedProp){
            return false;
        }
        if(!mappedProp.joinColumns){
            return false;
        }
        return mappedProp.joinColumns[0] || false;
    }

    nestedFkColumn(prop, relationDriver)
    {
        if(!this.isOwningRelation(prop)){
            return this.inverseRelationOwnerJoinColumn(prop, relationDriver);
        }
        if(!prop.joinColumns){
            return false;
        }
        return prop.joinColumns[0] || false;
    }

    removeRelationsFromParams(params)
    {
        if(!params || 'object' !== typeof params){
            return params;
        }
        let columnsOnly = {...params};
        for(let relationName of this.getAllRelations()){
            delete columnsOnly[relationName];
        }
        return columnsOnly;
    }

    async createEntity(params)
    {
        let writeManager = this.orm.em.fork();
        let newInstance = await writeManager.create(this.entitySchema, this.removeRelationsFromParams(params));
        await writeManager.upsert(newInstance);
        await writeManager.flush();
        return newInstance;
    }

    async create(params)
    {
        return this.withoutUninitializedCollections(await this.createEntity(params));
    }

    withoutUninitializedCollections(entity)
    {
        if(!entity || !this.Collection){
            return entity;
        }
        let result = {};
        for(let key of Object.keys(entity)){
            if(entity[key] instanceof this.Collection && !entity[key].isInitialized()){
                continue;
            }
            result[key] = entity[key];
        }
        return result;
    }

    async createWithRelations(params, relations)
    {
        relations = this.normalizeRelations(relations);
        let newInstance = await this.createEntity(params);
        await this.createNested(newInstance, params, relations);
        return await this.appendRelationsToCollection(newInstance, relations);
    }

    async applyUpdateToEntities(processedFilters, updatePatch)
    {
        let entities = await this.repository.find(processedFilters, this.queryBuilder(true, true, true));
        if(0 === entities.length){
            return false;
        }
        let columnsOnly = this.removeRelationsFromParams(updatePatch);
        for(let entity of entities){
            Object.assign(entity, columnsOnly);
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
        return this.withoutUninitializedCollections(entities.shift());
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
                return this.updateById(existent.id, params);
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
        return entries.length;
    }

    async deleteById(id)
    {
        let entity = await this.repository.findOne(this.processFilters({id}));
        if(!entity){
            return false;
        }
        await this.orm.em.remove(entity);
        await this.orm.em.flush();
        return 1;
    }

    async count(filters)
    {
        let processedFilters = this.processFilters(filters);
        return this.repository.count(processedFilters);
    }

    async countWithRelations(filters, relations)
    {
        relations = this.normalizeRelations(relations);
        let processedFilters = this.processFilters(filters);
        if(0 === relations.length || !this.entitySchema.meta || !this.entitySchema.meta.properties){
            return this.repository.count(processedFilters);
        }
        let queryBuilder = this.orm.em.createQueryBuilder(this.entitySchema);
        let properties = this.entitySchema.meta.properties;
        let aliasCounter = 0;
        for(let relationName of relations){
            let prop = properties[relationName];
            if(!prop || !prop.kind || (!this.isOwningRelation(prop) && !this.isInverseRelation(prop))){
                continue;
            }
            let relationDriver = this.relationDriverFor(prop);
            if(!relationDriver || !relationDriver.entitySchema){
                continue;
            }
            let alias = 'rel_'+aliasCounter;
            if(this.isOwningRelation(prop) && prop.joinColumns && prop.joinColumns[0]){
                queryBuilder.leftJoin(relationName, alias, 'e.'+prop.joinColumns[0]+' = '+alias+'.id');
            }
            let ownerJoinColumn = this.inverseRelationOwnerJoinColumn(prop, relationDriver);
            if(ownerJoinColumn){
                queryBuilder.leftJoin(relationName, alias, 'e.id = '+alias+'.'+ownerJoinColumn);
            }
            aliasCounter++;
        }
        if(sc.isObject(processedFilters) && 0 < Object.keys(processedFilters).length){
            queryBuilder.where(processedFilters);
        }
        return queryBuilder.getCount();
    }

    async loadAll()
    {
        return this.toPlainResult(await this.repository.findAll());
    }

    normalizeRelations(relations)
    {
        if(sc.isString(relations)){
            relations = this.parseRelationsString(relations);
        }
        if(!sc.isArray(relations) || 0 === relations.length){
            return this.getAllRelations();
        }
        return relations;
    }

    toPlainResult(result, populatedPaths, ancestors)
    {
        if(!result || 'object' !== typeof result || result instanceof Date){
            return result;
        }
        if(!ancestors){
            ancestors = new Set();
        }
        if(!populatedPaths){
            populatedPaths = {};
        }
        if(result instanceof this.Collection){
            if(!result.isInitialized()){
                return [];
            }
            return this.toPlainList(result.getItems(), populatedPaths, ancestors);
        }
        if(sc.isArray(result)){
            return this.toPlainList(result, populatedPaths, ancestors);
        }
        return this.toPlainEntity(result, populatedPaths, ancestors);
    }

    toPlainList(result, populatedPaths, ancestors)
    {
        ancestors.add(result);
        let plainList = [];
        for(let item of result){
            if(ancestors.has(item)){
                continue;
            }
            plainList.push(this.toPlainResult(item, populatedPaths, ancestors));
        }
        ancestors.delete(result);
        return plainList;
    }

    toPlainEntity(result, populatedPaths, ancestors)
    {
        ancestors.add(result);
        let relationKeys = this.getAllRelations();
        let plainEntity = {};
        for(let key of Object.keys(result)){
            if(ancestors.has(result[key])){
                continue;
            }
            if(-1 === relationKeys.indexOf(key)){
                plainEntity[key] = result[key];
                continue;
            }
            if(!populatedPaths[key]){
                continue;
            }
            plainEntity[key] = this.toPlainRelation(key, result[key], populatedPaths[key], ancestors);
        }
        ancestors.delete(result);
        return plainEntity;
    }

    toPlainRelation(propName, relationValue, populatedPaths, ancestors)
    {
        let relationDriver = this.relationDriverFor(this.entitySchema.meta.properties[propName]);
        if(!relationDriver){
            return this.toPlainResult(relationValue, populatedPaths, ancestors);
        }
        return relationDriver.toPlainResult(relationValue, populatedPaths, ancestors);
    }

    async plainRelationsResult(entitiesCollection, relations)
    {
        return this.toPlainResult(
            await this.appendRelationsToCollection(entitiesCollection, relations),
            this.populatedPathsTree(relations)
        );
    }

    findEntities(filters)
    {
        return this.repository.find(this.processFilters(filters), this.queryBuilder(true, true, true));
    }

    findOneEntity(filters)
    {
        return this.repository.findOne(this.processFilters(filters), this.queryBuilder(false, true, true));
    }

    async loadAllWithRelations(relations)
    {
        relations = this.normalizeRelations(relations);
        let entities = await this.repository.findAll();
        return this.plainRelationsResult(entities, relations);
    }

    async load(filters)
    {
        return this.toPlainResult(await this.findEntities(filters));
    }

    async loadWithRelations(filters, relations)
    {
        relations = this.normalizeRelations(relations);
        let entitiesCollection = await this.findEntities(filters);
        return this.plainRelationsResult(entitiesCollection, relations);
    }

    async loadBy(field, fieldValue, operator = null)
    {
        return this.toPlainResult(await this.findEntities(this.createSingleFilter(field, fieldValue, operator)));
    }

    async loadByWithRelations(field, fieldValue, relations, operator = null)
    {
        relations = this.normalizeRelations(relations);
        let filter = this.createSingleFilter(field, fieldValue, operator);
        let entitiesCollection = await this.findEntities(filter);
        return this.plainRelationsResult(entitiesCollection, relations);
    }

    async loadById(id)
    {
        return this.toPlainResult(await this.findOneEntity({id}));
    }

    async loadByIdWithRelations(id, relations)
    {
        relations = this.normalizeRelations(relations);
        let entity = await this.findOneEntity({id});
        return this.plainRelationsResult(entity, relations);
    }

    async loadByIds(ids)
    {
        return this.toPlainResult(await this.repository.find(this.processFilters({id: {$in: ids}})));
    }

    async loadOne(filters)
    {
        return this.toPlainResult(await this.findOneEntity(filters));
    }

    async loadOneWithRelations(filters, relations)
    {
        relations = this.normalizeRelations(relations);
        let entitiesCollection = await this.findOneEntity(filters);
        return this.plainRelationsResult(entitiesCollection, relations);
    }

    async loadOneBy(field, fieldValue, operator = null)
    {
        return this.toPlainResult(await this.findOneEntity(this.createSingleFilter(field, fieldValue, operator)));
    }

    async loadOneByWithRelations(field, fieldValue, relations, operator = null)
    {
        relations = this.normalizeRelations(relations);
        let filter = this.createSingleFilter(field, fieldValue, operator);
        let entitiesCollection = await this.findOneEntity(filter);
        return this.plainRelationsResult(entitiesCollection, relations);
    }

    processFilters(filters)
    {
        if(!sc.isObject(filters)){
            return filters;
        }
        let processedFilters = {};
        for(let key of Object.keys(filters)){
            let value = filters[key];
            if(('AND' === key || 'OR' === key) && sc.isArray(value) && 0 === value.length){
                continue;
            }
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

    populatedPathsTree(relations)
    {
        let tree = {};
        if(!sc.isArray(relations)){
            return tree;
        }
        for(let relationPath of relations){
            let node = tree;
            for(let pathPart of String(relationPath).split('.')){
                if(!node[pathPart]){
                    node[pathPart] = {};
                }
                node = node[pathPart];
            }
        }
        return tree;
    }

    convertCollectionsToArrays(entity, populatedPaths)
    {
        if(!entity){
            return entity;
        }
        for(let key of Object.keys(populatedPaths)){
            if(!entity[key] || !(entity[key] instanceof this.Collection)){
                continue;
            }
            if(!entity[key].isInitialized()){
                Logger.warning('Relation "'+key+'" was not populated on '+this.tableName()+', it will be empty.');
                entity[key] = [];
                continue;
            }
            entity[key] = entity[key].getItems();
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
        let populatedPaths = this.populatedPathsTree(relations);
        if(sc.isArray(entitiesCollection)){
            for(let entity of entitiesCollection){
                this.restoreRelatedForeignKeys(entity, new Set(), populatedPaths);
                await this.resolveKeyMappedRelations(entity, populatedPaths);
            }
            return entitiesCollection;
        }
        this.restoreRelatedForeignKeys(entitiesCollection, new Set(), populatedPaths);
        await this.resolveKeyMappedRelations(entitiesCollection, populatedPaths);
        return entitiesCollection;
    }

    async resolveKeyMappedRelations(entity, populatedPaths)
    {
        if(!entity || !this.entitySchema.meta || !this.entitySchema.meta.properties){
            return entity;
        }
        for(let propName of Object.keys(populatedPaths)){
            let prop = this.entitySchema.meta.properties[propName];
            if(!prop || !prop.mapToPk || !prop.targetKey || sc.isObject(entity[propName])){
                continue;
            }
            if(null === entity[propName] || 'undefined' === typeof entity[propName]){
                continue;
            }
            let relationDriver = this.relationDriverFor(prop);
            if(!relationDriver){
                continue;
            }
            entity[propName] = await relationDriver.loadOneBy(prop.targetKey, entity[propName]);
        }
        return entity;
    }

    restoreRelatedForeignKeys(entity, visited, populatedPaths)
    {
        if(!entity || visited.has(entity)){
            return;
        }
        visited.add(entity);
        this.convertCollectionsToArrays(entity, populatedPaths);
        this.addFkFieldsFromRelations(entity);
        if(!this.entitySchema.meta || !this.entitySchema.meta.properties){
            return;
        }
        for(let propName of Object.keys(populatedPaths)){
            let relationDriver = this.relationDriverFor(this.entitySchema.meta.properties[propName]);
            if(!relationDriver){
                continue;
            }
            relationDriver.restoreRelatedEntities(entity[propName], visited, populatedPaths[propName]);
        }
    }

    restoreRelatedEntities(relatedValue, visited, populatedPaths)
    {
        if(!relatedValue || relatedValue instanceof this.Collection){
            return;
        }
        if(sc.isArray(relatedValue)){
            for(let relatedEntity of relatedValue){
                this.restoreRelatedForeignKeys(relatedEntity, visited, populatedPaths);
            }
            return;
        }
        this.restoreRelatedForeignKeys(relatedValue, visited, populatedPaths);
    }

    relationTargetClass(prop)
    {
        if(!sc.isFunction(prop?.entity)){
            return false;
        }
        return prop.entity();
    }

    relationDriverFor(prop)
    {
        let targetClass = this.relationTargetClass(prop);
        let targetClassName = (prop && prop.targetMeta) ? prop.targetMeta.className : false;
        if(!targetClass && !targetClassName){
            return false;
        }
        let entities = this.server.entityManager.entities;
        for(let entityKey of Object.keys(entities)){
            let candidate = entities[entityKey];
            if(!candidate || !candidate.entitySchema || !candidate.entitySchema.meta){
                continue;
            }
            if(targetClass && candidate.entitySchema.meta.class === targetClass){
                return candidate;
            }
            if(targetClassName && candidate.entitySchema.meta.className === targetClassName){
                return candidate;
            }
        }
        return false;
    }

    async createNested(newInstance, params, relations)
    {
        if(!this.entitySchema.meta || !this.entitySchema.meta.properties){
            return false;
        }
        let properties = this.entitySchema.meta.properties;
        for(let relationName of Object.keys(properties)){
            let prop = properties[relationName];
            if(!prop.kind || (!this.isOwningRelation(prop) && !this.isInverseRelation(prop))){
                continue;
            }
            if(sc.isArray(relations) && 0 < relations.length && -1 === relations.indexOf(relationName)){
                continue;
            }
            if(!sc.hasOwn(params, relationName)){
                continue;
            }
            let relationDriver = this.relationDriverFor(prop);
            if(!relationDriver){
                Logger.warning('Entity not found for relation: '+relationName);
                continue;
            }
            if(this.isOwningRelation(prop)){
                await this.createOne(params, relationName, relationDriver, newInstance, prop);
                continue;
            }
            if(sc.isArray(params[relationName])){
                await this.createMany(params, relationName, relationDriver, newInstance, prop);
                continue;
            }
            if('1:1' === prop.kind && sc.isObject(params[relationName])){
                await this.createOne(params, relationName, relationDriver, newInstance, prop);
            }
        }
    }

    async createOne(params, relationName, relationDriver, newInstance, prop)
    {
        let nestedData = Object.assign({}, params[relationName]);
        let fkColumn = this.nestedFkColumn(prop, relationDriver);
        if(fkColumn){
            nestedData[fkColumn] = newInstance.id;
        }
        let nestedObject = await relationDriver.createEntity(nestedData);
        await this.orm.em.flush();
        newInstance[relationName] = nestedObject;
    }

    async createMany(params, relationName, relationDriver, newInstance, prop)
    {
        let nestedArray = [];
        let fkColumn = this.nestedFkColumn(prop, relationDriver);
        for(let objectData of params[relationName]){
            let nestedData = Object.assign({}, objectData);
            if(fkColumn){
                nestedData[fkColumn] = newInstance.id;
            }
            let nestedObject = await relationDriver.createEntity(nestedData);
            await this.orm.em.flush();
            nestedArray.push(nestedObject);
        }
        newInstance[relationName] = nestedArray;
    }

}

module.exports.MikroOrmDriver = MikroOrmDriver;
