/**
 *
 * Reldens - ModelsGeneration
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');
const { BaseGenerator } = require('./base-generator');
const { RelationsDetection } = require('./relations-detection');
const { ObjectionJsModelsGeneration } = require('../objection-js/objection-js-models-generation');
const { MikroOrmModelsGeneration } = require('../mikro-orm/mikro-orm-models-generation');
const { PrismaModelsGeneration } = require('../prisma/prisma-models-generation');
const { QueryBuilderModelsGeneration } = require('../query-builder-models-generation');
const { DrizzleModelsGeneration } = require('../drizzle/drizzle-models-generation');

class ModelsGeneration extends BaseGenerator
{

    constructor(props)
    {
        super();
        this.modelsFolder = sc.get(props, 'modelsFolder', '');
        this.templates = sc.get(props, 'templates', {});
        this.generatedModels = {};
        this.relationsDetection = new RelationsDetection(props);
        this.driversGeneration = {
            'objection-js': new ObjectionJsModelsGeneration(this.relationsDetection),
            'mikro-orm': new MikroOrmModelsGeneration(this.relationsDetection),
            'prisma': new PrismaModelsGeneration(this.relationsDetection),
            'knex': new QueryBuilderModelsGeneration(this.relationsDetection),
            'kysely': new QueryBuilderModelsGeneration(this.relationsDetection),
            'drizzle': new DrizzleModelsGeneration(this.relationsDetection)
        };
    }

    driverGeneration(driverKey)
    {
        if(!sc.hasOwn(this.driversGeneration, driverKey)){
            Logger.critical('Models generation not available for driver "'+driverKey+'".');
            return false;
        }
        return this.driversGeneration[driverKey];
    }

    async generateModelFile(tableName, tableData, driverKey, entityInfo, relationMetadata = {})
    {
        let driverGeneration = this.driverGeneration(driverKey);
        if(!driverGeneration){
            return false;
        }
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
        let modelContent = this.applyReplacements(
            modelTemplateContent,
            this.modelReplacements(tableName, tableData, driverGeneration, relationMetadata)
        );
        return this.writeModelFile(tableName, driverKey, modelContent);
    }

    modelReplacements(tableName, tableData, driverGeneration, relationMetadata)
    {
        let fkMappingsJson = driverGeneration.generateFkMappings(tableName, tableData);
        let fkMappingsAttachment = fkMappingsJson ? 'schema._fkMappings = '+fkMappingsJson+';' : '';
        return {
            modelClassName: sc.capitalizedCamelCase(tableName)+'Model',
            tableName: driverGeneration.modelTableName(tableName),
            modelPropertiesList: Object.keys(tableData.columns).join(', '),
            modelPropertiesConstructor: Object.keys(tableData.columns)
                .map(columnName => 'this.'+columnName+' = '+columnName+';')
                .join('\n        '),
            modelRelations: driverGeneration.generateRelations(tableName, tableData, relationMetadata),
            entityPropertiesDefinition: driverGeneration.generateEntityProperties(
                tableData.columns,
                tableName,
                tableData
            ),
            fkMappingsAttachment,
            idColumn: driverGeneration.generateIdColumn(tableData.columns)
        };
    }

    writeModelFile(tableName, driverKey, modelContent)
    {
        let fileName = sc.kebabCase(tableName)+'-model.js';
        let driverFolder = FileHandler.joinPaths(this.modelsFolder, driverKey);
        FileHandler.createFolder(driverFolder);
        if(!FileHandler.writeFile(FileHandler.joinPaths(driverFolder, fileName), modelContent)){
            Logger.critical('Failed to write model file: '+fileName);
            return false;
        }
        Logger.info('Generated model file: '+fileName);
        this.generatedModels[tableName] = {
            modelClassName: sc.capitalizedCamelCase(tableName)+'Model',
            modelFileName: fileName,
            driverKey
        };
        return true;
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

    isRegisteredEntity(entity, existingModels, tableName, driverKey)
    {
        if(!entity.driverKey || driverKey === entity.driverKey){
            return true;
        }
        return Boolean(existingModels[tableName] && existingModels[tableName][driverKey]);
    }

    getRegisteredModels(allEntities, existingModels, driverKey)
    {
        let registeredModels = [];
        for(let tableName of Object.keys(allEntities)){
            let entity = allEntities[tableName];
            if(!this.isRegisteredEntity(entity, existingModels, tableName, driverKey)){
                continue;
            }
            let modelClassName = sc.get(entity, 'modelClassName', sc.capitalizedCamelCase(tableName)+'Model');
            let modelFileName = sc.get(entity, 'modelFileName', sc.kebabCase(tableName)+'-model.js');
            let variableName = 'mikro-orm' !== driverKey ? '{ '+modelClassName+' }' : sc.camelCase(tableName)+'Model';
            registeredModels.push(
                'const '+variableName+' = require(\'./'+modelFileName.replace('.js', '')+'\');'
            );
        }
        return registeredModels.join('\n');
    }

    getRegisteredEntitiesObject(allEntities, existingModels, driverKey)
    {
        let registeredEntitiesObject = [];
        for(let tableName of Object.keys(allEntities)){
            let entity = allEntities[tableName];
            if(!this.isRegisteredEntity(entity, existingModels, tableName, driverKey)){
                continue;
            }
            let modelClassName = sc.get(entity, 'modelClassName', sc.capitalizedCamelCase(tableName)+'Model');
            let variableName = 'mikro-orm' === driverKey ? sc.camelCase(tableName)+'Model' : modelClassName;
            registeredEntitiesObject.push(sc.camelCase(tableName)+': '+variableName);
        }
        return registeredEntitiesObject.join(',\n    ');
    }

}

module.exports.ModelsGeneration = ModelsGeneration;
