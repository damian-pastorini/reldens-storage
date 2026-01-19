/**
 *
 * Reldens - PrismaTypeCaster
 *
 */

const { Logger, sc } = require('@reldens/utils');

class PrismaTypeCaster
{

    constructor(props)
    {
        this.idFieldType = sc.get(props, 'idFieldType', 'String');
        this.jsonFields = sc.get(props, 'jsonFields', new Set());
        this.fieldTypes = sc.get(props, 'fieldTypes', {});
        this.fieldDefaults = sc.get(props, 'fieldDefaults', {});
        this.requiredFields = sc.get(props, 'requiredFields', []);
        this.optionalFields = sc.get(props, 'optionalFields', []);
        this.rawModel = sc.get(props, 'rawModel', false);
        this.prismaDbNull = sc.get(props, 'prismaDbNull', null);
    }

    updateMetadata(metadata)
    {
        this.idFieldType = sc.get(metadata, 'idFieldType', this.idFieldType);
        this.jsonFields = sc.get(metadata, 'jsonFields', this.jsonFields);
        this.fieldTypes = sc.get(metadata, 'fieldTypes', this.fieldTypes);
        this.fieldDefaults = sc.get(metadata, 'fieldDefaults', this.fieldDefaults);
        this.requiredFields = sc.get(metadata, 'requiredFields', this.requiredFields);
        this.optionalFields = sc.get(metadata, 'optionalFields', this.optionalFields);
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

    isNullOrEmpty(value)
    {
        return null === value || undefined === value || '' === value;
    }

    isValidCastedValue(value)
    {
        return undefined !== value;
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
            Logger.warning('Cannot cast non-numeric value "'+value+'" to ID type '+this.idFieldType);
            return null;
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
            return new Date(dateString.replace(' ', 'T')+'Z');
        }
        if(dateString.match(/^\d{4}-\d{2}-\d{2}$/)){
            return new Date(dateString+'T00:00:00Z');
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
            return this.prismaDbNull || null;
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

    normalizeReturnData(data)
    {
        if(null === data || undefined === data){
            return data;
        }
        if('bigint' === typeof data){
            return Number(data);
        }
        if(data instanceof Date){
            return data;
        }
        if(sc.isArray(data)){
            return data.map(item => this.normalizeReturnData(item));
        }
        if(sc.isObject(data)){
            let result = {};
            for(let key of Object.keys(data)){
                result[key] = this.normalizeReturnData(data[key]);
            }
            return result;
        }
        return data;
    }

}

module.exports.PrismaTypeCaster = PrismaTypeCaster;
