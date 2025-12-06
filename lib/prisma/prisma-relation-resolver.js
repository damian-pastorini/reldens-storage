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
        this.metadataLoader = sc.get(props, 'metadataLoader', null);
        this.allRelationMappings = sc.get(props, 'allRelationMappings', {});
        this.currentModelMappings = {};
        this.reverseModelMappings = {};
    }

    updateMetadata(metadata)
    {
        this.relationMetadata = sc.get(metadata, 'relationMetadata', this.relationMetadata);
    }

    setCurrentModelMappings(mappings)
    {
        this.currentModelMappings = mappings || {};
        this.reverseModelMappings = this.buildReverseMappings(this.currentModelMappings);
    }

    buildReverseMappings(mappings)
    {
        let reverse = {};
        for(let reldensName of Object.keys(mappings)){
            let prismaName = mappings[reldensName];
            reverse[prismaName] = reldensName;
        }
        return reverse;
    }

    getAllRelations()
    {
        return Object.keys(this.relationMetadata || {});
    }

    mapToPrismaName(reldensName, modelName)
    {
        if(!modelName){
            if(sc.hasOwn(this.relationMetadata, reldensName)){
                return reldensName;
            }
            if(sc.hasOwn(this.currentModelMappings, reldensName)){
                return this.currentModelMappings[reldensName];
            }
            return null;
        }
        let modelMappings = sc.get(this.allRelationMappings, modelName.toLowerCase(), {});
        if(sc.hasOwn(modelMappings, reldensName)){
            return modelMappings[reldensName];
        }
        return null;
    }

    mapToReldensName(prismaName)
    {
        if(sc.hasOwn(this.reverseModelMappings, prismaName)){
            return this.reverseModelMappings[prismaName];
        }
        return prismaName;
    }

    getRelatedModelName(prismaName, fromModelName)
    {
        if(!fromModelName){
            let meta = sc.get(this.relationMetadata, prismaName, null);
            if(meta){
                return meta.model;
            }
            return null;
        }
        if(!this.metadataLoader){
            return null;
        }
        let dmmf = this.metadataLoader.getDmmf();
        if(!dmmf){
            return null;
        }
        let modelInfo = this.findModelInDmmf(dmmf, fromModelName);
        if(!modelInfo){
            return null;
        }
        for(let field of modelInfo.fields){
            if(field.name === prismaName && 'object' === field.kind){
                return field.type;
            }
        }
        return null;
    }

    findModelInDmmf(dmmf, modelName)
    {
        let lowerName = modelName.toLowerCase();
        if(sc.hasOwn(dmmf.models, lowerName)){
            return dmmf.models[lowerName];
        }
        if(sc.isArray(dmmf.models)){
            for(let model of dmmf.models){
                if(model.name.toLowerCase() === lowerName){
                    return model;
                }
            }
        }
        return null;
    }

    buildIncludeObjectWithMapping(relations)
    {
        let include = {};
        let mapping = {};
        for(let relation of relations){
            this.processRelationPath(relation, include, mapping);
        }
        return {include, mapping};
    }

    processRelationPath(relationPath, include, mapping)
    {
        let parts = relationPath.split('.');
        let currentInclude = include;
        let currentModelName = null;
        for(let i = 0; i < parts.length; i++){
            let reldensName = parts[i];
            let prismaName = this.mapToPrismaName(reldensName, currentModelName);
            if(!prismaName){
                return;
            }
            if(reldensName !== prismaName){
                mapping[prismaName] = reldensName;
            }
            let isLastPart = (i === parts.length - 1);
            if(isLastPart){
                currentInclude[prismaName] = true;
                return;
            }
            if(!sc.hasOwn(currentInclude, prismaName) || true === currentInclude[prismaName]){
                currentInclude[prismaName] = {include: {}};
            }
            currentModelName = this.getRelatedModelName(prismaName, currentModelName);
            if(!currentModelName){
                return;
            }
            currentInclude = currentInclude[prismaName].include;
        }
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
        for(let prismaName of Object.keys(includeConfig)){
            if(!sc.hasOwn(transformed, prismaName)){
                continue;
            }
            let relationValue = transformed[prismaName];
            let nestedConfig = includeConfig[prismaName];
            if(sc.isObject(nestedConfig) && sc.hasOwn(nestedConfig, 'include')){
                relationValue = this.transformRelationResults(relationValue, nestedConfig.include, relationMapping);
            }
            let reldensName = sc.get(relationMapping, prismaName, null);
            if(!reldensName){
                reldensName = this.mapToReldensName(prismaName);
            }
            transformed[reldensName] = relationValue;
            if(reldensName !== prismaName){
                delete transformed[prismaName];
            }
        }
        return transformed;
    }

}

module.exports.PrismaRelationResolver = PrismaRelationResolver;
