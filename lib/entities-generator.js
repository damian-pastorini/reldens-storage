/**
 *
 * Reldens - EntitiesGenerator
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { ErrorManager, Logger, sc } = require('@reldens/utils');
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
            'PrismaDataServer': 'prisma-server'
        };
        this.server = sc.get(props, 'server', false);
        this.connectionData = sc.get(props, 'connectionData', false);
        if(!this.server && !this.connectionData){
            ErrorManager.error('Either server or connectionData must be provided to EntitiesGenerator.');
        }
        this.generatedEntities = {};
    }

    ensureFoldersExist()
    {
        if(!FileHandler.exists(this.generationFolder)){
            try {
                FileHandler.createFolder(this.generationFolder, { recursive: true });
            } catch (error) {
                ErrorManager.error('Failed to create generation folder: '+error.message);
            }
        }
        if(!FileHandler.exists(this.entitiesFolder)){
            try {
                FileHandler.createFolder(this.entitiesFolder, { recursive: true });
            } catch (error) {
                ErrorManager.error('Failed to create entities folder: '+error.message);
            }
        }
        if(!FileHandler.exists(this.modelsFolder)){
            try {
                FileHandler.createFolder(this.modelsFolder, { recursive: true });
            } catch (error) {
                ErrorManager.error('Failed to create models folder: '+error.message);
            }
        }
        for(let driverKey of Object.keys(this.driverMap)){
            let driverFolder = FileHandler.joinPaths(this.modelsFolder, driverKey);
            if(!FileHandler.exists(driverFolder)){
                try {
                    FileHandler.createFolder(driverFolder, { recursive: true });
                } catch (error) {
                    ErrorManager.error('Failed to create driver folder: '+error.message);
                }
            }
        }
    }

    async generateEntityFile(tableName, tableData)
    {
        let entityTemplatePath = this.templates['entity'];
        if(!FileHandler.exists(entityTemplatePath)){
            ErrorManager.error('Entity template file not found: '+entityTemplatePath);
        }
        let entityTemplateContent;
        try {
            entityTemplateContent = FileHandler.fetchFileContents(entityTemplatePath);
        } catch (error) {
            ErrorManager.error('Failed to read entity template file: '+error.message);
        }
        let entityClassName = sc.capitalizedCamelCase(tableName)+'Entity';
        let titleProperty = this.determineTitleProperty(tableData.columns);
        for(let columnName in tableData.columns){
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
        let needsSc = listPropertiesDeclaration.includes('sc.removeFromArray') || editPropertiesRemoval.includes('sc.removeFromArray');
        let scRequire = needsSc ? '\nconst { sc } = require(\'@reldens/utils\');' : '';
        let replacements = {
            entityClassName,
            propertiesConfig,
            titlePropertyDeclaration,
            titlePropertyReturn,
            listPropertiesDeclaration,
            editPropertiesRemoval,
            scRequire
        };
        let entityContent = this.applyReplacements(entityTemplateContent, replacements);
        let fileName = sc.kebabCase(tableName)+'-entity.js';
        let filePath = FileHandler.joinPaths(this.entitiesFolder, fileName);
        try {
            FileHandler.writeFile(filePath, entityContent);
            Logger.info('Generated entity file: '+filePath);
            this.generatedEntities[tableName] = {
                entityClassName,
                entityFileName: fileName,
                tableName,
                titleProperty
            };
            return true;
        } catch (error) {
            ErrorManager.error('Failed to write entity file: '+error.message);
        }
    }

    getEditPropertiesRemoval(fieldsToRemove)
    {
        if(1 === fieldsToRemove.length){
            return 'let editProperties = [...showProperties];\n        editProperties.splice(editProperties.indexOf(\''+fieldsToRemove[0]+'\'), 1);';
        }
        return 'let editProperties = sc.removeFromArray([...showProperties], [\''+fieldsToRemove.join('\', \'')+'\']);';
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
        for(let columnName in columns){
            let column = columns[columnName];
            let propertyKey = titleProperty && columnName === titleProperty ? '[titleProperty]' : columnName;
            if('id' === columnName){
                propertiesConfig.push(columnName+': {}');
                continue;
            }
            let props = this.getPropertyAttributes(column);
            if(0 === props.length){
                propertiesConfig.push(propertyKey+': {}');
                continue;
            }
            propertiesConfig.push(propertyKey+': {\n                '+props.join(',\n                ')+'\n            }');
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
        props.push('availableValues: [\n                    '+availableValues.join(',\n                    ')+'\n                ]');
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

    getListPropertiesDeclaration(columns)
    {
        let fieldsToRemove = this.getTextAndJsonFields(columns);
        if(0 === fieldsToRemove.length){
            return 'let listProperties = showProperties;';
        }
        if(1 === fieldsToRemove.length){
            return 'let listProperties = [...showProperties];\n        listProperties.splice(listProperties.indexOf(\''+fieldsToRemove[0]+'\'), 1);';
        }
        return 'let listProperties = sc.removeFromArray([...showProperties], [\''+fieldsToRemove.join('\', \'')+'\']);';
    }

    getTextAndJsonFields(columns)
    {
        let fieldsToRemove = [];
        for(let columnName in columns){
            let column = columns[columnName];
            let type = column.type.toLowerCase();
            if(['text', 'json', 'tinytext', 'mediumtext', 'longtext'].includes(type)){
                fieldsToRemove.push(columnName);
            }
        }
        return fieldsToRemove;
    }

    async generateModelFile(tableName, tableData, driverKey)
    {
        let modelTemplatePath = this.templates[driverKey];
        if(!FileHandler.exists(modelTemplatePath)){
            ErrorManager.error('Model template file not found: '+modelTemplatePath);
        }
        let modelTemplateContent;
        try {
            modelTemplateContent = FileHandler.fetchFileContents(modelTemplatePath);
        } catch (error) {
            ErrorManager.error('Failed to read model template file: '+error.message);
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
            tableName: driverKey === 'prisma' ? tableName.toLowerCase() : tableName,
            modelPropertiesList,
            modelPropertiesConstructor,
            modelRelations,
            entityPropertiesDefinition
        };
        let modelContent = this.applyReplacements(modelTemplateContent, replacements);
        let fileName = sc.kebabCase(tableName)+'-model.js';
        let driverFolder = FileHandler.joinPaths(this.modelsFolder, driverKey);
        let filePath = FileHandler.joinPaths(driverFolder, fileName);
        try {
            FileHandler.writeFile(filePath, modelContent);
            Logger.info('Generated model file: '+filePath);
            this.generatedEntities[tableName].modelClassName = modelClassName;
            this.generatedEntities[tableName].modelFileName = fileName;
            this.generatedEntities[tableName].driverKey = driverKey;
            return true;
        } catch (error) {
            ErrorManager.error('Failed to write model file: '+error.message);
        }
    }

    getEntityPropertiesDefinition(columns, driverKey)
    {
        if('mikro-orm' === driverKey){
            let entityProps = [];
            for(let columnName in columns){
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
            for(let columnName in columns){
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

    generateEntitiesConfigFile()
    {
        let configTemplatePath = this.templates['entities-config'];
        if(!FileHandler.exists(configTemplatePath)){
            ErrorManager.error('Entities config template file not found: '+configTemplatePath);
        }
        let configTemplateContent;
        try {
            configTemplateContent = FileHandler.fetchFileContents(configTemplatePath);
        } catch (error) {
            ErrorManager.error('Failed to read entities config template file: '+error.message);
        }
        if(!configTemplateContent || 'string' !== typeof configTemplateContent){
            ErrorManager.error('Invalid entities config template content');
        }
        let requireStatements = this.getRequireStatements();
        let entitiesConfigExport = this.getEntitiesConfigExport();
        let replacements = {
            requireStatements,
            entitiesConfigExport
        };
        let configContent = this.applyReplacements(configTemplateContent, replacements);
        try {
            FileHandler.writeFile(this.entitiesConfigPath, configContent);
            Logger.info('Generated entities config file: '+this.entitiesConfigPath);
            return true;
        } catch (error) {
            ErrorManager.error('Failed to write entities config file: '+error.message);
        }
    }

    getRequireStatements()
    {
        let requireStatements = [];
        for(let tableName in this.generatedEntities){
            let entity = this.generatedEntities[tableName];
            requireStatements.push('const { '+entity.entityClassName+' } = require(\'./entities/'+entity.entityFileName.replace('.js', '')+'\');');
        }
        return requireStatements.join('\n');
    }

    getEntitiesConfigExport()
    {
        let entitiesConfigExport = [];
        for(let tableName in this.generatedEntities){
            let entity = this.generatedEntities[tableName];
            let camelCaseKey = sc.camelCase(tableName);
            entitiesConfigExport.push(camelCaseKey+': '+entity.entityClassName+'.propertiesConfig()');
        }
        return entitiesConfigExport.join(',\n    ');
    }

    generateEntitiesTranslationsFile()
    {
        let translationsTemplatePath = this.templates['entities-translations'];
        if(!FileHandler.exists(translationsTemplatePath)){
            ErrorManager.error('Entities translations template file not found: '+translationsTemplatePath);
        }
        let translationsTemplateContent;
        try {
            translationsTemplateContent = FileHandler.fetchFileContents(translationsTemplatePath);
        } catch (error) {
            ErrorManager.error('Failed to read entities translations template file: '+error.message);
        }
        if(!translationsTemplateContent || 'string' !== typeof translationsTemplateContent){
            ErrorManager.error('Invalid entities translations template content');
        }
        let labels = this.getTranslationLabels();
        let translationsContent = translationsTemplateContent.replace(
            /{{labels}}/g,
            labels
        );
        try {
            FileHandler.writeFile(this.entitiesTranslationsPath, translationsContent);
            Logger.info('Generated entities translations file: '+this.entitiesTranslationsPath);
            return true;
        } catch (error) {
            ErrorManager.error('Failed to write entities translations file: '+error.message);
        }
    }

    getTranslationLabels()
    {
        let labels = [];
        for(let tableName in this.generatedEntities){
            let humanReadable = tableName
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            labels.push('\''+tableName+'\': \''+humanReadable+'\'');
        }
        return labels.join(',\n        ');
    }

    generateRegisteredModelsFile(driverKey)
    {
        let registeredTemplatePath = this.templates['registered-models'];
        if(!FileHandler.exists(registeredTemplatePath)){
            ErrorManager.error('Registered models template file not found: '+registeredTemplatePath);
        }
        let registeredTemplateContent;
        try {
            registeredTemplateContent = FileHandler.fetchFileContents(registeredTemplatePath);
        } catch (error) {
            ErrorManager.error('Failed to read registered models template file: '+error.message);
        }
        if(!registeredTemplateContent || 'string' !== typeof registeredTemplateContent){
            ErrorManager.error('Invalid registered models template content');
        }
        let registeredModels = this.getRegisteredModels(driverKey);
        let registeredEntitiesObject = this.getRegisteredEntitiesObject(driverKey);
        let replacements = {
            registeredModels,
            registeredEntitiesObject
        };
        let registeredContent = this.applyReplacements(registeredTemplateContent, replacements);
        let driverFolder = FileHandler.joinPaths(this.modelsFolder, driverKey);
        let filePath = FileHandler.joinPaths(driverFolder, 'registered-models-'+driverKey+'.js');
        try {
            FileHandler.writeFile(filePath, registeredContent);
            Logger.info('Generated registered models file: '+filePath);
            return true;
        } catch (error) {
            ErrorManager.error('Failed to write registered models file: '+error.message);
        }
    }

    getRegisteredModels(driverKey)
    {
        let registeredModels = [];
        for(let tableName in this.generatedEntities){
            let entity = this.generatedEntities[tableName];
            if(entity.driverKey === driverKey){
                registeredModels.push('const { '+entity.modelClassName+' } = require(\'./'+entity.modelFileName.replace('.js', '')+'\');');
            }
        }
        return registeredModels.join('\n');
    }

    getRegisteredEntitiesObject(driverKey)
    {
        let registeredEntitiesObject = [];
        for(let tableName in this.generatedEntities){
            let entity = this.generatedEntities[tableName];
            if(entity.driverKey === driverKey){
                let camelCaseKey = sc.camelCase(tableName);
                registeredEntitiesObject.push(camelCaseKey+': '+entity.modelClassName);
            }
        }
        return registeredEntitiesObject.join(',\n    ');
    }

    applyReplacements(content, replacements)
    {
        let result = content;
        for(let placeholder in replacements){
            result = result.replace(
                new RegExp('{{'+placeholder+'}}', 'g'),
                replacements[placeholder]
            );
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
        this.ensureFoldersExist();
        let driverKey = sc.get(
            this.connectionData,
            'driver',
            (this.server ? sc.get(this.driversClassMap, this.server.constructor.name, false) : false)
        );
        if(!driverKey){
            Logger.critical('Failed to fetch driver key.');
            return false;
        }
        for(let tableName in tables){
            let tableData = tables[tableName];
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
            ErrorManager.error('Unsupported driver: '+driverKey);
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

}

module.exports.EntitiesGenerator = EntitiesGenerator;
