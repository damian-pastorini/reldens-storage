/**
 *
 * Reldens - EntitiesGenerator
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');
const { ObjectionJsDataServer } = require('./objection-js/objection-js-data-server');
const { MikroOrmDataServer } = require('./mikro-orm/mikro-orm-data-server');
const { PrismaDataServer } = require('./prisma/prisma-data-server');
const { EntitiesGeneration } = require('./generators/entities-generation');
const { ModelsGeneration } = require('./generators/models-generation');
const { EntitiesConfigGeneration } = require('./generators/entities-config-generation');
const { EntitiesTranslationsGeneration } = require('./generators/entities-translations-generation');

class EntitiesGenerator
{

    constructor(props)
    {
        this.templatesFolderPath = FileHandler.joinPaths(__dirname, 'entity-templates');
        this.templates = {
            'objection-js': FileHandler.joinPaths(this.templatesFolderPath, 'objection-js-model.template'),
            'mikro-orm': FileHandler.joinPaths(this.templatesFolderPath, 'mikro-orm-model.template'),
            'prisma': FileHandler.joinPaths(this.templatesFolderPath, 'prisma-model.template'),
            'entity': FileHandler.joinPaths(this.templatesFolderPath, 'entity.template'),
            'entities-config': FileHandler.joinPaths(this.templatesFolderPath, 'entities-config.template'),
            'entities-translations': FileHandler.joinPaths(this.templatesFolderPath, 'entities-translations.template'),
            'registered-models': FileHandler.joinPaths(this.templatesFolderPath, 'registered-models.template')
        };
        this.projectPath = sc.get(props, 'projectPath', FileHandler.joinPaths(__dirname, '..'));
        this.generationFolder = FileHandler.joinPaths(this.projectPath, 'generated-entities');
        this.entitiesFolder = FileHandler.joinPaths(this.generationFolder, 'entities');
        this.modelsFolder = FileHandler.joinPaths(this.generationFolder, 'models');
        this.entitiesConfigPath = FileHandler.joinPaths(this.generationFolder, 'entities-config.js');
        this.entitiesTranslationsPath = FileHandler.joinPaths(this.generationFolder, 'entities-translations.js');
        this.driverMap = {
            'objection-js': ObjectionJsDataServer,
            'mikro-orm': MikroOrmDataServer,
            'prisma': PrismaDataServer
        };
        this.driversClassMap = {
            'ObjectionJsDataServer': 'objection-js',
            'MikroOrmDataServer': 'mikro-orm',
            'PrismaDataServer': 'prisma'
        };
        this.server = sc.get(props, 'server', false);
        this.connectionData = sc.get(props, 'connectionData', false);
        this.isOverride = sc.get(props, 'isOverride', false);
        this.prismaClient = sc.get(props, 'prismaClient', false);
        this.generatedEntities = {};
        this.existingEntities = {};
        this.existingEntityFields = {};
        this.existingModels = {};
        this.prismaRelationsMetadata = {};
        this.entitiesGeneration = new EntitiesGeneration({
            entitiesFolder: this.entitiesFolder,
            templatePath: this.templates['entity']
        });
        this.modelsGeneration = new ModelsGeneration({
            modelsFolder: this.modelsFolder,
            templates: {
                'objection-js': this.templates['objection-js'],
                'mikro-orm': this.templates['mikro-orm'],
                'prisma': this.templates['prisma']
            }
        });
        this.entitiesConfigGeneration = new EntitiesConfigGeneration({
            entitiesConfigPath: this.entitiesConfigPath,
            templatePath: this.templates['entities-config']
        });
        this.entitiesTranslationsGeneration = new EntitiesTranslationsGeneration({
            entitiesTranslationsPath: this.entitiesTranslationsPath,
            templatePath: this.templates['entities-translations']
        });
    }

    detectExistingEntities()
    {
        if(!FileHandler.exists(this.entitiesFolder)){
            return;
        }
        let entityFiles = FileHandler.getFilesInFolder(this.entitiesFolder, ['.js']);
        for(let file of entityFiles){
            if(!file.endsWith('-entity.js')){
                continue;
            }
            let tableName = file.replace('-entity.js', '').replace(/-/g, '_');
            this.existingEntities[tableName] = {entityFileName: file, tableName};
            this.detectExistingEntityFields(tableName, file);
        }
        Logger.info('Detected '+Object.keys(this.existingEntities).length+' existing entities.');
    }

    detectExistingModels()
    {
        if(!FileHandler.exists(this.modelsFolder)){
            return;
        }
        let driverFolders = FileHandler.fetchSubFoldersList(this.modelsFolder);
        for(let driverKey of driverFolders){
            let driverFolder = FileHandler.joinPaths(this.modelsFolder, driverKey);
            let modelFiles = FileHandler.getFilesInFolder(driverFolder, ['.js']);
            for(let file of modelFiles){
                if(!file.endsWith('-model.js')){
                    continue;
                }
                let tableName = file.replace('-model.js', '').replace(/-/g, '_');
                if(!this.existingModels[tableName]){
                    this.existingModels[tableName] = {};
                }
                this.existingModels[tableName][driverKey] = {
                    modelFileName: file,
                    driverKey: driverKey
                };
            }
        }
        Logger.info('Detected '+Object.keys(this.existingModels).length+' existing models.');
    }

    detectExistingEntityFields(tableName, fileName)
    {
        let filePath = FileHandler.joinPaths(this.entitiesFolder, fileName);
        let fileContent = FileHandler.readFile(filePath);
        if(!fileContent){
            return;
        }
        let fieldsMatch = fileContent.match(/properties\s*=\s*\{([^}]+)\}/s);
        if(!fieldsMatch){
            return;
        }
        let propertiesContent = fieldsMatch[1];
        let fieldMatches = propertiesContent.match(/(\w+):\s*\{[^}]*\}/g);
        if(!fieldMatches){
            return;
        }
        this.existingEntityFields[tableName] = [];
        for(let fieldMatch of fieldMatches){
            let fieldName = fieldMatch.split(':')[0].trim();
            this.existingEntityFields[tableName].push(fieldName);
        }
    }

    entityNeedsUpdate(tableName, tableData)
    {
        if(!this.existingEntityFields[tableName]){
            return true;
        }
        let existingFields = this.existingEntityFields[tableName];
        let databaseFields = Object.keys(tableData.columns);
        for(let dbField of databaseFields){
            if(!existingFields.includes(dbField)){
                return true;
            }
        }
        for(let existingField of existingFields){
            if('id' === existingField){
                continue;
            }
            if(!databaseFields.includes(existingField)){
                return true;
            }
        }
        return false;
    }

    extractPrismaRelationsMetadata()
    {
        if(!this.prismaClient){
            Logger.warning('Missing PrismaClient.');
            return;
        }
        if(!this.server || !(this.server instanceof PrismaDataServer)){
            Logger.warning('Server is not a PrismaDataServer instance.');
            return;
        }
        try {
            let dmmf = this.prismaClient._runtimeDataModel || this.prismaClient._dmmf?.datamodel;
            if(!dmmf || !dmmf.models){
                Logger.warning('Could not extract Prisma DMMF data for relations metadata.');
                return;
            }
            if(sc.isArray(dmmf.models)){
                this.processArrayModels(dmmf.models);
                return;
            }
            this.processObjectModels(dmmf.models);
        } catch(error) {
            Logger.warning('Failed to extract Prisma relations metadata: ' + error.message);
        }
    }

    processArrayModels(models)
    {
        for(let model of models){
            if(!model){
                Logger.error('Missing model.');
                continue;
            }
            if(!model.name){
                Logger.error('Missing model name.', model);
                continue;
            }
            if(!sc.isArray(model.fields)){
                Logger.error('Model fields not an array.', model);
                continue;
            }
            this.processModelForRelations(model.name, model, models);
        }
        Logger.info('Extracted relations metadata for ' + Object.keys(this.prismaRelationsMetadata).length + ' models.');
    }

    processObjectModels(models)
    {
        for(let modelName of Object.keys(models)){
            let model = models[modelName];
            if(!model){
                Logger.error('Missing model.');
                continue;
            }
            if(!sc.isArray(model.fields)){
                Logger.error('Model fields not an array.', model);
                continue;
            }
            this.processModelForRelations(modelName, model, models);
        }
        Logger.info('Extracted relations metadata for ' + Object.keys(this.prismaRelationsMetadata).length + ' models.');
    }

    processModelForRelations(modelName, model, allModels)
    {
        let tableName = modelName.toLowerCase();
        this.prismaRelationsMetadata[tableName] = {};
        for(let field of model.fields){
            if('object' !== field.kind){
                continue;
            }
            let relationType = 'many';
            if(!field.isList){
                relationType = this.inferRelationType(field, model, allModels, modelName);
            }
            this.prismaRelationsMetadata[tableName][field.name] = {
                type: relationType,
                model: field.type,
                isList: field.isList,
                isOptional: field.isOptional,
                relationName: field.relationName
            };
        }
    }

    inferRelationType(field, model, allModels, modelName)
    {
        if(field.isList){
            return 'many';
        }
        let relatedModel = this.findRelatedModel(allModels, field.type);
        if(!relatedModel){
            return 'one';
        }
        let backReference = relatedModel.fields.find(f =>
            'object' === f.kind &&
            f.type === modelName &&
            f.relationName === field.relationName
        );
        if(!backReference){
            return 'one';
        }
        if(field.relationFromFields && 0 < field.relationFromFields.length){
            return 'one';
        }
        if(backReference.relationFromFields && 0 < backReference.relationFromFields.length){
            return 'one';
        }
        return 'one';
    }

    findRelatedModel(allModels, fieldType)
    {
        if(sc.isArray(allModels)){
            return allModels.find(m => m.name === fieldType);
        }
        return allModels[fieldType];
    }

    filterTablesToGenerate(tables, driverKey)
    {
        let filteredTables = {};
        let newTablesCount = 0;
        let updateTablesCount = 0;
        let missingConfigCount = 0;
        let missingModelCount = 0;
        for(let tableName of Object.keys(tables)){
            let needsGeneration = false;
            let reasons = [];
            if(!this.existingEntities[tableName]){
                needsGeneration = true;
                newTablesCount++;
                reasons.push('new entity');
            }
            if(this.existingEntities[tableName]){
                if(this.entityNeedsUpdate(tableName, tables[tableName])){
                    needsGeneration = true;
                    updateTablesCount++;
                    reasons.push('fields mismatch');
                }
                if(!this.entityExistsInConfig(tableName)){
                    needsGeneration = true;
                    missingConfigCount++;
                    reasons.push('missing from config');
                }
            }
            if(!this.existingModels[tableName] || !this.existingModels[tableName][driverKey]){
                needsGeneration = true;
                missingModelCount++;
                reasons.push('missing model');
            }
            if(this.existingModels[tableName] && this.existingModels[tableName][driverKey]){
                if(!this.modelExistsInRegistered(tableName, driverKey)){
                    needsGeneration = true;
                    reasons.push('missing from registered models');
                }
            }
            if(needsGeneration || this.isOverride){
                filteredTables[tableName] = tables[tableName];
                if(0 < reasons.length){
                    Logger.info('Entity '+tableName+' needs generation: '+reasons.join(', '));
                }
            }
        }
        if(0 === newTablesCount && 0 === updateTablesCount && 0 === missingConfigCount && 0 === missingModelCount){
            Logger.info('No new tables found and all entities are properly configured.');
            return filteredTables;
        }
        if(0 < newTablesCount){
            Logger.info('Found '+newTablesCount+' new tables to generate entities for.');
        }
        if(0 < updateTablesCount){
            Logger.info('Found '+updateTablesCount+' existing entities that need updates.');
        }
        if(0 < missingConfigCount){
            Logger.info('Found '+missingConfigCount+' entities missing from config.');
        }
        if(0 < missingModelCount){
            Logger.info('Found '+missingModelCount+' entities missing models.');
        }
        return filteredTables;
    }

    entityExistsInConfig(tableName)
    {
        return this.entitiesConfigGeneration.entityExistsInConfig(tableName, FileHandler.readFile(this.entitiesConfigPath));
    }

    modelExistsInRegistered(tableName, driverKey)
    {
        let registeredPath = FileHandler.joinPaths(this.modelsFolder, driverKey, 'registered-models-'+driverKey+'.js');
        if(!FileHandler.exists(registeredPath)){
            return false;
        }
        let registeredContent = FileHandler.readFile(registeredPath);
        return registeredContent && registeredContent.includes(sc.camelCase(tableName)+':');
    }

    async generate()
    {
        if(!this.server){
            this.createServer();
            //Logger.debug('Undefined server, new server instance created.');
        }
        try {
            //Logger.debug('Connection:', this.server.config, this.server.client, this.server.prisma ? 'prisma' : '');
            await this.server.connect();
        } catch (error) {
            Logger.critical('Failed to connect to database: '+error.message);
            return false;
        }
        let driverKey = sc.get(
            this.connectionData,
            'driver',
            (this.server ? sc.get(this.driversClassMap, this.server.constructor.name, false) : false)
        );
        if('prisma' === driverKey){
            if(!this.prismaClient && this.server.prisma){
                this.prismaClient = this.server.prisma;
            }
            Logger.debug('Extract Prisma relations metadata.');
            this.extractPrismaRelationsMetadata();
        }
        let tables = await this.server.fetchEntitiesFromDatabase();
        if(!tables){
            Logger.critical('EntitiesGenerator tables fetch failed.');
            return false;
        }
        if(!this.ensureFoldersExist()){
            return false;
        }
        this.detectExistingEntities();
        this.detectExistingModels();
        if(!driverKey){
            Logger.critical('Failed to fetch driver key.');
            return false;
        }
        if('objection-js' === driverKey){
            this.modelsGeneration.setAllTablesData(tables);
        }
        let tablesToGenerate = this.filterTablesToGenerate(tables, driverKey);
        if(0 === Object.keys(tablesToGenerate).length && !this.isOverride){
            return true;
        }
        for(let tableName of Object.keys(tablesToGenerate)){
            let tableData = tablesToGenerate[tableName];
            let entityGenerated = await this.entitiesGeneration.generateEntityFile(tableName, tableData);
            if(!entityGenerated){
                continue;
            }
            let entityInfo = this.entitiesGeneration.generatedEntities[tableName];
            let relationMetadata = sc.get(this.prismaRelationsMetadata, tableName, {});
            let modelGenerated = await this.modelsGeneration.generateModelFile(
                tableName,
                tableData,
                driverKey,
                entityInfo,
                relationMetadata
            );
            if(modelGenerated){
                let modelInfo = this.modelsGeneration.generatedModels[tableName];
                this.generatedEntities[tableName] = Object.assign({}, entityInfo, modelInfo);
                continue;
            }
            this.generatedEntities[tableName] = entityInfo;
        }
        let allEntities = Object.assign({}, this.existingEntities, this.generatedEntities);
        this.entitiesConfigGeneration.generateEntitiesConfigFile(
            this.generatedEntities,
            this.existingEntities,
            this.isOverride
        );
        this.entitiesTranslationsGeneration.generateEntitiesTranslationsFile(
            this.generatedEntities,
            this.existingEntities,
            this.isOverride
        );
        this.modelsGeneration.generateRegisteredModelsFile(
            allEntities,
            this.existingModels,
            driverKey,
            this.templates['registered-models']
        );
        return true;
    }

    createServer()
    {
        if(this.server){
            return this.server;
        }
        let driverKey = sc.get(this.connectionData, 'driver', 'objection-js');
        let driverClassMapped = this.driverMap[driverKey];
        if(!driverClassMapped){
            Logger.critical('Unsupported driver: '+driverKey);
            return false;
        }
        let serverConfig = {
            client: sc.get(this.connectionData, 'client', 'mysql2'),
            config: {
                user: sc.get(this.connectionData, 'user', ''),
                password: sc.get(this.connectionData, 'password', ''),
                database: sc.get(this.connectionData, 'database', ''),
                host: sc.get(this.connectionData, 'host', 'localhost'),
                port: sc.get(this.connectionData, 'port', 3306)
            }
        };
        if('prisma' === driverKey && this.prismaClient){
            serverConfig.prismaClient = this.prismaClient;
        }
        this.server = new driverClassMapped(serverConfig);
        return this.server;
    }

    ensureFoldersExist()
    {
        if(!FileHandler.createFolder(this.generationFolder)){
            Logger.critical('Failed to create generation folder.');
            return false;
        }
        if(!FileHandler.createFolder(this.entitiesFolder)){
            Logger.critical('Failed to create entities folder.');
            return false;
        }
        if(!FileHandler.createFolder(this.modelsFolder)){
            Logger.critical('Failed to create models folder.');
            return false;
        }
        return true;
    }

}

module.exports.EntitiesGenerator = EntitiesGenerator;
