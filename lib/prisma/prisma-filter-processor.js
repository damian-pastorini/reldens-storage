/**
 *
 * Reldens - PrismaFilterProcessor
 *
 */

const { sc } = require('@reldens/utils');

class PrismaFilterProcessor
{

    constructor(props)
    {
        this.typeCaster = sc.get(props, 'typeCaster', null);
        this.fieldTypes = sc.get(props, 'fieldTypes', {});
        this.referenceFields = sc.get(props, 'referenceFields', {});
        this.jsonFields = sc.get(props, 'jsonFields', new Set());
        this.operatorsMap = sc.get(props, 'operatorsMap', {});
        this.relationResolver = sc.get(props, 'relationResolver', null);
    }

    updateMetadata(metadata)
    {
        this.fieldTypes = sc.get(metadata, 'fieldTypes', this.fieldTypes);
        this.referenceFields = sc.get(metadata, 'referenceFields', this.referenceFields);
        this.jsonFields = sc.get(metadata, 'jsonFields', this.jsonFields);
        this.relationResolver = sc.get(metadata, 'relationResolver', this.relationResolver);
    }

    processFilters(filters)
    {
        if(!sc.isObject(filters)){
            return filters;
        }
        let processedFilters = {};
        for(let key of Object.keys(filters)){
            let value = filters[key];
            if(('AND' === key || 'OR' === key) && sc.isArray(value)){
                if(0 === value.length){
                    continue;
                }
                processedFilters[key] = value.map(condition => this.processFilters(condition));
                continue;
            }
            let translatedKey = this.translateRelationKey(key);
            if(sc.hasOwn(value, 'operator') && sc.hasOwn(value, 'value')){
                let operatorValue = this.processFilterValue(value.value, translatedKey);
                processedFilters[translatedKey] = this.applyOperator(operatorValue, value.operator, translatedKey);
                continue;
            }
            if(sc.isObject(value) && !sc.isArray(value)){
                if(this.isRelationKey(key)){
                    processedFilters[translatedKey] = {
                        some: this.processFilters(value)
                    };
                    continue;
                }
                processedFilters[translatedKey] = this.processFilters(value);
                continue;
            }
            processedFilters[translatedKey] = this.processFilterValue(value, translatedKey);
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
        if(!fieldType){
            return value;
        }
        let castedValue = this.typeCaster.castValue(value, fieldType, key);
        if(this.typeCaster.isValidCastedValue(castedValue)){
            return castedValue;
        }
        return value;
    }

    applyOperator(value, operator, fieldName = null)
    {
        let upperOperator = operator ? operator.toUpperCase() : '';
        if('LIKE' === upperOperator){
            return this.handleLikeOperator(value, fieldName);
        }
        if('IN' === upperOperator){
            return {in: value};
        }
        if('NOT IN' === upperOperator){
            return {notIn: value};
        }
        if('NOT' === upperOperator){
            return {not: value};
        }
        let sqlOperator = this.operatorsMap[upperOperator] || upperOperator;
        let prismaSyntaxMap = {
            '=': value,
            '!=': {not: value},
            '>': {gt: value},
            '>=': {gte: value},
            '<': {lt: value},
            '<=': {lte: value}
        };
        return prismaSyntaxMap[sqlOperator] || value;
    }

    handleLikeOperator(value, fieldName)
    {
        let cleanValue = String(value).replace(/%/g, '');
        if(this.isJsonField(fieldName)){
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
        if(!this.jsonFields){
            return false;
        }
        if(this.jsonFields.has(fieldName)){
            return true;
        }
        return this.typeCaster && this.typeCaster.isJsonFieldByName(fieldName);
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

    translateRelationKey(key)
    {
        if(!this.relationResolver){
            return key;
        }
        let prismaName = this.relationResolver.mapToPrismaName(key, null);
        if(prismaName){
            return prismaName;
        }
        return key;
    }

    isRelationKey(key)
    {
        if(!this.relationResolver){
            return false;
        }
        let prismaName = this.relationResolver.mapToPrismaName(key, null);
        if(prismaName && prismaName !== key){
            return true;
        }
        let relationMetadata = sc.get(this.relationResolver, 'relationMetadata', {});
        return sc.hasOwn(relationMetadata, key);
    }

}

module.exports.PrismaFilterProcessor = PrismaFilterProcessor;
