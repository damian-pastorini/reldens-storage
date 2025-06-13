/**
 *
 * Reldens - EntitiesTranslationsGeneration
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');
const { BaseGenerator } = require('./base-generator');

class EntitiesTranslationsGeneration extends BaseGenerator
{

    constructor(props)
    {
        super();
        this.entitiesTranslationsPath = sc.get(props, 'entitiesTranslationsPath', '');
        this.templatePath = sc.get(props, 'templatePath', '');
    }

    generateEntitiesTranslationsFile(generatedEntities, existingEntities, isOverride)
    {
        if(isOverride){
            return this.regenerateEntitiesTranslationsFile(generatedEntities, existingEntities);
        }
        return this.appendToEntitiesTranslationsFile(generatedEntities);
    }

    regenerateEntitiesTranslationsFile(generatedEntities, existingEntities)
    {
        if(!FileHandler.exists(this.templatePath)){
            Logger.critical('Entities translations template file not found: '+this.templatePath);
            return false;
        }
        let translationsTemplateContent = FileHandler.fetchFileContents(this.templatePath);
        if(!translationsTemplateContent){
            Logger.critical('Failed to read entities translations template file: '+this.templatePath);
            return false;
        }
        let translationsContent = translationsTemplateContent.replace(
            /{{labels}}/g,
            this.getTranslationLabels(Object.assign({}, existingEntities, generatedEntities))
        );
        if(!FileHandler.writeFile(this.entitiesTranslationsPath, translationsContent)){
            Logger.critical('Failed to write entities translations file: '+this.entitiesTranslationsPath);
            return false;
        }
        Logger.info('Regenerated entities translations file: '+this.entitiesTranslationsPath);
        return true;
    }

    appendToEntitiesTranslationsFile(generatedEntities)
    {
        if(0 === Object.keys(generatedEntities).length){
            return true;
        }
        if(!FileHandler.exists(this.entitiesTranslationsPath)){
            Logger.info('Entities translations file does not exist, creating new file.');
            return this.regenerateEntitiesTranslationsFile(generatedEntities, {});
        }
        let existingContent = FileHandler.readFile(this.entitiesTranslationsPath);
        if(!existingContent){
            Logger.error('Could not read existing translations file.');
            return false;
        }
        let newTranslations = [];
        for(let tableName of Object.keys(generatedEntities)){
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

}

module.exports.EntitiesTranslationsGeneration = EntitiesTranslationsGeneration;
