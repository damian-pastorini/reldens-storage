/**
 *
 * Reldens - PrismaRelationResolver
 *
 */

const { sc } = require('@reldens/utils');

class PrismaRelationResolver
{

    constructor(props)
    {
        this.relationMetadata = sc.get(props, 'relationMetadata', {});
        this.relationAliases = sc.get(props, 'relationAliases', {});
        this.metadataLoader = sc.get(props, 'metadataLoader', null);
    }

    updateMetadata(metadata)
    {
        this.relationMetadata = sc.get(metadata, 'relationMetadata', this.relationMetadata);
        this.relationAliases = sc.get(metadata, 'relationAliases', this.relationAliases);
    }

    buildRelationAliases(tableName)
    {
        let normalizedTableName = tableName.toLowerCase();
        for(let prismaRelation of Object.keys(this.relationMetadata)){
            let meta = this.relationMetadata[prismaRelation];
            let relatedModel = meta.model.toLowerCase();
            let aliases = this.generateRelationAliases(prismaRelation, relatedModel, normalizedTableName);
            for(let alias of aliases){
                this.relationAliases[alias] = prismaRelation;
            }
        }
        return this.relationAliases;
    }

    generateRelationAliases(prismaRelation, relatedModel, tableName)
    {
        let aliases = [];
        aliases.push('related_'+relatedModel);
        aliases.push(relatedModel);
        let fkHint = this.extractForeignKeyHint(prismaRelation, relatedModel, tableName);
        if(fkHint){
            aliases.push('related_'+relatedModel+'_'+fkHint);
            aliases.push(relatedModel+'_'+fkHint);
        }
        return aliases;
    }

    extractForeignKeyHint(prismaRelation, relatedModel, tableName)
    {
        let toSuffix = 'To'+tableName;
        if(!prismaRelation.toLowerCase().endsWith(toSuffix.toLowerCase())){
            return null;
        }
        let withoutToSuffix = prismaRelation.slice(0, -toSuffix.length);
        let prefix = relatedModel+'_';
        if(withoutToSuffix.toLowerCase().startsWith(prefix.toLowerCase())){
            withoutToSuffix = withoutToSuffix.slice(prefix.length);
            if(withoutToSuffix.toLowerCase().startsWith(prefix.toLowerCase())){
                withoutToSuffix = withoutToSuffix.slice(prefix.length);
            }
        }
        if(withoutToSuffix.endsWith('_id')){
            return withoutToSuffix.slice(0, -3);
        }
        return withoutToSuffix;
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
        if(sc.hasOwn(this.relationAliases, relationName)){
            return this.relationAliases[relationName];
        }
        if(relationName.startsWith('related_')){
            let withoutPrefix = relationName.substring(8);
            if(sc.hasOwn(this.relationMetadata, withoutPrefix)){
                return withoutPrefix;
            }
            if(sc.hasOwn(this.relationAliases, withoutPrefix)){
                return this.relationAliases[withoutPrefix];
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

    buildIncludeObjectWithMapping(relations)
    {
        let include = {};
        let mapping = {};
        for(let relation of relations){
            if(-1 !== relation.indexOf('.')){
                this.buildNestedInclude(relation, include, mapping);
                continue;
            }
            let normalizedRelation = this.normalizeRelationName(relation);
            if(!sc.hasOwn(this.relationMetadata, normalizedRelation)){
                continue;
            }
            include[normalizedRelation] = true;
            if(relation !== normalizedRelation){
                mapping[normalizedRelation] = relation;
            }
        }
        return {include, mapping};
    }

    buildNestedInclude(relationPath, include, mapping)
    {
        let parts = relationPath.split('.');
        let rootPart = parts.shift();
        let normalizedRoot = this.normalizeRelationName(rootPart);
        if(!sc.hasOwn(this.relationMetadata, normalizedRoot)){
            return;
        }
        if(!sc.hasOwn(include, normalizedRoot) || true === include[normalizedRoot]){
            include[normalizedRoot] = {include: {}};
        }
        if(rootPart !== normalizedRoot){
            mapping[normalizedRoot] = rootPart;
        }
        if(0 === parts.length){
            return;
        }
        let nestedPath = parts.join('.');
        let relatedModel = this.relationMetadata[normalizedRoot].model;
        this.buildNestedIncludeForModel(nestedPath, include[normalizedRoot].include, mapping, relatedModel);
    }

    buildNestedIncludeForModel(relationPath, include, mapping, modelName)
    {
        if(!this.metadataLoader){
            return;
        }
        let dmmf = this.metadataLoader.getDmmf();
        if(!dmmf){
            return;
        }
        let modelInfo = dmmf.models?.[modelName.toLowerCase()]
            || dmmf.models?.find(m => m.name.toLowerCase() === modelName.toLowerCase());
        if(!modelInfo){
            return;
        }
        let relationFields = {};
        let tableName = modelName.toLowerCase();
        for(let field of modelInfo.fields){
            if('object' === field.kind){
                relationFields[field.name] = {
                    model: field.type,
                    isList: field.isList
                };
            }
        }
        let parts = relationPath.split('.');
        let currentPart = parts.shift();
        let normalizedPart = this.normalizeNestedRelation(currentPart, relationFields, tableName);
        if(!normalizedPart){
            return;
        }
        if(0 === parts.length){
            include[normalizedPart] = true;
            if(currentPart !== normalizedPart){
                mapping[normalizedPart] = currentPart;
            }
            return;
        }
        if(!sc.hasOwn(include, normalizedPart) || true === include[normalizedPart]){
            include[normalizedPart] = {include: {}};
        }
        if(currentPart !== normalizedPart){
            mapping[normalizedPart] = currentPart;
        }
        let nestedPath = parts.join('.');
        let nestedModel = relationFields[normalizedPart].model;
        this.buildNestedIncludeForModel(nestedPath, include[normalizedPart].include, mapping, nestedModel);
    }

    normalizeNestedRelation(relationName, relationFields, tableName)
    {
        if(sc.hasOwn(relationFields, relationName)){
            return relationName;
        }
        let cleanName = relationName.replace('related_', '');
        if(sc.hasOwn(relationFields, cleanName)){
            return cleanName;
        }
        for(let fieldName of Object.keys(relationFields)){
            let relatedModel = relationFields[fieldName].model.toLowerCase();
            let fkHint = this.extractForeignKeyHint(fieldName, relatedModel, tableName);
            if(fkHint){
                let possibleNames = [
                    'related_'+relatedModel+'_'+fkHint,
                    relatedModel+'_'+fkHint,
                    'related_'+relatedModel,
                    relatedModel
                ];
                if(-1 !== possibleNames.indexOf(cleanName) || -1 !== possibleNames.indexOf(relationName)){
                    return fieldName;
                }
            }
        }
        return null;
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

}

module.exports.PrismaRelationResolver = PrismaRelationResolver;
