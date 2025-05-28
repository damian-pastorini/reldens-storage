/**
 *
 * Reldens - PrismaDriver
 *
 */

const { BaseDriver } = require('../base-driver');
const { ErrorManager, Logger, sc } = require('@reldens/utils');
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
        if(!props.server){
            Logger.critical('Missing Server Driver on Prisma driver.');
            return false;
        }
        this.prisma = props.prisma;
        this.model = props.model;
        this.server = props.server;
        this.requiredFields = [];
        this.fieldTypes = {};
        this.idFieldType = 'String';
        this.initFieldMetadata();
    }

    initFieldMetadata()
    {
        try {
            let dmmf = this.prisma._runtimeDataModel || Prisma.dmmf?.datamodel;
            if(!dmmf){
                return;
            }
            let modelName = this.tableName().toLowerCase();
            let modelInfo = dmmf.models?.[modelName] || dmmf.models?.find(m => m.name.toLowerCase() === modelName);
            if(!modelInfo){
                return;
            }
            for(let field of modelInfo.fields){
                if(field.isRequired && !field.hasDefaultValue && !field.isId){
                    this.requiredFields.push(field.name);
                }
                this.fieldTypes[field.name] = field.type;
                if(field.isId){
                    this.idFieldType = field.type;
                }
            }
        } catch(error) {
            Logger.warning('Could not initialize field metadata: '+error.message);
        }
    }

    castIdValue(id)
    {
        if(null === id || undefined === id){
            return id;
        }
        if('Int' === this.idFieldType || 'BigInt' === this.idFieldType){
            let numericId = Number(id);
            if(!isNaN(numericId)){
                return numericId;
            }
        }
        return String(id);
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
        return this.model.name || '';
    }

    property(propertyName)
    {
        return this.rawModel[propertyName] || null;
    }

    prepareData(params)
    {
        let data = {...params};
        for(let key of Object.keys(data)){
            if('status' === key && 'number' === typeof data[key]){
                data[key] = String(data[key]);
            }
            if(this.isDateTimeField(key)){
                data[key] = this.convertToDate(data[key], key);
            }
        }
        return data;
    }

    isDateTimeField(fieldName)
    {
        let fieldType = this.fieldTypes[fieldName];
        return fieldType === 'DateTime' || fieldType === 'Date';
    }

    convertToDate(dateValue, fieldName)
    {
        if(dateValue instanceof Date){
            return dateValue;
        }
        if(!dateValue || '' === dateValue){
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
            return new Date(dateString);
        } catch(error) {
            Logger.warning('Failed to convert date value: '+dateString);
            return dateValue;
        }
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
            if(sc.hasOwn(value, 'operator') && sc.hasOwn(value, 'value')){
                let operatorValue = value.value;
                if('id' === key && sc.isArray(operatorValue)){
                    operatorValue = operatorValue.map(id => this.castIdValue(id));
                }
                if('id' === key && !sc.isArray(operatorValue)){
                    operatorValue = this.castIdValue(operatorValue);
                }
                processedFilters[key] = this.applyOperator(operatorValue, value.operator);
                continue;
            }
            if(sc.isObject(value) && !sc.isArray(value)){
                processedFilters[key] = this.processFilters(value);
                continue;
            }
            if('id' === key && sc.isArray(value)){
                processedFilters[key] = value.map(id => this.castIdValue(id));
                continue;
            }
            if('id' === key){
                processedFilters[key] = this.castIdValue(value);
                continue;
            }
            processedFilters[key] = value;
        }
        return processedFilters;
    }

    async create(params)
    {
        try {
            let preparedData = this.prepareData(params);
            this.ensureRequiredFields(preparedData);
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
        try {
            let preparedData = this.prepareData(params);
            this.ensureRequiredFields(preparedData);
            let createData = {data: preparedData};
            if(sc.isArray(relations) && 0 < relations.length){
                for(let relation of relations){
                    if(!sc.hasOwn(params, relation)){
                        continue;
                    }
                    let relationData = params[relation];
                    if(sc.isArray(relationData)){
                        createData.data[relation] = {
                            connect: relationData.map(item => ({id: this.castIdValue(item.id)}))
                        };
                        continue;
                    }
                    createData.data[relation] = {
                        connect: {id: this.castIdValue(relationData.id)}
                    };
                }
            }
            return await this.model.create(createData);
        } catch(error) {
            Logger.error('Create with relations error: '+error.message);
            return false;
        }
    }

    async update(filters, updatePatch)
    {
        try {
            let preparedData = this.prepareData(updatePatch);
            let processedFilters = this.processFilters(filters);
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
        try {
            let preparedData = this.prepareData(updatePatch);
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
        try {
            let castedId = this.castIdValue(id);
            let found = await this.loadById(castedId);
            if(!found){
                return false;
            }
            let preparedData = this.prepareData(params);
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
        try {
            let preparedData = this.prepareData(params);
            let existing = false;
            if(params.id){
                let castedId = this.castIdValue(params.id);
                existing = await this.loadById(castedId);
                if(existing){
                    let patch = Object.assign({}, preparedData);
                    delete patch.id;
                    return await this.model.update({
                        where: {id: castedId},
                        data: patch
                    });
                }
            }
            if(filters){
                let existing = await this.loadOne(filters);
                if(existing){
                    return await this.model.update({
                        where: {id: this.castIdValue(existing.id)},
                        data: preparedData
                    });
                }
            }
            return await this.create(preparedData);
        } catch(error) {
            Logger.error('Upsert error: '+error.message);
            return false;
        }
    }

    async delete(filters = {})
    {
        try {
            let processedFilters = this.processFilters(filters);
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
        try {
            let castedId = this.castIdValue(id);
            let found = await this.loadById(castedId);
            if(!found){
                return false;
            }
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
        try {
            let processedFilters = this.processFilters(filters);
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
        try {
            let processedFilters = this.processFilters(filters);
            let query = {
                where: processedFilters
            };
            if(sc.isArray(relations) && 0 < relations.length){
                query.include = this.buildIncludeObject(relations);
            }
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
        try {
            let query = this.buildQueryOptions();
            if(sc.isArray(relations) && 0 < relations.length){
                query.include = this.buildIncludeObject(relations);
            }
            return await this.model.findMany(query);
        } catch(error) {
            Logger.error('Load all with relations error: '+error.message);
            return [];
        }
    }

    async load(filters)
    {
        try {
            let processedFilters = this.processFilters(filters);
            let query = this.buildQueryOptions();
            query.where = processedFilters;
            return await this.model.findMany(query);
        } catch(error) {
            Logger.error('Load error: '+error.message);
            return [];
        }
    }

    async loadWithRelations(filters, relations)
    {
        try {
            let processedFilters = this.processFilters(filters);
            let query = this.buildQueryOptions();
            query.where = processedFilters;
            if(sc.isArray(relations) && 0 < relations.length){
                query.include = this.buildIncludeObject(relations);
            }
            return await this.model.findMany(query);
        } catch(error) {
            Logger.error('Load with relations error: '+error.message);
            return [];
        }
    }

    async loadBy(field, fieldValue, operator = null)
    {
        try {
            let filter = this.createSingleFilter(field, fieldValue, operator);
            let query = this.buildQueryOptions();
            query.where = filter;
            return await this.model.findMany(query);
        } catch(error) {
            Logger.error('Load by error: '+error.message);
            return [];
        }
    }

    async loadByWithRelations(field, fieldValue, relations, operator = null)
    {
        try {
            let filter = this.createSingleFilter(field, fieldValue, operator);
            let query = this.buildQueryOptions();
            query.where = filter;
            if(sc.isArray(relations) && 0 < relations.length){
                query.include = this.buildIncludeObject(relations);
            }
            return await this.model.findMany(query);
        } catch(error) {
            Logger.error('Load by with relations error: '+error.message);
            return [];
        }
    }

    async loadById(id)
    {
        try {
            let castedId = this.castIdValue(id);
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
        try {
            let castedId = this.castIdValue(id);
            let query = {
                where: {id: castedId}
            };
            if(sc.isArray(relations) && 0 < relations.length){
                query.include = this.buildIncludeObject(relations);
            }
            return await this.model.findUnique(query);
        } catch(error) {
            Logger.error('Load by ID with relations error: '+error.message);
            return null;
        }
    }

    async loadByIds(ids)
    {
        try {
            let castedIds = ids.map(id => this.castIdValue(id));
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
        try {
            let processedFilters = this.processFilters(filters);
            let query = this.buildQueryOptions(false);
            query.where = processedFilters;
            return await this.model.findFirst(query);
        } catch(error) {
            Logger.error('Load one error: '+error.message);
            return null;
        }
    }

    async loadOneWithRelations(filters, relations)
    {
        try {
            let processedFilters = this.processFilters(filters);
            let query = this.buildQueryOptions(false);
            query.where = processedFilters;
            if(sc.isArray(relations) && 0 < relations.length){
                query.include = this.buildIncludeObject(relations);
            }
            return await this.model.findFirst(query);
        } catch(error) {
            Logger.error('Load one with relations error: '+error.message);
            return null;
        }
    }

    async loadOneBy(field, fieldValue, operator = null)
    {
        try {
            let filter = this.createSingleFilter(field, fieldValue, operator);
            let query = this.buildQueryOptions(false);
            query.where = filter;
            return await this.model.findFirst(query);
        } catch(error) {
            Logger.error('Load one by error: '+error.message);
            return null;
        }
    }

    async loadOneByWithRelations(field, fieldValue, relations, operator = null)
    {
        try {
            let filter = this.createSingleFilter(field, fieldValue, operator);
            let query = this.buildQueryOptions(false);
            query.where = filter;
            if(sc.isArray(relations) && 0 < relations.length){
                query.include = this.buildIncludeObject(relations);
            }
            return await this.model.findFirst(query);
        } catch(error) {
            Logger.error('Load one by with relations error: '+error.message);
            return null;
        }
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
        if(null === operator){
            filter[field] = fieldValue;
            return filter;
        }
        filter[field] = this.applyOperator(fieldValue, operator);
        return filter;
    }

    applyOperator(value, operator)
    {
        let operatorsMap = {
            '=': value,
            '!=': {not: value},
            '>': {gt: value},
            '>=': {gte: value},
            '<': {lt: value},
            '<=': {lte: value},
            'LIKE': {contains: value},
            'IN': {in: value},
            'NOT IN': {notIn: value}
        };
        return operatorsMap[operator] || value;
    }

    buildIncludeObject(relations)
    {
        let include = {};
        for(let relation of relations){
            include[relation] = true;
        }
        return include;
    }

}

module.exports.PrismaDriver = PrismaDriver;
