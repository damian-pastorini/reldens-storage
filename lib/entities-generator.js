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
const { TypeMapper } = require('./type-mapper');

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
        this.generatedEntities = {};
        this.existingEntities = {};
        this.existingEntityFields = {};
        this.existingModels = {};
    }

    async generateEntityFile(tableName, tableData)
    {
        let entityTemplatePath = this.templates['entity'];
        if(!FileHandler.exists(entityTemplatePath)){
            Logger.critical('Entity template file not found: '+entityTemplatePath);
            return false;
        }
        let entityTemplateContent = FileHandler.fetchFileContents(entityTemplatePath);
        if(!entityTemplateContent){
            Logger.critical('Failed to read entity template file: '+entityTemplatePath);
            return false;
        }
        let entityClassName = sc.capitalizedCamelCase(tableName)+'Entity';
        let titleProperty = this.determineTitleProperty(tableData.columns);
        for(let columnName of Object.keys(tableData.columns)){
            tableData.columns[columnName].tableName = tableName;
        }
        let propertiesConfig = this.generatePropertiesConfig(tableData.columns, titleProperty);
        let titlePropertyDeclaration = titleProperty ? '\n        let titleProperty = \''+titleProperty+'\';' : '';
        let titlePropertyReturn = titleProperty ? '\n            titleProperty,' : '';
        let fieldsToRemoveFromEdit = ['id'];
        if(tableData.columns['created_at']){
            fieldsToRemoveFromEdit.push('created_at');
        }
        if(tableData.columns['updated_at']){
            fieldsToRemoveFromEdit.push('updated_at');
        }
        let editPropertiesRemoval = this.getEditPropertiesRemoval(fieldsToRemoveFromEdit);
        let listPropertiesDeclaration = this.getListPropertiesDeclaration(tableData.columns);
        let showPropertiesDeclaration = this.getShowPropertiesDeclaration(tableData.columns);
        let needsSc = listPropertiesDeclaration.includes('sc.removeFromArray')
            || editPropertiesRemoval.includes('sc.removeFromArray')
            || showPropertiesDeclaration.includes('sc.removeFromArray');
        let scRequire = needsSc ? '\nconst { sc } = require(\'@reldens/utils\');' : '';
        let replacements = {
            entityClassName,
            propertiesConfig,
            titlePropertyDeclaration,
            titlePropertyReturn,
            showPropertiesDeclaration,
            editPropertiesRemoval,
            listPropertiesDeclaration,
            scRequire
        };
        let entityContent = this.applyReplacements(entityTemplateContent, replacements);
        let fileName = sc.kebabCase(tableName)+'-entity.js';
        let filePath = FileHandler.joinPaths(this.entitiesFolder, fileName);
        if(!FileHandler.writeFile(filePath, entityContent)){
            Logger.critical('Failed to write entity file: '+filePath);
            return false;
        }
        Logger.info('Generated entity file: '+fileName);
        this.generatedEntities[tableName] = {
            entityClassName,
            entityFileName: fileName,
            tableName,
            titleProperty
        };
        return true;
    }

    getFieldsToRemoveFromList(columns)
    {
        let fieldsToRemove = [];
        for(let columnName of Object.keys(columns)){
            let column = columns[columnName];
            let type = column.type.toLowerCase();
            if(['text', 'json', 'tinytext', 'mediumtext', 'longtext'].includes(type)){
                fieldsToRemove.push(columnName);
            }
            if('password' === columnName.toLowerCase()){
                fieldsToRemove.push(columnName);
            }
        }
        return fieldsToRemove;
    }

    getEditPropertiesRemoval(fieldsToRemove)
    {
        if(1 === fieldsToRemove.length){
            return 'let editProperties = [...propertiesKeys];\n        editProperties.splice(editProperties.indexOf(\''+
                fieldsToRemove[0]
                +'\'), 1);';
        }
        return 'let editProperties = sc.removeFromArray([...propertiesKeys], [\''+fieldsToRemove.join('\', \'')+'\']);';
    }

    determineTitleProperty(columns)
    {
        if(columns['label']){
            return 'label';
        }
        if(columns['title']){
            return 'title';
        }
        if(columns['name']){
            return 'name';
        }
        if(columns['key']){
            return 'key';
        }
        return false;
    }

    generatePropertiesConfig(columns, titleProperty)
    {
        let propertiesConfig = [];
        for(let columnName of Object.keys(columns)){
            let column = columns[columnName];
            let propertyKey = titleProperty && titleProperty === columnName ? '[titleProperty]' : columnName;
            if('id' === columnName){
                propertiesConfig.push(columnName+': {}');
                continue;
            }
            let props = this.getPropertyAttributes(column);
            if(0 === props.length){
                propertiesConfig.push(propertyKey+': {}');
                continue;
            }
            propertiesConfig.push(
                propertyKey+': {\n                '+props.join(',\n                ')+ '\n            }'
            );
        }
        return propertiesConfig.join(',\n            ');
    }

    getPropertyAttributes(column)
    {
        let props = [];
        let type = column.type.toLowerCase();
        this.addTypeAttribute(props, column, type);
        this.addRequiredAttribute(props, column);
        return props;
    }

    addTypeAttribute(props, column, type)
    {
        if(column.referencedTable){
            props.push('type: \'reference\'');
            props.push('reference: \''+this.getReferenceTable(column)+'\'');
            return;
        }
        if('date' === type || 'datetime' === type || 'timestamp' === type){
            props.push('type: \'datetime\'');
            return;
        }
        if('text' === type || 'longtext' === type || 'mediumtext' === type || 'tinytext' === type || 'json' === type){
            props.push('type: \'textarea\'');
            return;
        }
        if('tinyint' === type){
            props.push('type: \'boolean\'');
            return;
        }
        if('enum' === type){
            this.addEnumValues(props, column);
            return;
        }
        if(type.includes('int')){
            props.push('type: \'number\'');
            return;
        }
        if('varchar' === type || 'char' === type){
            return;
        }
        let jsType = TypeMapper.mapDbTypeToJsType(type);
        if(jsType && 'string' !== jsType){
            props.push('type: \''+jsType+'\'');
        }
    }

    addEnumValues(props, column)
    {
        let enumValues = this.parseEnumValues(column.columnType);
        if(0 === enumValues.length){
            return;
        }
        let availableValues = [];
        for(let i = 0; i < enumValues.length; i++){
            availableValues.push('{value: '+(i+1)+', label: \''+enumValues[i]+'\'}');
        }
        props.push(
            'availableValues: [\n                    '+
            availableValues.join(',\n                    ')+
            '\n                ]'
        );
    }

    parseEnumValues(columnType)
    {
        if(!columnType){
            return [];
        }
        let match = columnType.match(/^enum\('(.+)'\)$/i);
        if(!match){
            return [];
        }
        let valuesString = match[1];
        return valuesString.split('\',\'');
    }

    addRequiredAttribute(props, column)
    {
        if(!column.nullable && !column.default){
            props.push('isRequired: true');
        }
    }

    getReferenceTable(column)
    {
        if(column.referencedTable){
            return column.referencedTable;
        }
        let refTableName = column.name.replace('_id', '');
        if(refTableName.includes('_')){
            let parts = refTableName.split('_');
            if(column.tableName && column.tableName === parts[0]){
                refTableName = parts.slice(1).join('_');
            }
        }
        return refTableName;
    }

    getShowPropertiesDeclaration(columns)
    {
        let passwordFields = this.getPasswordFields(columns);
        if(0 === passwordFields.length){
            return 'let showProperties = propertiesKeys;';
        }
        if(1 === passwordFields.length){
            return 'let showProperties = [...propertiesKeys];\n        showProperties.splice(showProperties.indexOf(\''+
                passwordFields[0]+
                '\'), 1);';
        }
        return 'let showProperties = sc.removeFromArray([...propertiesKeys], [\''+passwordFields.join('\', \'')+'\']);';
    }

    getPasswordFields(columns)
    {
        let passwordFields = [];
        for(let columnName of Object.keys(columns)){
            if('password' === columnName.toLowerCase()){
                passwordFields.push(columnName);
            }
        }
        return passwordFields;
    }

    getListPropertiesDeclaration(columns)
    {
        let fieldsToRemove = this.getFieldsToRemoveFromList(columns);
        if(0 === fieldsToRemove.length){
            return 'let listProperties = propertiesKeys;';
        }
        if(1 === fieldsToRemove.length){
            return 'let listProperties = [...propertiesKeys];\n        listProperties.splice(listProperties.indexOf(\''+
                fieldsToRemove[0]+
                '\'), 1);';
        }
        return 'let listProperties = sc.removeFromArray([...propertiesKeys], [\''+fieldsToRemove.join('\', \'')+'\']);';
    }

    async generateModelFile(tableName, tableData, driverKey)
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
        this.generatedEntities[tableName].modelClassName = modelClassName;
        this.generatedEntities[tableName].modelFileName = fileName;
        this.generatedEntities[tableName].driverKey = driverKey;
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
        this.detectExistingModels();
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
        if(!FileHandler.exists(this.entitiesConfigPath)){
            return false;
        }
        let configContent = FileHandler.readFile(this.entitiesConfigPath);
        return configContent && configContent.includes(sc.camelCase(tableName)+':');
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

    generateEntitiesConfigFile()
    {
        if(this.isOverride){
            return this.regenerateEntitiesConfigFile();
        }
        return this.appendToEntitiesConfigFile();
    }

    regenerateEntitiesConfigFile()
    {
        let configTemplateContent = FileHandler.fetchFileContents(this.templates['entities-config']);
        if(!configTemplateContent){
            Logger.critical('Failed to read entities config template file: '+this.templates['entities-config']);
            return false;
        }
        let allEntities = Object.assign({}, this.existingEntities, this.generatedEntities);
        let replacements = {
            requireStatements: this.getRequireStatements(allEntities),
            entitiesConfigExport: this.getEntitiesConfigExport(allEntities)
        };
        if(!FileHandler.writeFile(
            this.entitiesConfigPath,
            this.applyReplacements(configTemplateContent, replacements)
        )){
            Logger.critical('Failed to write entities config file: '+this.entitiesConfigPath);
            return false;
        }
        Logger.info('Regenerated entities config file: '+this.entitiesConfigPath);
        return true;
    }

    appendToEntitiesConfigFile()
    {
        if(0 === Object.keys(this.generatedEntities).length){
            return true;
        }
        if(!FileHandler.exists(this.entitiesConfigPath)){
            Logger.info('Entities config file does not exist, creating new file.');
            return this.regenerateEntitiesConfigFile();
        }
        let existingContent = FileHandler.readFile(this.entitiesConfigPath);
        if(!existingContent){
            Logger.error('Could not read existing entities config file.');
            return false;
        }
        let newRequires = [];
        let newConfigs = [];
        for(let tableName of Object.keys(this.generatedEntities)){
            let entity = this.generatedEntities[tableName];
            let entityClassName = sc.get(entity, 'entityClassName', sc.capitalizedCamelCase(tableName)+'Entity');
            let entityFileName = sc.get(entity, 'entityFileName', sc.kebabCase(tableName)+'-entity').replace('.js', '');
            let requireStatement = 'const { '+ entityClassName+' } = require(\'./entities/'+entityFileName+'\');';
            let configEntry = sc.camelCase(tableName)+': '+entityClassName+'.propertiesConfig()';
            if(!existingContent.includes(requireStatement)){
                newRequires.push(requireStatement);
            }
            if(!this.entityExistsInConfig(tableName)){
                newConfigs.push(configEntry);
            }
        }
        if(0 === newRequires.length && 0 === newConfigs.length){
            return true;
        }
        let normalizedContent = existingContent.replace(/\s+/g, ' ');
        let entitiesConfigPattern = /let\s+entitiesConfig\s*=\s*\{/;
        let entitiesConfigMatch = normalizedContent.match(entitiesConfigPattern);
        if(!entitiesConfigMatch){
            Logger.error('Could not find entitiesConfig variable in config file.');
            return false;
        }
        let entitiesConfigStart = existingContent.indexOf(entitiesConfigMatch[0]);
        let searchStart = entitiesConfigStart + entitiesConfigMatch[0].length;
        let braceCount = 1;
        let entitiesConfigEnd = -1;
        for(let i = searchStart; i < existingContent.length; i++){
            if('{' === existingContent[i]){
                braceCount++;
            }
            if('}' === existingContent[i]){
                braceCount--;
                if(0 === braceCount){
                    entitiesConfigEnd = i;
                    break;
                }
            }
        }
        if(-1 === entitiesConfigEnd){
            Logger.error('Could not find end of entitiesConfig object.');
            return false;
        }
        let firstRequirePosition = existingContent.indexOf('const {');
        if(-1 === firstRequirePosition){
            Logger.error('Could not find require statements in config file.');
            return false;
        }
        let beforeFirstRequire = existingContent.substring(0, firstRequirePosition);
        let afterFirstRequire = existingContent.substring(firstRequirePosition, entitiesConfigEnd);
        let afterConfig = existingContent.substring(entitiesConfigEnd);
        let updatedContent = beforeFirstRequire;
        if(0 < newRequires.length){
            updatedContent += newRequires.join('\n') + '\n';
        }
        updatedContent += afterFirstRequire;
        if(0 < newConfigs.length){
            let trimmedContent = afterFirstRequire.trimEnd();
            if(!trimmedContent.endsWith(',')){
                updatedContent = updatedContent.trimEnd() + ',';
            }
            updatedContent += '\n    ' + newConfigs.join(',\n    ');
        }
        updatedContent += afterConfig;
        if(!FileHandler.writeFile(this.entitiesConfigPath, updatedContent)){
            Logger.error('Failed to append to entities config file: '+this.entitiesConfigPath);
            return false;
        }
        Logger.info('Updated entities config file with '+newConfigs.length+' new entities.');
        return true;
    }

    getRequireStatements(allEntities)
    {
        let requireStatements = [];
        for(let tableName of Object.keys(allEntities)){
            let entity = allEntities[tableName];
            let entityClassName = sc.get(entity, 'entityClassName', sc.capitalizedCamelCase(tableName)+'Entity');
            let entityFileName = sc.get(entity, 'entityFileName', sc.kebabCase(tableName)+'-entity').replace('.js', '');
            requireStatements.push(
                'const { '+ entityClassName+' } = require(\'./entities/'+entityFileName+'\');'
            );
        }
        return requireStatements.join('\n');
    }

    getEntitiesConfigExport(allEntities)
    {
        let entitiesConfigExport = [];
        for(let tableName of Object.keys(allEntities)){
            entitiesConfigExport.push(
                sc.camelCase(tableName)+': '
                +sc.get(allEntities[tableName], 'entityClassName', sc.capitalizedCamelCase(tableName)+'Entity')
                +'.propertiesConfig()'
            );
        }
        return entitiesConfigExport.join(',\n    ');
    }

    generateEntitiesTranslationsFile()
    {
        if(this.isOverride){
            return this.regenerateEntitiesTranslationsFile();
        }
        return this.appendToEntitiesTranslationsFile();
    }

    regenerateEntitiesTranslationsFile()
    {
        let translationsTemplatePath = this.templates['entities-translations'];
        if(!FileHandler.exists(translationsTemplatePath)){
            Logger.critical('Entities translations template file not found: '+translationsTemplatePath);
            return false;
        }
        let translationsTemplateContent = FileHandler.fetchFileContents(translationsTemplatePath);
        if(!translationsTemplateContent){
            Logger.critical('Failed to read entities translations template file: '+translationsTemplatePath);
            return false;
        }
        let translationsContent = translationsTemplateContent.replace(
            /{{labels}}/g,
            this.getTranslationLabels(Object.assign({}, this.existingEntities, this.generatedEntities))
        );
        if(!FileHandler.writeFile(this.entitiesTranslationsPath, translationsContent)){
            Logger.critical('Failed to write entities translations file: '+this.entitiesTranslationsPath);
            return false;
        }
        Logger.info('Regenerated entities translations file: '+this.entitiesTranslationsPath);
        return true;
    }

    appendToEntitiesTranslationsFile()
    {
        if(0 === Object.keys(this.generatedEntities).length){
            return true;
        }
        if(!FileHandler.exists(this.entitiesTranslationsPath)){
            Logger.info('Entities translations file does not exist, creating new file.');
            return this.regenerateEntitiesTranslationsFile();
        }
        let existingContent = FileHandler.readFile(this.entitiesTranslationsPath);
        if(!existingContent){
            Logger.error('Could not read existing translations file.');
            return false;
        }
        let newTranslations = [];
        for(let tableName of Object.keys(this.generatedEntities)){
            if(!existingContent.includes('\''+tableName+'\':')){
                newTranslations.push(
                    '\''+tableName+'\': \''
                    +tableName.split('_').map(word => word.charAt(0).toUpperCase()+word.slice(1)).join(' ')+'\''
                );
            }
        }
        if(0 === newTranslations.length){
            return true;
        }
        let normalizedContent = existingContent.replace(/\s+/g, ' ');
        let labelsPattern = /labels\s*:\s*\{/;
        let labelsMatch = normalizedContent.match(labelsPattern);
        if(!labelsMatch){
            Logger.error('Could not find labels object in translations file.');
            return false;
        }
        let labelsStart = existingContent.indexOf(labelsMatch[0]);
        let searchStart = labelsStart + labelsMatch[0].length;
        let braceCount = 1;
        let labelsEnd = -1;
        for(let i = searchStart; i < existingContent.length; i++){
            if('{' === existingContent[i]){
                braceCount++;
            }
            if('}' === existingContent[i]){
                braceCount--;
                if(0 === braceCount){
                    labelsEnd = i;
                    break;
                }
            }
        }
        if(-1 === labelsEnd){
            Logger.error('Could not find end of labels object.');
            return false;
        }
        let beforeLabelsEnd = existingContent.substring(0, labelsEnd);
        let contentBeforeEnd = beforeLabelsEnd.trimEnd();
        let lastChar = contentBeforeEnd[contentBeforeEnd.length - 1];
        if('{' !== lastChar && ',' !== lastChar){
            beforeLabelsEnd = contentBeforeEnd + ',';
        }
        let updatedContent = beforeLabelsEnd + '\n        ' + newTranslations.join(',\n        ') + existingContent.substring(labelsEnd);
        if(!FileHandler.writeFile(this.entitiesTranslationsPath, updatedContent)){
            Logger.error('Failed to append to entities translations file: '+this.entitiesTranslationsPath);
            return false;
        }
        Logger.info('Updated translations file with '+newTranslations.length+' new labels.');
        return true;
    }

    getTranslationLabels(allEntities)
    {
        let labels = [];
        for(let tableName of Object.keys(allEntities)){
            labels.push(
                '\''+tableName+'\': \''
                +tableName.split('_').map(word => word.charAt(0).toUpperCase()+word.slice(1)).join(' ')
                +'\''
            );
        }
        return labels.join(',\n        ');
    }

    generateRegisteredModelsFile(driverKey)
    {
        let registeredTemplatePath = this.templates['registered-models'];
        if(!FileHandler.exists(registeredTemplatePath)){
            Logger.critical('Registered models template file not found: '+registeredTemplatePath);
            return false;
        }
        let registeredTemplateContent = FileHandler.fetchFileContents(registeredTemplatePath);
        if(!registeredTemplateContent){
            Logger.critical('Failed to read registered models template file: '+registeredTemplatePath);
            return false;
        }
        let allEntities = Object.assign({}, this.existingEntities, this.generatedEntities);
        let replacements = {
            registeredModels: this.getRegisteredModels(allEntities, driverKey),
            registeredEntitiesObject: this.getRegisteredEntitiesObject(allEntities, driverKey)
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

    getRegisteredModels(allEntities, driverKey)
    {
        let registeredModels = [];
        for(let tableName of Object.keys(allEntities)){
            let entity = allEntities[tableName];
            if(entity.driverKey && driverKey !== entity.driverKey){
                if(!this.existingModels[tableName] || !this.existingModels[tableName][driverKey]){
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

    getRegisteredEntitiesObject(allEntities, driverKey)
    {
        let registeredEntitiesObject = [];
        for(let tableName of Object.keys(allEntities)){
            let entity = allEntities[tableName];
            if(entity.driverKey && driverKey !== entity.driverKey){
                if(!this.existingModels[tableName] || !this.existingModels[tableName][driverKey]){
                    continue;
                }
            }
            let modelClassName = entity.modelClassName || sc.capitalizedCamelCase(tableName)+'Model';
            registeredEntitiesObject.push(sc.camelCase(tableName)+': '+modelClassName);
        }
        return registeredEntitiesObject.join(',\n    ');
    }

    applyReplacements(content, replacements)
    {
        let result = content;
        for(let placeholder of Object.keys(replacements)){
            result = result.replace(new RegExp('{{'+placeholder+'}}','g'), replacements[placeholder]);
        }
        return result;
    }

    async generate()
    {
        if(!this.server){
            this.createServer();
        }
        try {
            await this.server.connect();
        } catch (error) {
            Logger.critical('Failed to connect to database: '+error.message);
            return false;
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
        let driverKey = sc.get(
            this.connectionData,
            'driver',
            (this.server ? sc.get(this.driversClassMap, this.server.constructor.name, false) : false)
        );
        if(!driverKey){
            Logger.critical('Failed to fetch driver key.');
            return false;
        }
        let tablesToGenerate = this.filterTablesToGenerate(tables, driverKey);
        if(0 === Object.keys(tablesToGenerate).length && !this.isOverride){
            return true;
        }
        for(let tableName of Object.keys(tablesToGenerate)){
            let tableData = tablesToGenerate[tableName];
            await this.generateEntityFile(tableName, tableData);
            await this.generateModelFile(tableName, tableData, driverKey);
        }
        this.generateEntitiesConfigFile();
        this.generateEntitiesTranslationsFile();
        this.generateRegisteredModelsFile(driverKey);
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
        this.server = new driverClassMapped({
            client: sc.get(this.connectionData, 'client', 'mysql2'),
            config: {
                user: sc.get(this.connectionData, 'user', ''),
                password: sc.get(this.connectionData, 'password', ''),
                database: sc.get(this.connectionData, 'database', ''),
                host: sc.get(this.connectionData, 'host', 'localhost'),
                port: sc.get(this.connectionData, 'port', 3306)
            }
        });
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
