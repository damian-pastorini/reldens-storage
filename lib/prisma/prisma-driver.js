/**
 *
 * Reldens - PrismaDriver
 *
 */

const { BaseDriver } = require('../base-driver');
const { Logger, sc } = require('@reldens/utils');
const { Prisma } = require('@prisma/client');

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
        this.requiredFields = [];
        this.optionalFields = [];
        this.fieldTypes = {};
        this.fieldDefaults = {};
        this.idFieldType = 'String';
        this.referenceFields = {};
        this.relationMetadata = {};
        this.foreignKeyMappings = {};
        this.jsonFields = new Set();
        this.initModelMetadata();
    }

    initModelMetadata()
    {
        let dmmf = this.getDmmf();
        if(!dmmf){
            Logger.warning('Could not access Prisma DMMF metadata');
            return;
        }
        let modelName = this.tableName().toLowerCase();
        let modelInfo = dmmf.models?.[modelName] || dmmf.models?.find(m => m.name.toLowerCase() === modelName);
        if(!modelInfo){
            Logger.warning('Could not find model info for: '+modelName);
            return;
        }
        for(let field of modelInfo.fields){
            this.processFieldMetadata(field);
        }
        if(this.rawModel && this.rawModel.relationTypes){
            for(let relationName of Object.keys(this.rawModel.relationTypes)){
                if(sc.hasOwn(this.relationMetadata, relationName)){
                    this.relationMetadata[relationName].type = this.rawModel.relationTypes[relationName];
                }
            }
        }
    }

    getDmmf()
    {
        try {
            if(this.prisma._dmmf){
                return this.prisma._dmmf.datamodel;
            }
            if(this.prisma._getDmmf && sc.isFunction(this.prisma._getDmmf)){
                return this.prisma._getDmmf().datamodel;
            }
            if(this.prisma._runtimeDataModel){
                return this.prisma._runtimeDataModel;
            }
            if(Prisma.dmmf && Prisma.dmmf.datamodel){
                return Prisma.dmmf.datamodel;
            }
            return null;
        } catch(error) {
            Logger.warning('Failed to access DMMF: '+error.message);
            return null;
        }
    }

    processFieldMetadata(field)
    {
        this.fieldTypes[field.name] = field.type;
        if('Json' === field.type){
            this.jsonFields.add(field.name);
        }
        if(field.isId){
            this.idFieldType = field.type;
        }
        if(field.hasDefaultValue){
            this.fieldDefaults[field.name] = field.default;
        }
        if(field.isRequired && !field.hasDefaultValue && !field.isId && 'object' !== field.kind){
            this.requiredFields.push(field.name);
        }
        if(field.isOptional || field.hasDefaultValue){
            this.optionalFields.push(field.name);
        }
        if(field.kind === 'scalar' && field.isList === false){
            let isNumericType = this.isNumericFieldType(field.type);
            let isReferenceField = field.relationFromFields && 0 < field.relationFromFields.length;
            if(isNumericType || isReferenceField){
                this.referenceFields[field.name] = field.type;
            }
        }
        if('object' === field.kind){
            let relationType = field.isList ? 'many' : 'one';
            this.relationMetadata[field.name] = {
                type: relationType,
                model: field.type,
                isList: field.isList,
                isOptional: field.isOptional
            };
        }
        if('object' === field.kind && sc.hasOwn(field, 'relationFromFields') && sc.isArray(field.relationFromFields)){
            for(let foreignKeyField of field.relationFromFields){
                this.foreignKeyMappings[foreignKeyField] = field.name;
            }
        }
    }

    getAllRelations()
    {
        return Object.keys(this.relationMetadata || {});
    }

    normalizeRelationName(relationName)
    {
        if(sc.hasOwn(this.relationMetadata, relationName)){
            return relationName;
        }
        if(relationName.startsWith('related_')){
            let withoutPrefix = relationName.substring(8);
            if(sc.hasOwn(this.relationMetadata, withoutPrefix)){
                return withoutPrefix;
            }
        }
        let availableRelations = Object.keys(this.relationMetadata);
        for(let availableRelation of availableRelations){
            if(relationName.endsWith(availableRelation)){
                return availableRelation;
            }
            if(availableRelation.endsWith(relationName.replace('related_', ''))){
                return availableRelation;
            }
        }
        return relationName;
    }

    isNumericFieldType(fieldType)
    {
        return ('Int' === fieldType || 'BigInt' === fieldType || 'Float' === fieldType || 'Decimal' === fieldType);
    }

    isBooleanFieldType(fieldType)
    {
        return 'Boolean' === fieldType;
    }

    isDateTimeFieldType(fieldType)
    {
        return 'DateTime' === fieldType || 'Date' === fieldType;
    }

    isJsonFieldType(fieldType)
    {
        return 'Json' === fieldType;
    }

    isJsonFieldByName(fieldName)
    {
        if(this.jsonFields.has(fieldName)){
            return true;
        }
        if(!this.rawModel || !this.rawModel.properties){
            return false;
        }
        return 'json' === sc.get(this.rawModel.properties[fieldName], 'dbType', '');
    }

    isStringFieldType(fieldType)
    {
        return 'String' === fieldType;
    }

    castValue(value, fieldType, fieldName = null)
    {
        if('id' === fieldName){
            return this.castToIdType(value);
        }
        if(this.isNullOrEmpty(value)){
            if(sc.hasOwn(this.fieldDefaults, fieldName)){
                return undefined;
            }
            if(-1 !== this.optionalFields.indexOf(fieldName)){
                return null;
            }
            if(-1 !== this.requiredFields.indexOf(fieldName)){
                Logger.warning('Required field '+fieldName+' cannot be null or empty');
                return undefined;
            }
            return null;
        }
        if(this.isJsonFieldByName(fieldName)){
            return this.castToJsonType(value);
        }
        if(this.isNumericFieldType(fieldType)){
            return this.castToNumericType(value, fieldType);
        }
        if(this.isBooleanFieldType(fieldType)){
            return this.castToBooleanType(value);
        }
        if(this.isDateTimeFieldType(fieldType)){
            return this.castToDateType(value);
        }
        if(this.isStringFieldType(fieldType)){
            return this.castToStringType(value);
        }
        return value;
    }

    isNullOrEmpty(value)
    {
        return null === value || undefined === value || '' === value;
    }

    castToIdType(value)
    {
        if(this.isNullOrEmpty(value)){
            return value;
        }
        if(this.isNumericFieldType(this.idFieldType)){
            let numeric = Number(value);
            if(!isNaN(numeric)){
                return ('Int' === this.idFieldType || 'BigInt' === this.idFieldType) ? Math.floor(numeric) : numeric;
            }
        }
        return String(value);
    }

    castToNumericType(value, fieldType)
    {
        if(this.isNullOrEmpty(value)){
            return null;
        }
        let numericValue = Number(value);
        if(isNaN(numericValue)){
            Logger.warning('Cannot convert value to numeric: '+value);
            return null;
        }
        if('Int' === fieldType || 'BigInt' === fieldType){
            return Math.floor(numericValue);
        }
        return numericValue;
    }

    castToBooleanType(value)
    {
        if(this.isNullOrEmpty(value)){
            return null;
        }
        if('boolean' === typeof value){
            return value;
        }
        if('number' === typeof value){
            return 0 !== value;
        }
        if('string' === typeof value){
            let lowerValue = value.toLowerCase();
            if('true' === lowerValue || '1' === lowerValue || 'yes' === lowerValue){
                return true;
            }
            if('false' === lowerValue || '0' === lowerValue || 'no' === lowerValue){
                return false;
            }
        }
        return Boolean(value);
    }

    castToDateType(dateValue)
    {
        if(dateValue instanceof Date){
            return dateValue;
        }
        if(this.isNullOrEmpty(dateValue)){
            return null;
        }
        let dateString = String(dateValue);
        if(dateString.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)){
            return new Date(dateString.replace(' ', 'T') + 'Z');
        }
        if(dateString.match(/^\d{4}-\d{2}-\d{2}$/)){
            return new Date(dateString + 'T00:00:00Z');
        }
        try {
            let parsedDate = new Date(dateString);
            if(isNaN(parsedDate.getTime())){
                Logger.warning('Invalid date value: '+dateString);
                return null;
            }
            return parsedDate;
        } catch(error) {
            Logger.warning('Failed to convert date value: '+dateString);
            return null;
        }
    }

    castToJsonType(value)
    {
        if(this.isNullOrEmpty(value)){
            return Prisma.DbNull;
        }
        if('object' === typeof value){
            return value;
        }
        if('string' === typeof value){
            if(value.startsWith('%') && value.endsWith('%')){
                return value;
            }
            try {
                return JSON.parse(value);
            } catch(error) {
                return value;
            }
        }
        return value;
    }

    castToStringType(value)
    {
        if(null === value || undefined === value){
            return null;
        }
        if('string' === typeof value){
            if('null' === value){
                return null;
            }
            return value;
        }
        return String(value);
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

    prepareData(params)
    {
        let data = {};
        for(let key of Object.keys(params)){
            let fieldType = this.fieldTypes[key];
            if(!fieldType){
                data[key] = params[key];
                continue;
            }
            let castedValue = this.castValue(params[key], fieldType, key);
            if(undefined !== castedValue){
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
            if(sc.hasOwn(this.foreignKeyMappings, key)){
                let relationName = this.foreignKeyMappings[key];
                let value = params[key];
                if(!this.isNullOrEmpty(value)){
                    relations[relationName] = {
                        connect: {id: this.castToIdType(value)}
                    };
                    continue;
                }
                if(!isCreate){
                    relations[relationName] = {
                        disconnect: true
                    };
                }
                continue;
            }
            let fieldType = this.fieldTypes[key];
            if(!fieldType){
                if(!this.isNullOrEmpty(params[key])){
                    data[key] = params[key];
                }
                continue;
            }
            let castedValue = this.castValue(params[key], fieldType, key);
            if(undefined !== castedValue){
                if(this.isJsonFieldType(fieldType) && null === castedValue){
                    continue;
                }
                data[key] = castedValue;
            }
        }
        return {...data, ...relations};
    }

    ensureRequiredFields(data)
    {
        let missingFields = [];
        for(let field of this.requiredFields){
            if(!sc.hasOwn(data, field)){
                missingFields.push(field);
            }
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
                return value.map(id => this.castToIdType(id));
            }
            let fieldType = this.fieldTypes[key];
            if(fieldType){
                return value.map(val => this.castValue(val, fieldType, key)).filter(val => undefined !== val);
            }
            return value;
        }
        if('id' === key){
            return this.castToIdType(value);
        }
        let fieldType = this.fieldTypes[key];
        if(fieldType){
            let castedValue = this.castValue(value, fieldType, key);
            return undefined !== castedValue ? castedValue : value;
        }
        return value;
    }

    transformRelationResults(result, includeConfig, relationMapping)
    {
        if(!result || !includeConfig){
            return result;
        }
        if(sc.isArray(result)){
            return result.map(item => this.transformSingleResult(item, includeConfig, relationMapping));
        }
        return this.transformSingleResult(result, includeConfig, relationMapping);
    }

    transformSingleResult(item, includeConfig, relationMapping)
    {
        if(!item || !sc.isObject(item)){
            return item;
        }
        let transformed = {...item};
        for(let relationName of Object.keys(includeConfig)){
            if(!sc.hasOwn(transformed, relationName)){
                continue;
            }
            let relationMeta = this.relationMetadata[relationName];
            if(!relationMeta){
                continue;
            }
            let relationValue = transformed[relationName];
            if('one' === relationMeta.type && sc.isArray(relationValue)){
                relationValue = 0 < relationValue.length ? [...relationValue].shift() : null;
            }
            if('many' === relationMeta.type && !sc.isArray(relationValue)){
                relationValue = relationValue ? [relationValue] : [];
            }
            let originalName = sc.get(relationMapping, relationName, relationName);
            transformed[originalName] = relationValue;
            if(originalName !== relationName){
                delete transformed[relationName];
            }
        }
        return transformed;
    }

    async create(params)
    {
        let preparedData = this.prepareDataWithRelations(params, true);
        this.ensureRequiredFields(preparedData);
        try {
            return await this.model.create({
                data: preparedData
            });
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
            let includeData = this.buildIncludeObjectWithMapping(relations);
            createData.include = includeData.include;
            for(let relation of relations){
                let normalizedRelation = this.normalizeRelationName(relation);
                if(!sc.hasOwn(params, relation) && !sc.hasOwn(params, normalizedRelation)){
                    continue;
                }
                let relationData = sc.get(params, relation, sc.get(params, normalizedRelation, null));
                if(sc.isArray(relationData)){
                    createData.data[normalizedRelation] = {
                        connect: relationData.map(item => ({id: this.castToIdType(item.id)}))
                    };
                    continue;
                }
                createData.data[normalizedRelation] = {
                    connect: {id: this.castToIdType(relationData.id)}
                };
            }
            try {
                return this.transformRelationResults(await this.model.create(createData), includeData.include, includeData.mapping);
            } catch(error) {
                Logger.error('Create with relations error: '+error.message);
                return false;
            }
        }
        try {
            return await this.model.create(createData);
        } catch(error) {
            Logger.error('Create with relations error: '+error.message);
            return false;
        }
    }

    async update(filters, updatePatch)
    {
        let preparedData = this.prepareDataWithRelations(updatePatch);
        let processedFilters = this.processFilters(filters);
        try {
            return await this.model.updateMany({
                where: processedFilters,
                data: preparedData
            });
        } catch(error) {
            Logger.error('Update error: '+error.message);
            return false;
        }
    }

    async updateBy(field, fieldValue, updatePatch, operator = null)
    {
        let filter = this.createSingleFilter(field, fieldValue, operator);
        let preparedData = this.prepareDataWithRelations(updatePatch);
        try {
            return await this.model.updateMany({
                where: filter,
                data: preparedData
            });
        } catch(error) {
            Logger.error('Update by error: '+error.message);
            return false;
        }
    }

    async updateById(id, params)
    {
        let castedId = this.castToIdType(id);
        let found = await this.loadById(castedId);
        if(!found){
            return false;
        }
        let preparedData = this.prepareDataWithRelations(params);
        try {
            return await this.model.update({
                where: {id: castedId},
                data: preparedData
            });
        } catch(error) {
            Logger.error('Update by ID error: '+error.message);
            return false;
        }
    }

    async upsert(params, filters)
    {
        let preparedData = this.prepareDataWithRelations(params);
        let existing = false;
        if(params.id){
            let castedId = this.castToIdType(params.id);
            existing = await this.loadById(castedId);
            if(existing){
                let patch = Object.assign({}, preparedData);
                delete patch.id;
                try {
                    return await this.model.update({
                        where: {id: castedId},
                        data: patch
                    });
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
                    return await this.model.update({
                        where: {id: this.castToIdType(existing.id)},
                        data: preparedData
                    });
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
            return await this.model.deleteMany({
                where: processedFilters
            });
        } catch(error) {
            Logger.error('Delete error: '+error.message);
            return false;
        }
    }

    async deleteById(id)
    {
        let castedId = this.castToIdType(id);
        let found = await this.loadById(castedId);
        if(!found){
            return false;
        }
        try {
            return await this.model.delete({
                where: {id: castedId}
            });
        } catch(error) {
            Logger.error('Delete by ID error: '+error.message);
            return false;
        }
    }

    async count(filters)
    {
        let processedFilters = this.processFilters(filters);
        try {
            return await this.model.count({
                where: processedFilters
            });
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
            query.include = this.buildIncludeObjectWithMapping(relations).include;
        }
        try {
            return await this.model.count(query);
        } catch(error) {
            Logger.error('Count with relations error: '+error.message);
            return 0;
        }
    }

    async loadAll()
    {
        try {
            return await this.model.findMany(this.buildQueryOptions());
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
            return await this.model.findMany(query);
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
            return await this.model.findMany(query);
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
        let castedId = this.castToIdType(id);
        try {
            return await this.model.findUnique({
                where: {id: castedId}
            });
        } catch(error) {
            Logger.error('Load by ID error: '+error.message);
            return null;
        }
    }

    async loadByIdWithRelations(id, relations)
    {
        return this.executeQueryWithRelations(
            (q) => this.model.findUnique(q),
            {where: {id: this.castToIdType(id)}},
            relations,
            'Load by ID with relations error: ',
            null
        );
    }

    async loadByIds(ids)
    {
        let castedIds = ids.map(id => this.castToIdType(id));
        try {
            return await this.model.findMany({
                where: {
                    id: {in: castedIds}
                }
            });
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
            return await this.model.findFirst(query);
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
            return await this.model.findFirst(query);
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
        if(this.isJsonFieldByName(fieldName) || this.isJsonField(fieldName)){
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

    async executeQueryWithRelations(modelMethod, query, relations, errorMessage, defaultReturn)
    {
        if(!sc.isArray(relations) || 0 === relations.length){
            relations = this.getAllRelations();
        }
        let includeData = this.buildIncludeObjectWithMapping(relations);
        if(0 < Object.keys(includeData.include).length){
            query.include = includeData.include;
        }
        try {
            return this.transformRelationResults(await modelMethod(query), includeData.include, includeData.mapping);
        } catch(error) {
            Logger.error(errorMessage+error.message);
            return defaultReturn;
        }
    }

    buildIncludeObjectWithMapping(relations)
    {
        let include = {};
        let mapping = {};
        for(let relation of relations){
            let normalizedRelation = this.normalizeRelationName(relation);
            if(!sc.hasOwn(this.relationMetadata, normalizedRelation)){
                //Logger.debug('Relation "'+relation+'" (normalized: "'+normalizedRelation+'") not found in model '+this.tableName());
                continue;
            }
            include[normalizedRelation] = true;
            if(relation !== normalizedRelation){
                mapping[normalizedRelation] = relation;
            }
        }
        return {include, mapping};
    }

}

module.exports.PrismaDriver = PrismaDriver;
