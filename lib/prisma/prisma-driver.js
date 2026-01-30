/**
 *
 * Reldens - PrismaDriver
 *
 */

const { BaseDriver } = require('../base-driver');
const { PrismaTypeCaster } = require('./prisma-type-caster');
const { PrismaMetadataLoader } = require('./prisma-metadata-loader');
const { PrismaRelationResolver } = require('./prisma-relation-resolver');
const { PrismaFilterProcessor } = require('./prisma-filter-processor');
const { PrismaQueryBuilder } = require('./prisma-query-builder');
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
        this.prismaDbNull = sc.get(props, 'prismaDbNull', null);
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
            rawModel: this.rawModel,
            prismaDbNull: this.prismaDbNull
        });
        this.relationResolver = new PrismaRelationResolver({
            relationMetadata: {},
            metadataLoader: this.metadataLoader,
            allRelationMappings: this.allRelationMappings,
            foreignKeyMappings: {},
            foreignKeyTargetFields: {},
            typeCaster: this.typeCaster
        });
        this.filterProcessor = new PrismaFilterProcessor({
            typeCaster: this.typeCaster,
            fieldTypes: {},
            referenceFields: {},
            jsonFields: new Set(),
            operatorsMap: this.operatorsMap
        });
        this.queryBuilder = new PrismaQueryBuilder();
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
            relationMetadata: this.relationMetadata,
            foreignKeyMappings: this.foreignKeyMappings,
            foreignKeyTargetFields: this.foreignKeyTargetFields
        });
        this.filterProcessor.updateMetadata({
            fieldTypes: this.fieldTypes,
            referenceFields: this.referenceFields,
            jsonFields: this.jsonFields
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

    getQueryOptions()
    {
        return {
            select: this.select,
            limit: this.limit,
            offset: this.offset,
            sortBy: this.sortBy,
            sortDirection: this.sortDirection
        };
    }

    prepareData(params, options = {})
    {
        let skipObjects = sc.get(options, 'skipObjects', false);
        let convertRelations = sc.get(options, 'convertRelations', false);
        let isCreate = sc.get(options, 'isCreate', false);
        if(convertRelations){
            let converted = this.relationResolver.convertForeignKeysToRelations(params, isCreate);
            return this.castDataFields(converted, skipObjects, isCreate);
        }
        return this.castDataFields(params, skipObjects, isCreate);
    }

    castDataFields(params, skipObjects = false, isCreate = false)
    {
        let data = {};
        for(let key of Object.keys(params)){
            let value = params[key];
            if(skipObjects && sc.isObject(value) && !sc.isArray(value)){
                continue;
            }
            if(isCreate && key === this.idFieldName && this.typeCaster.isNullOrEmpty(value)){
                continue;
            }
            let fieldType = this.fieldTypes[key];
            if(!fieldType){
                if(!skipObjects && !this.typeCaster.isNullOrEmpty(value)){
                    data[key] = value;
                }
                continue;
            }
            let castedValue = this.typeCaster.castValue(value, fieldType, key);
            if(this.typeCaster.isValidCastedValue(castedValue)){
                if(this.typeCaster.isJsonFieldType(fieldType) && null === castedValue && !skipObjects){
                    continue;
                }
                data[key] = castedValue;
            }
        }
        return data;
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

    async executeWithNormalization(operation, errorMessage, defaultReturn)
    {
        try {
            return this.typeCaster.normalizeReturnData(await operation());
        } catch(error) {
            Logger.error(errorMessage+error.message);
            return defaultReturn;
        }
    }

    async create(params)
    {
        let preparedData = this.prepareData(params, {convertRelations: true, isCreate: true});
        this.ensureRequiredFields(preparedData);
        return this.executeWithNormalization(
            () => this.model.create({data: preparedData}),
            'Create error: ',
            false
        );
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
            let relationData = this.relationResolver.buildCreateDataWithRelations(params, relations);
            createData.data = {...createData.data, ...relationData};
            return this.executeWithNormalization(
                async () => this.relationResolver.transformRelationResults(
                    await this.model.create(createData),
                    includeData.include,
                    includeData.mapping
                ),
                'Create with relations error: ',
                false
            );
        }
        return this.executeWithNormalization(
            () => this.model.create(createData),
            'Create with relations error: ',
            false
        );
    }

    async update(filters, updatePatch)
    {
        let preparedData = this.prepareData(updatePatch, {skipObjects: true});
        let processedFilters = this.filterProcessor.processFilters(filters);
        return this.executeWithNormalization(
            () => this.model.updateMany({where: processedFilters, data: preparedData}),
            'Update error: ',
            false
        );
    }

    async updateBy(field, fieldValue, updatePatch, operator = null)
    {
        let filter = this.filterProcessor.createSingleFilter(field, fieldValue, operator);
        let preparedData = this.prepareData(updatePatch, {skipObjects: true});
        return this.executeWithNormalization(
            () => this.model.updateMany({where: filter, data: preparedData}),
            'Update by error: ',
            false
        );
    }

    async updateById(id, params)
    {
        let castedId = this.typeCaster.castToIdType(id);
        let found = await this.loadById(castedId);
        if(!found){
            return false;
        }
        let preparedData = this.prepareData(params, {convertRelations: true});
        return this.executeWithNormalization(
            () => this.model.update({where: {[this.idFieldName]: castedId}, data: preparedData}),
            'Update by ID error: ',
            false
        );
    }

    async upsert(params, filters)
    {
        let preparedData = this.prepareData(params, {convertRelations: true});
        let idValue = params[this.idFieldName];
        if(idValue){
            let castedId = this.typeCaster.castToIdType(idValue);
            let existing = await this.loadById(castedId);
            if(existing){
                let patch = Object.assign({}, preparedData);
                delete patch[this.idFieldName];
                return this.executeWithNormalization(
                    () => this.model.update({where: {[this.idFieldName]: castedId}, data: patch}),
                    'Upsert update error: ',
                    false
                );
            }
        }
        if(filters){
            let existing = await this.loadOne(filters);
            if(existing){
                return this.executeWithNormalization(
                    () => this.model.update({
                        where: {[this.idFieldName]: this.typeCaster.castToIdType(existing[this.idFieldName])},
                        data: preparedData
                    }),
                    'Upsert update by filter error: ',
                    false
                );
            }
        }
        return await this.create(preparedData);
    }

    async delete(filters = {})
    {
        let processedFilters = this.filterProcessor.processFilters(filters);
        return this.executeWithNormalization(
            () => this.model.deleteMany({where: processedFilters}),
            'Delete error: ',
            false
        );
    }

    async deleteById(id)
    {
        let castedId = this.typeCaster.castToIdType(id);
        let found = await this.loadById(castedId);
        if(!found){
            return false;
        }
        return this.executeWithNormalization(
            () => this.model.delete({where: {[this.idFieldName]: castedId}}),
            'Delete by ID error: ',
            false
        );
    }

    async count(filters)
    {
        let processedFilters = this.filterProcessor.processFilters(filters);
        return this.executeWithNormalization(
            () => this.model.count({where: processedFilters}),
            'Count error: ',
            0
        );
    }

    async countWithRelations(filters, relations)
    {
        if(!sc.isArray(relations) || 0 === relations.length){
            relations = this.getAllRelations();
        }
        let processedFilters = this.filterProcessor.processFilters(filters);
        let query = {where: processedFilters};
        if(0 < relations.length){
            query.include = this.relationResolver.buildIncludeObjectWithMapping(relations).include;
        }
        return this.executeWithNormalization(
            () => this.model.count(query),
            'Count with relations error: ',
            0
        );
    }

    async loadAll()
    {
        return this.executeWithNormalization(
            () => this.model.findMany(this.queryBuilder.buildQueryOptions(this.getQueryOptions())),
            'Load all error: ',
            []
        );
    }

    async loadAllWithRelations(relations)
    {
        return this.executeQueryWithRelations(
            (q) => this.model.findMany(q),
            this.queryBuilder.buildQueryOptions(this.getQueryOptions()),
            relations,
            'Load all with relations error: ',
            []
        );
    }

    async load(filters)
    {
        let processedFilters = this.filterProcessor.processFilters(filters);
        let query = this.queryBuilder.buildQueryOptions(this.getQueryOptions());
        query.where = processedFilters;
        return this.executeWithNormalization(
            () => this.model.findMany(query),
            'Load error: ',
            []
        );
    }

    async loadWithRelations(filters, relations)
    {
        let query = this.queryBuilder.buildQueryOptions(this.getQueryOptions());
        query.where = this.filterProcessor.processFilters(filters);
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
        let filter = this.filterProcessor.createSingleFilter(field, fieldValue, operator);
        let query = this.queryBuilder.buildQueryOptions(this.getQueryOptions());
        query.where = filter;
        return this.executeWithNormalization(
            () => this.model.findMany(query),
            'Load by error: ',
            []
        );
    }

    async loadByWithRelations(field, fieldValue, relations, operator = null)
    {
        let query = this.queryBuilder.buildQueryOptions(this.getQueryOptions());
        query.where = this.filterProcessor.createSingleFilter(field, fieldValue, operator);
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
        return this.executeWithNormalization(
            () => this.model.findUnique({where: {[this.idFieldName]: castedId}}),
            'Load by ID error: ',
            null
        );
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
        return this.executeWithNormalization(
            () => this.model.findMany({where: {[this.idFieldName]: {in: castedIds}}}),
            'Load by IDs error: ',
            []
        );
    }

    async loadOne(filters)
    {
        let processedFilters = this.filterProcessor.processFilters(filters);
        let query = this.queryBuilder.buildQueryOptions(this.getQueryOptions(), false);
        query.where = processedFilters;
        return this.executeWithNormalization(
            () => this.model.findFirst(query),
            'Load one error: ',
            null
        );
    }

    async loadOneWithRelations(filters, relations)
    {
        let query = this.queryBuilder.buildQueryOptions(this.getQueryOptions(), false);
        query.where = this.filterProcessor.processFilters(filters);
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
        let filter = this.filterProcessor.createSingleFilter(field, fieldValue, operator);
        let query = this.queryBuilder.buildQueryOptions(this.getQueryOptions(), false);
        query.where = filter;
        return this.executeWithNormalization(
            () => this.model.findFirst(query),
            'Load one by error: ',
            null
        );
    }

    async loadOneByWithRelations(field, fieldValue, relations, operator = null)
    {
        let query = this.queryBuilder.buildQueryOptions(this.getQueryOptions(), false);
        query.where = this.filterProcessor.createSingleFilter(field, fieldValue, operator);
        return this.executeQueryWithRelations(
            (q) => this.model.findFirst(q),
            query,
            relations,
            'Load one by with relations error: ',
            null
        );
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
        return this.executeWithNormalization(
            async () => this.relationResolver.transformRelationResults(
                await modelMethod(query),
                includeData.include,
                includeData.mapping
            ),
            errorMessage,
            defaultReturn
        );
    }

}

module.exports.PrismaDriver = PrismaDriver;
