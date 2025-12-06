/**
 *
 * Reldens - PrismaDriver
 *
 */

const { BaseDriver } = require('../base-driver');
const { PrismaTypeCaster } = require('./prisma-type-caster');
const { PrismaMetadataLoader } = require('./prisma-metadata-loader');
const { PrismaRelationResolver } = require('./prisma-relation-resolver');
const { Logger, sc } = require('@reldens/utils');

class PrismaDriver extends BaseDriver
{

    constructor(props)
    {
        super(props);
        if(!props.prisma){
            Logger.critical('Missing Prisma client on Prisma driver.');
            return false;
        }
        if(!props.model){
            Logger.critical('Missing Prisma model on Prisma driver.');
            return false;
        }
        this.prisma = props.prisma;
        this.model = props.model;
        this.allRelationMappings = sc.get(props, 'allRelationMappings', {});
        this.initHelpers();
        this.initModelMetadata();
    }

    initHelpers()
    {
        this.metadataLoader = new PrismaMetadataLoader({
            prisma: this.prisma,
            rawModel: this.rawModel
        });
        this.typeCaster = new PrismaTypeCaster({
            idFieldType: 'String',
            jsonFields: new Set(),
            fieldTypes: {},
            fieldDefaults: {},
            requiredFields: [],
            optionalFields: [],
            rawModel: this.rawModel
        });
        this.relationResolver = new PrismaRelationResolver({
            relationMetadata: {},
            metadataLoader: this.metadataLoader,
            allRelationMappings: this.allRelationMappings
        });
    }

    initModelMetadata()
    {
        let metadata = this.metadataLoader.loadModelMetadata(this.tableName());
        if(!metadata){
            return;
        }
        this.requiredFields = metadata.requiredFields;
        this.optionalFields = metadata.optionalFields;
        this.fieldTypes = metadata.fieldTypes;
        this.fieldDefaults = metadata.fieldDefaults;
        this.idFieldType = metadata.idFieldType;
        this.idFieldName = sc.get(metadata, 'idFieldName', 'id');
        this.referenceFields = metadata.referenceFields;
        this.relationMetadata = metadata.relationMetadata;
        this.foreignKeyMappings = metadata.foreignKeyMappings;
        this.foreignKeyTargetFields = sc.get(metadata, 'foreignKeyTargetFields', {});
        this.jsonFields = metadata.jsonFields;
        this.typeCaster.updateMetadata({
            idFieldType: this.idFieldType,
            jsonFields: this.jsonFields,
            fieldTypes: this.fieldTypes,
            fieldDefaults: this.fieldDefaults,
            requiredFields: this.requiredFields,
            optionalFields: this.optionalFields
        });
        this.relationResolver.updateMetadata({
            relationMetadata: this.relationMetadata
        });
        let currentModelMappings = sc.get(this.allRelationMappings, this.tableName(), {});
        this.relationResolver.setCurrentModelMappings(currentModelMappings);
    }

    databaseName()
    {
        return this.config.database || '';
    }

    id()
    {
        return this.name || '';
    }

    name()
    {
        return this.rawName || '';
    }

    tableName()
    {
        return this.model.$name || this.model.name || '';
    }

    property(propertyName)
    {
        return this.rawModel[propertyName] || null;
    }

    getAllRelations()
    {
        return this.relationResolver.getAllRelations();
    }

    prepareData(params)
    {
        let data = {};
        for(let key of Object.keys(params)){
            let fieldType = this.fieldTypes[key];
            if(!fieldType){
                data[key] = params[key];
                continue;
            }
            let castedValue = this.typeCaster.castValue(params[key], fieldType, key);
            if(this.typeCaster.isValidCastedValue(castedValue)){
                data[key] = castedValue;
            }
        }
        return data;
    }

    prepareScalarData(params)
    {
        let data = {};
        for(let key of Object.keys(params)){
            let value = params[key];
            if(sc.isObject(value) && !sc.isArray(value)){
                continue;
            }
            let fieldType = this.fieldTypes[key];
            if(!fieldType){
                data[key] = value;
                continue;
            }
            let castedValue = this.typeCaster.castValue(value, fieldType, key);
            if(this.typeCaster.isValidCastedValue(castedValue)){
                data[key] = castedValue;
            }
        }
        return data;
    }

    prepareDataWithRelations(params, isCreate = false)
    {
        let data = {};
        let relations = {};
        for(let key of Object.keys(params)){
            if(!sc.hasOwn(this.foreignKeyMappings, key)){
                let fieldType = this.fieldTypes[key];
                if(!fieldType){
                    if(this.typeCaster.isNullOrEmpty(params[key])){
                        continue;
                    }
                    data[key] = params[key];
                    continue;
                }
                let castedValue = this.typeCaster.castValue(params[key], fieldType, key);
                if(!this.typeCaster.isValidCastedValue(castedValue)){
                    continue;
                }
                if(this.typeCaster.isJsonFieldType(fieldType) && null === castedValue){
                    continue;
                }
                data[key] = castedValue;
                continue;
            }
            let relationName = this.foreignKeyMappings[key];
            let value = params[key];
            let targetField = sc.get(this.foreignKeyTargetFields, key, 'id');
            let fieldType = this.fieldTypes[key];
            if(this.typeCaster.isNullOrEmpty(value)){
                if(isCreate){
                    continue;
                }
                relations[relationName] = {disconnect: true};
                continue;
            }
            let connectValue = fieldType
                ? this.typeCaster.castValue(value, fieldType, key)
                : this.typeCaster.castToIdType(value);
            relations[relationName] = {
                connect: {[targetField]: connectValue}
            };
        }
        return {...data, ...relations};
    }

    ensureRequiredFields(data)
    {
        let missingFields = [];
        for(let field of this.requiredFields){
            if(sc.hasOwn(data, field)){
                continue;
            }
            if(sc.hasOwn(this.foreignKeyMappings, field)){
                let relationName = this.foreignKeyMappings[field];
                if(sc.hasOwn(data, relationName)){
                    continue;
                }
            }
            if(sc.hasOwn(this.fieldDefaults, field)){
                continue;
            }
            missingFields.push(field);
        }
        if(0 < missingFields.length){
            Logger.warning('Missing required fields for '+this.tableName()+': '+missingFields.join(', '));
        }
        return data;
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
                processedFilters.OR = value.map(condition => this.processFilters(condition));
                continue;
            }
            if(sc.hasOwn(value, 'operator') && sc.hasOwn(value, 'value')){
                let operatorValue = this.processFilterValue(value.value, key);
                processedFilters[key] = this.applyOperator(operatorValue, value.operator, key);
                continue;
            }
            if(sc.isObject(value) && !sc.isArray(value)){
                processedFilters[key] = this.processFilters(value);
                continue;
            }
            processedFilters[key] = this.processFilterValue(value, key);
        }
        return processedFilters;
    }

    processFilterValue(value, key)
    {
        if(sc.isArray(value)){
            if('id' === key){
                return value.map(id => this.typeCaster.castToIdType(id)).filter(id => null !== id);
            }
            let fieldType = this.fieldTypes[key];
            if(fieldType){
                return value.map(val => this.typeCaster.castValue(val, fieldType, key))
                    .filter(val => this.typeCaster.isValidCastedValue(val));
            }
            return value;
        }
        if('id' === key){
            return this.typeCaster.castToIdType(value);
        }
        let fieldType = this.fieldTypes[key];
        if(fieldType){
            let castedValue = this.typeCaster.castValue(value, fieldType, key);
            if(this.typeCaster.isValidCastedValue(castedValue)){
                return castedValue;
            }
            return value;
        }
        return value;
    }

    applyOperator(value, operator, fieldName = null)
    {
        let upperOperator = operator ? operator.toUpperCase() : '';
        if('LIKE' === upperOperator){
            return this.handleLikeOperator(value, fieldName);
        }
        let operatorsMap = {
            '=': value,
            '!=': {not: value},
            '>': {gt: value},
            '>=': {gte: value},
            '<': {lt: value},
            '<=': {lte: value},
            'IN': {in: value},
            'NOT IN': {notIn: value}
        };
        return operatorsMap[upperOperator] || value;
    }

    handleLikeOperator(value, fieldName)
    {
        let cleanValue = String(value).replace(/%/g, '');
        if(this.typeCaster.isJsonFieldByName(fieldName) || this.isJsonField(fieldName)){
            return this.handleJsonTextSearch(cleanValue);
        }
        if('id' === fieldName || sc.hasOwn(this.referenceFields, fieldName)){
            let numericValue = Number(cleanValue);
            if(!isNaN(numericValue)){
                return numericValue;
            }
        }
        return {contains: cleanValue};
    }

    handleJsonTextSearch(searchValue)
    {
        return {
            string_contains: searchValue
        };
    }

    isJsonField(fieldName)
    {
        return this.jsonFields && this.jsonFields.has(fieldName);
    }

    async create(params)
    {
        let preparedData = this.prepareDataWithRelations(params, true);
        this.ensureRequiredFields(preparedData);
        try {
            return this.typeCaster.normalizeReturnData(await this.model.create({data: preparedData}));
        } catch(error) {
            Logger.error('Create error: '+error.message);
            return false;
        }
    }

    async createWithRelations(params, relations)
    {
        if(!sc.isArray(relations) || 0 === relations.length){
            relations = this.getAllRelations();
        }
        let preparedData = this.prepareData(params);
        this.ensureRequiredFields(preparedData);
        let createData = {data: preparedData};
        if(0 < relations.length){
            let includeData = this.relationResolver.buildIncludeObjectWithMapping(relations);
            createData.include = includeData.include;
            for(let relation of relations){
                let prismaName = this.relationResolver.mapToPrismaName(relation, null);
                if(!prismaName){
                    continue;
                }
                if(!sc.hasOwn(params, relation)){
                    continue;
                }
                let relationData = params[relation];
                if(sc.isArray(relationData)){
                    createData.data[prismaName] = {
                        connect: relationData.map(item => ({id: this.typeCaster.castToIdType(item.id)}))
                    };
                    continue;
                }
                createData.data[prismaName] = {
                    connect: {id: this.typeCaster.castToIdType(relationData.id)}
                };
            }
            try {
                return this.typeCaster.normalizeReturnData(
                    this.relationResolver.transformRelationResults(
                        await this.model.create(createData),
                        includeData.include,
                        includeData.mapping
                    )
                );
            } catch(error) {
                Logger.error('Create with relations error: '+error.message);
                return false;
            }
        }
        try {
            return this.typeCaster.normalizeReturnData(await this.model.create(createData));
        } catch(error) {
            Logger.error('Create with relations error: '+error.message);
            return false;
        }
    }

    async update(filters, updatePatch)
    {
        let preparedData = this.prepareScalarData(updatePatch);
        let processedFilters = this.processFilters(filters);
        try {
            return this.typeCaster.normalizeReturnData(
                await this.model.updateMany({where: processedFilters, data: preparedData})
            );
        } catch(error) {
            Logger.error('Update error: '+error.message);
            return false;
        }
    }

    async updateBy(field, fieldValue, updatePatch, operator = null)
    {
        let filter = this.createSingleFilter(field, fieldValue, operator);
        let preparedData = this.prepareScalarData(updatePatch);
        try {
            return this.typeCaster.normalizeReturnData(
                await this.model.updateMany({where: filter, data: preparedData})
            );
        } catch(error) {
            Logger.error('Update by error: '+error.message);
            return false;
        }
    }

    async updateById(id, params)
    {
        let castedId = this.typeCaster.castToIdType(id);
        let found = await this.loadById(castedId);
        if(!found){
            return false;
        }
        let preparedData = this.prepareDataWithRelations(params);
        try {
            return this.typeCaster.normalizeReturnData(
                await this.model.update({where: {[this.idFieldName]: castedId}, data: preparedData})
            );
        } catch(error) {
            Logger.error('Update by ID error: '+error.message);
            return false;
        }
    }

    async upsert(params, filters)
    {
        let preparedData = this.prepareDataWithRelations(params);
        let existing = false;
        let idValue = params[this.idFieldName];
        if(idValue){
            let castedId = this.typeCaster.castToIdType(idValue);
            existing = await this.loadById(castedId);
            if(existing){
                let patch = Object.assign({}, preparedData);
                delete patch[this.idFieldName];
                try {
                    return this.typeCaster.normalizeReturnData(
                        await this.model.update({where: {[this.idFieldName]: castedId}, data: patch})
                    );
                } catch(error) {
                    Logger.error('Upsert update error: '+error.message);
                    return false;
                }
            }
        }
        if(filters){
            let existing = await this.loadOne(filters);
            if(existing){
                try {
                    return this.typeCaster.normalizeReturnData(
                        await this.model.update({
                            where: {[this.idFieldName]: this.typeCaster.castToIdType(existing[this.idFieldName])},
                            data: preparedData
                        })
                    );
                } catch(error) {
                    Logger.error('Upsert update by filter error: '+error.message);
                    return false;
                }
            }
        }
        return await this.create(preparedData);
    }

    async delete(filters = {})
    {
        let processedFilters = this.processFilters(filters);
        try {
            return this.typeCaster.normalizeReturnData(
                await this.model.deleteMany({where: processedFilters})
            );
        } catch(error) {
            Logger.error('Delete error: '+error.message);
            return false;
        }
    }

    async deleteById(id)
    {
        let castedId = this.typeCaster.castToIdType(id);
        let found = await this.loadById(castedId);
        if(!found){
            return false;
        }
        try {
            return this.typeCaster.normalizeReturnData(
                await this.model.delete({where: {[this.idFieldName]: castedId}})
            );
        } catch(error) {
            Logger.error('Delete by ID error: '+error.message);
            return false;
        }
    }

    async count(filters)
    {
        let processedFilters = this.processFilters(filters);
        try {
            return this.typeCaster.normalizeReturnData(
                await this.model.count({where: processedFilters})
            );
        } catch(error) {
            Logger.error('Count error: '+error.message);
            return 0;
        }
    }

    async countWithRelations(filters, relations)
    {
        if(!sc.isArray(relations) || 0 === relations.length){
            relations = this.getAllRelations();
        }
        let processedFilters = this.processFilters(filters);
        let query = {
            where: processedFilters
        };
        if(0 < relations.length){
            query.include = this.relationResolver.buildIncludeObjectWithMapping(relations).include;
        }
        try {
            return this.typeCaster.normalizeReturnData(await this.model.count(query));
        } catch(error) {
            Logger.error('Count with relations error: '+error.message);
            return 0;
        }
    }

    async loadAll()
    {
        try {
            return this.typeCaster.normalizeReturnData(await this.model.findMany(this.buildQueryOptions()));
        } catch(error) {
            Logger.error('Load all error: '+error.message);
            return [];
        }
    }

    async loadAllWithRelations(relations)
    {
        return this.executeQueryWithRelations(
            (q) => this.model.findMany(q),
            this.buildQueryOptions(),
            relations,
            'Load all with relations error: ',
            []
        );
    }

    async load(filters)
    {
        let processedFilters = this.processFilters(filters);
        let query = this.buildQueryOptions();
        query.where = processedFilters;
        try {
            return this.typeCaster.normalizeReturnData(await this.model.findMany(query));
        } catch(error) {
            Logger.error('Load error: '+error.message);
            return [];
        }
    }

    async loadWithRelations(filters, relations)
    {
        let query = this.buildQueryOptions();
        query.where = this.processFilters(filters);
        return this.executeQueryWithRelations(
            (q) => this.model.findMany(q),
            query,
            relations,
            'Load with relations error: ',
            []
        );
    }

    async loadBy(field, fieldValue, operator = null)
    {
        let filter = this.createSingleFilter(field, fieldValue, operator);
        let query = this.buildQueryOptions();
        query.where = filter;
        try {
            return this.typeCaster.normalizeReturnData(await this.model.findMany(query));
        } catch(error) {
            Logger.error('Load by error: '+error.message);
            return [];
        }
    }

    async loadByWithRelations(field, fieldValue, relations, operator = null)
    {
        let query = this.buildQueryOptions();
        query.where = this.createSingleFilter(field, fieldValue, operator);
        return this.executeQueryWithRelations(
            (q) => this.model.findMany(q),
            query,
            relations,
            'Load by with relations error: ',
            []
        );
    }

    async loadById(id)
    {
        let castedId = this.typeCaster.castToIdType(id);
        try {
            return this.typeCaster.normalizeReturnData(
                await this.model.findUnique({where: {[this.idFieldName]: castedId}})
            );
        } catch(error) {
            Logger.error('Load by ID error: '+error.message);
            return null;
        }
    }

    async loadByIdWithRelations(id, relations)
    {
        return this.executeQueryWithRelations(
            (q) => this.model.findUnique(q),
            {where: {[this.idFieldName]: this.typeCaster.castToIdType(id)}},
            relations,
            'Load by ID with relations error: ',
            null
        );
    }

    async loadByIds(ids)
    {
        let castedIds = ids.map(id => this.typeCaster.castToIdType(id)).filter(id => null !== id);
        if(0 === castedIds.length){
            return [];
        }
        try {
            return this.typeCaster.normalizeReturnData(
                await this.model.findMany({where: {[this.idFieldName]: {in: castedIds}}})
            );
        } catch(error) {
            Logger.error('Load by IDs error: '+error.message);
            return [];
        }
    }

    async loadOne(filters)
    {
        let processedFilters = this.processFilters(filters);
        let query = this.buildQueryOptions(false);
        query.where = processedFilters;
        try {
            return this.typeCaster.normalizeReturnData(await this.model.findFirst(query));
        } catch(error) {
            Logger.error('Load one error: '+error.message);
            return null;
        }
    }

    async loadOneWithRelations(filters, relations)
    {
        let query = this.buildQueryOptions(false);
        query.where = this.processFilters(filters);
        return this.executeQueryWithRelations(
            (q) => this.model.findFirst(q),
            query,
            relations,
            'Load one with relations error: ',
            null
        );
    }

    async loadOneBy(field, fieldValue, operator = null)
    {
        let filter = this.createSingleFilter(field, fieldValue, operator);
        let query = this.buildQueryOptions(false);
        query.where = filter;
        try {
            return this.typeCaster.normalizeReturnData(await this.model.findFirst(query));
        } catch(error) {
            Logger.error('Load one by error: '+error.message);
            return null;
        }
    }

    async loadOneByWithRelations(field, fieldValue, relations, operator = null)
    {
        let query = this.buildQueryOptions(false);
        query.where = this.createSingleFilter(field, fieldValue, operator);
        return this.executeQueryWithRelations(
            (q) => this.model.findFirst(q),
            query,
            relations,
            'Load one by with relations error: ',
            null
        );
    }

    buildQueryOptions(useLimit = true)
    {
        let queryOptions = {};
        if(0 < this.select.length){
            queryOptions.select = {};
            for(let field of this.select){
                queryOptions.select[field] = true;
            }
        }
        if(useLimit && 0 !== this.limit){
            queryOptions.take = this.limit;
        }
        if(0 !== this.offset){
            queryOptions.skip = this.offset;
        }
        if(false !== this.sortBy && false !== this.sortDirection){
            queryOptions.orderBy = {
                [this.sortBy]: this.sortDirection.toLowerCase()
            };
        }
        return queryOptions;
    }

    createSingleFilter(field, fieldValue, operator = null)
    {
        let filter = {};
        let processedValue = this.processFilterValue(fieldValue, field);
        if(null === operator){
            filter[field] = processedValue;
            return filter;
        }
        filter[field] = {operator, value: processedValue};
        return this.processFilters(filter);
    }

    async executeQueryWithRelations(modelMethod, query, relations, errorMessage, defaultReturn)
    {
        if(!sc.isArray(relations) || 0 === relations.length){
            relations = this.getAllRelations();
        }
        let includeData = this.relationResolver.buildIncludeObjectWithMapping(relations);
        if(0 < Object.keys(includeData.include).length){
            query.include = includeData.include;
        }
        try {
            return this.typeCaster.normalizeReturnData(
                this.relationResolver.transformRelationResults(
                    await modelMethod(query),
                    includeData.include,
                    includeData.mapping
                )
            );
        } catch(error) {
            Logger.error(errorMessage+error.message);
            return defaultReturn;
        }
    }

}

module.exports.PrismaDriver = PrismaDriver;
