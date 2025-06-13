/**
 *
 * Reldens - EntitiesConfigGeneration
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');
const { BaseGenerator } = require('./base-generator');

class EntitiesConfigGeneration extends BaseGenerator
{

    constructor(props)
    {
        super();
        this.entitiesConfigPath = sc.get(props, 'entitiesConfigPath', '');
        this.templatePath = sc.get(props, 'templatePath', '');
    }

    generateEntitiesConfigFile(generatedEntities, existingEntities, isOverride)
    {
        if(isOverride){
            return this.regenerateEntitiesConfigFile(generatedEntities, existingEntities);
        }
        return this.appendToEntitiesConfigFile(generatedEntities);
    }

    regenerateEntitiesConfigFile(generatedEntities, existingEntities)
    {
        let configTemplateContent = FileHandler.fetchFileContents(this.templatePath);
        if(!configTemplateContent){
            Logger.critical('Failed to read entities config template file: '+this.templatePath);
            return false;
        }
        let allEntities = Object.assign({}, existingEntities, generatedEntities);
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

    appendToEntitiesConfigFile(generatedEntities)
    {
        if(0 === Object.keys(generatedEntities).length){
            return true;
        }
        if(!FileHandler.exists(this.entitiesConfigPath)){
            Logger.info('Entities config file does not exist, creating new file.');
            return this.regenerateEntitiesConfigFile(generatedEntities, {});
        }
        let existingContent = FileHandler.readFile(this.entitiesConfigPath);
        if(!existingContent){
            Logger.error('Could not read existing entities config file.');
            return false;
        }
        let newRequires = [];
        let newConfigs = [];
        for(let tableName of Object.keys(generatedEntities)){
            let entity = generatedEntities[tableName];
            let entityClassName = sc.get(entity, 'entityClassName', sc.capitalizedCamelCase(tableName)+'Entity');
            let entityFileName = sc.get(entity, 'entityFileName', sc.kebabCase(tableName)+'-entity').replace('.js', '');
            let requireStatement = 'const { '+ entityClassName+' } = require(\'./entities/'+entityFileName+'\');';
            let configEntry = sc.camelCase(tableName)+': '+entityClassName+'.propertiesConfig()';
            if(!existingContent.includes(requireStatement)){
                newRequires.push(requireStatement);
            }
            if(!this.entityExistsInConfig(tableName, existingContent)){
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

    entityExistsInConfig(tableName, configContent)
    {
        return configContent.includes(sc.camelCase(tableName)+':');
    }

}

module.exports.EntitiesConfigGeneration = EntitiesConfigGeneration;
