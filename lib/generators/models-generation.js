/**
 *
 * Reldens - ModelsGeneration
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');
const { TypeMapper } = require('../type-mapper');
const { BaseGenerator } = require('./base-generator');

class ModelsGeneration extends BaseGenerator
{

    constructor(props)
    {
        super();
        this.modelsFolder = sc.get(props, 'modelsFolder', '');
        this.templates = sc.get(props, 'templates', {});
        this.generatedModels = {};
        this.allTablesData = {};
    }

    async generateModelFile(tableName, tableData, driverKey, entityInfo, relationMetadata = {})
    {
        let modelTemplatePath = this.templates[driverKey];
        if(!FileHandler.exists(modelTemplatePath)){
            Logger.critical('Model template file "'+modelTemplatePath+'" not found for driver "'+driverKey+'".');
            return false;
        }
        let modelTemplateContent = FileHandler.fetchFileContents(modelTemplatePath);
        if(!modelTemplateContent){
            Logger.critical('Failed to read model template file: '+modelTemplatePath);
            return false;
        }
        let modelClassName = sc.capitalizedCamelCase(tableName)+'Model';
        let modelPropertiesList = Object.keys(tableData.columns).join(', ');
        let modelPropertiesConstructor = Object.keys(tableData.columns)
            .map(columnName => 'this.'+columnName+' = '+columnName+';')
            .join('\n        ');
        let modelRelations = this.generateModelRelations(tableName, tableData, relationMetadata, driverKey);
        let entityPropertiesDefinition = this.getEntityPropertiesDefinition(tableData.columns, driverKey);
        let replacements = {
            modelClassName,
            tableName: 'prisma' === driverKey ? tableName.toLowerCase() : tableName,
            modelPropertiesList,
            modelPropertiesConstructor,
            modelRelations,
            entityPropertiesDefinition
        };
        let modelContent = this.applyReplacements(modelTemplateContent, replacements);
        let fileName = sc.kebabCase(tableName)+'-model.js';
        let driverFolder = FileHandler.joinPaths(this.modelsFolder, driverKey);
        FileHandler.createFolder(driverFolder);
        let filePath = FileHandler.joinPaths(driverFolder, fileName);
        if(!FileHandler.writeFile(filePath, modelContent)){
            Logger.critical('Failed to write model file: '+fileName);
            return false;
        }
        Logger.info('Generated model file: '+fileName);
        this.generatedModels[tableName] = {
            modelClassName,
            modelFileName: fileName,
            driverKey
        };
        return true;
    }

    setAllTablesData(allTablesData)
    {
        this.allTablesData = allTablesData;
    }

    generateModelRelations(tableName, tableData, relationMetadata, driverKey)
    {
        if('prisma' === driverKey){
            return this.generatePrismaRelations(relationMetadata);
        }
        if('objection-js' === driverKey){
            return this.generateObjectionJsRelations(tableName, tableData);
        }
        return '';
    }

    generatePrismaRelations(relationMetadata)
    {
        if(!relationMetadata || 0 === Object.keys(relationMetadata).length){
            return '';
        }
        let relationTypesArray = [];
        for(let relationName of Object.keys(relationMetadata)){
            let relation = relationMetadata[relationName];
            relationTypesArray.push('        '+relationName+': \''+relation.type+'\'');
        }
        if(0 === relationTypesArray.length){
            return '';
        }
        return '\n\n    static get relationTypes()\n    {\n        return {\n    '+relationTypesArray.join(',\n    ')+'\n        };\n    }';
    }

    generateObjectionJsRelations(tableName, tableData)
    {
        let relations = this.detectObjectionJsRelations(tableName, tableData);
        let reverseRelations = this.detectReverseObjectionJsRelations(tableName);
        let allRelations = Object.assign({}, relations, reverseRelations);
        if(0 === Object.keys(allRelations).length){
            return '';
        }
        let relationMappings = [];
        let requiredModels = [];
        for(let relationKey of Object.keys(allRelations)){
            let relation = allRelations[relationKey];
            let tableReference = relation.referencedTable || relation.referencingTable;
            let relatedModelClass = sc.capitalizedCamelCase(tableReference)+'Model';
            if(!requiredModels.find(m => m.modelClass === relatedModelClass)){
                requiredModels.push({
                    modelClass: relatedModelClass,
                    fileName: sc.kebabCase(tableReference)+'-model'
                });
            }
            let relationMapping = '            '+relationKey+': {\n';
            relationMapping += '                relation: this.'+relation.relationType+',\n';
            relationMapping += '                modelClass: '+relatedModelClass+',\n';
            relationMapping += '                join: {\n';
            relationMapping += '                    from: this.tableName+\'.'+relation.fromColumn+'\',\n';
            relationMapping += '                    to: '+relatedModelClass+'.tableName+\'.'+relation.toColumn+'\'\n';
            relationMapping += '                }\n';
            relationMapping += '            }';
            relationMappings.push(relationMapping);
        }
        if(0 === relationMappings.length){
            return '';
        }
        let requireStatements = [];
        for(let modelInfo of requiredModels){
            requireStatements.push('        const { '+modelInfo.modelClass+' } = require(\'./'+modelInfo.fileName+'\');');
        }
        let relationMappingsMethod = '\n\n    static get relationMappings()\n    {\n';
        relationMappingsMethod += requireStatements.join('\n')+'\n';
        relationMappingsMethod += '        return {\n';
        relationMappingsMethod += relationMappings.join(',\n');
        relationMappingsMethod += '\n        };\n';
        relationMappingsMethod += '    }';
        return relationMappingsMethod;
    }

    detectObjectionJsRelations(tableName, tableData)
    {
        let relations = {};
        for(let columnName of Object.keys(tableData.columns)){
            let column = tableData.columns[columnName];
            if(!sc.hasOwn(column, 'referencedTable')){
                continue;
            }
            let relationKey = 'related_'+column.referencedTable;
            let relationType = this.determineRelationType(column, true);
            relations[relationKey] = {
                fromColumn: columnName,
                toColumn: column.referencedColumn,
                referencedTable: column.referencedTable,
                relationType: relationType
            };
        }
        return relations;
    }

    detectReverseObjectionJsRelations(tableName)
    {
        let reverseRelations = {};
        for(let otherTableName of Object.keys(this.allTablesData)){
            if(otherTableName === tableName){
                continue;
            }
            let otherTableData = this.allTablesData[otherTableName];
            for(let columnName of Object.keys(otherTableData.columns)){
                let column = otherTableData.columns[columnName];
                if(!sc.hasOwn(column, 'referencedTable')){
                    continue;
                }
                if(column.referencedTable !== tableName){
                    continue;
                }
                let relationKey = 'related_'+otherTableName;
                let relationType = this.determineRelationType(column, false);
                reverseRelations[relationKey] = {
                    fromColumn: column.referencedColumn,
                    toColumn: columnName,
                    referencingTable: otherTableName,
                    relationType: relationType
                };
            }
        }
        return reverseRelations;
    }

    determineRelationType(column, isForwardRelation)
    {
        if(isForwardRelation){
            if('PRI' === column.key){
                return 'HasOneRelation';
            }
            return 'BelongsToOneRelation';
        }
        if('PRI' === column.key){
            return 'HasOneRelation';
        }
        return 'HasManyRelation';
    }

    getEntityPropertiesDefinition(columns, driverKey)
    {
        if('mikro-orm' === driverKey){
            let entityProps = [];
            for(let columnName of Object.keys(columns)){
                let column = columns[columnName];
                let isPrimary = 'PRI' === column.key;
                let type = TypeMapper.mapDbTypeToJsType(column.type);
                let propDef = columnName+': { type: \''+type+'\'';
                if(isPrimary){
                    propDef += ', primary: true';
                }
                if(column.nullable){
                    propDef += ', nullable: true';
                }
                propDef += ' }';
                entityProps.push(propDef);
            }
            return entityProps.join(',\n        ');
        }
        if('prisma' === driverKey){
            let prismaProps = [];
            for(let columnName of Object.keys(columns)){
                let column = columns[columnName];
                let prismaType = TypeMapper.mapDbTypeToPrismaType(column.type);
                let isPrimary = 'PRI' === column.key;
                let propDef = columnName+': {\n            type: \''+prismaType+'\'';
                if(isPrimary){
                    propDef += ',\n            id: true';
                }
                if(column.nullable){
                    propDef += ',\n            optional: true';
                }
                propDef += '\n        }';
                prismaProps.push(propDef);
            }
            return prismaProps.join(',\n        ');
        }
        return '';
    }

    generateRegisteredModelsFile(entitiesInfo, existingModels, driverKey, templatePath)
    {
        if(!FileHandler.exists(templatePath)){
            Logger.critical('Registered models template file not found: '+templatePath);
            return false;
        }
        let registeredTemplateContent = FileHandler.fetchFileContents(templatePath);
        if(!registeredTemplateContent){
            Logger.critical('Failed to read registered models template file: '+templatePath);
            return false;
        }
        let allEntities = Object.assign({}, entitiesInfo);
        let replacements = {
            registeredModels: this.getRegisteredModels(allEntities, existingModels, driverKey),
            registeredEntitiesObject: this.getRegisteredEntitiesObject(allEntities, existingModels, driverKey)
        };
        let registeredContent = this.applyReplacements(registeredTemplateContent, replacements);
        let driverFolder = FileHandler.joinPaths(this.modelsFolder, driverKey);
        let filePath = FileHandler.joinPaths(driverFolder, 'registered-models-'+driverKey+'.js');
        if(!FileHandler.writeFile(filePath, registeredContent)){
            Logger.critical('Failed to write registered models file: '+filePath);
            return false;
        }
        Logger.info('Generated registered models file: '+filePath);
        return true;
    }

    getRegisteredModels(allEntities, existingModels, driverKey)
    {
        let registeredModels = [];
        for(let tableName of Object.keys(allEntities)){
            let entity = allEntities[tableName];
            if(entity.driverKey && driverKey !== entity.driverKey){
                if(!existingModels[tableName] || !existingModels[tableName][driverKey]){
                    continue;
                }
            }
            let modelClassName = entity.modelClassName || sc.capitalizedCamelCase(tableName)+'Model';
            let modelFileName = entity.modelFileName || sc.kebabCase(tableName)+'-model.js';
            registeredModels.push(
                'const { '+modelClassName+' } = require(\'./'+modelFileName.replace('.js', '')+'\');'
            );
        }
        return registeredModels.join('\n');
    }

    getRegisteredEntitiesObject(allEntities, existingModels, driverKey)
    {
        let registeredEntitiesObject = [];
        for(let tableName of Object.keys(allEntities)){
            let entity = allEntities[tableName];
            if(entity.driverKey && driverKey !== entity.driverKey){
                if(!existingModels[tableName] || !existingModels[tableName][driverKey]){
                    continue;
                }
            }
            let modelClassName = entity.modelClassName || sc.capitalizedCamelCase(tableName)+'Model';
            registeredEntitiesObject.push(sc.camelCase(tableName)+': '+modelClassName);
        }
        return registeredEntitiesObject.join(',\n    ');
    }

}

module.exports.ModelsGeneration = ModelsGeneration;
