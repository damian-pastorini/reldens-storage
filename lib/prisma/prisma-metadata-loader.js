/**
 *
 * Reldens - PrismaMetadataLoader
 *
 */

const { Logger, sc } = require('@reldens/utils');

class PrismaMetadataLoader
{

    constructor(props)
    {
        this.prisma = sc.get(props, 'prisma', null);
        this.rawModel = sc.get(props, 'rawModel', null);
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
            return null;
        } catch(error) {
            Logger.warning('Failed to access DMMF: '+error.message);
            return null;
        }
    }

    loadModelMetadata(tableName)
    {
        let dmmf = this.getDmmf();
        if(!dmmf){
            Logger.warning('Could not access Prisma DMMF metadata');
            return null;
        }
        let modelName = tableName.toLowerCase();
        let modelInfo = dmmf.models?.[modelName] || dmmf.models?.find(m => m.name.toLowerCase() === modelName);
        if(!modelInfo){
            Logger.warning('Could not find model info for: '+modelName);
            return null;
        }
        let metadata = {
            requiredFields: [],
            optionalFields: [],
            fieldTypes: {},
            fieldDefaults: {},
            idFieldType: 'String',
            idFieldName: 'id',
            referenceFields: {},
            relationMetadata: {},
            foreignKeyMappings: {},
            foreignKeyTargetFields: {},
            jsonFields: new Set()
        };
        for(let field of modelInfo.fields){
            this.processFieldMetadata(field, metadata);
        }
        if(this.rawModel && this.rawModel.relationTypes){
            for(let relationName of Object.keys(this.rawModel.relationTypes)){
                if(sc.hasOwn(metadata.relationMetadata, relationName)){
                    metadata.relationMetadata[relationName].type = this.rawModel.relationTypes[relationName];
                }
            }
        }
        return metadata;
    }

    processFieldMetadata(field, metadata)
    {
        metadata.fieldTypes[field.name] = field.type;
        if('Json' === field.type){
            metadata.jsonFields.add(field.name);
        }
        let isIdField = field.isId || ('id' === field.name && 'scalar' === field.kind);
        if(isIdField){
            metadata.idFieldType = field.type;
            metadata.idFieldName = field.name;
        }
        if(field.hasDefaultValue){
            metadata.fieldDefaults[field.name] = field.default;
        }
        if(field.isRequired && !field.hasDefaultValue && !field.isId && 'object' !== field.kind){
            metadata.requiredFields.push(field.name);
        }
        if(field.isOptional || field.hasDefaultValue){
            metadata.optionalFields.push(field.name);
        }
        if(field.kind === 'scalar' && field.isList === false){
            let isNumericType = this.isNumericFieldType(field.type);
            let isReferenceField = field.relationFromFields && 0 < field.relationFromFields.length;
            if(isNumericType || isReferenceField){
                metadata.referenceFields[field.name] = field.type;
            }
        }
        if('object' === field.kind){
            let relationType = field.isList ? 'many' : 'one';
            metadata.relationMetadata[field.name] = {
                type: relationType,
                model: field.type,
                isList: field.isList,
                isOptional: field.isOptional
            };
        }
        if('object' === field.kind && sc.hasOwn(field, 'relationFromFields') && sc.isArray(field.relationFromFields)){
            let relationToFields = sc.get(field, 'relationToFields', []);
            let index = 0;
            for(let foreignKeyField of field.relationFromFields){
                metadata.foreignKeyMappings[foreignKeyField] = field.name;
                metadata.foreignKeyTargetFields[foreignKeyField] = relationToFields[index] || 'id';
                index++;
            }
        }
    }

    isNumericFieldType(fieldType)
    {
        return ('Int' === fieldType || 'BigInt' === fieldType || 'Float' === fieldType || 'Decimal' === fieldType);
    }

}

module.exports.PrismaMetadataLoader = PrismaMetadataLoader;
