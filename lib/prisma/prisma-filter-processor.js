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
    }

    updateMetadata(metadata)
    {
        this.fieldTypes = sc.get(metadata, 'fieldTypes', this.fieldTypes);
        this.referenceFields = sc.get(metadata, 'referenceFields', this.referenceFields);
        this.jsonFields = sc.get(metadata, 'jsonFields', this.jsonFields);
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

}

module.exports.PrismaFilterProcessor = PrismaFilterProcessor;
