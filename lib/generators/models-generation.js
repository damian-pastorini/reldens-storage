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
    }

    async generateModelFile(tableName, tableData, driverKey, entityInfo)
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
        let modelRelations = '';
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
