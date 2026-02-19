/**
 *
 * Reldens - EntitiesGeneration
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');
const { TypeMapper } = require('../type-mapper');
const { BaseGenerator } = require('./base-generator');
const { RELATION_PREFIX } = require('../relation-key');

class EntitiesGeneration extends BaseGenerator
{

    constructor(props)
    {
        super();
        this.entitiesFolder = sc.get(props, 'entitiesFolder', '');
        this.templatePath = sc.get(props, 'templatePath', '');
        this.generatedEntities = {};
        this.removeIdFromMultipleRelations = sc.get(props, 'removeIdFromMultipleRelations', true);
    }

    async generateEntityFile(tableName, tableData)
    {
        if(!FileHandler.exists(this.templatePath)){
            Logger.critical('Entity template file not found: '+this.templatePath);
            return false;
        }
        let entityTemplateContent = FileHandler.fetchFileContents(this.templatePath);
        if(!entityTemplateContent){
            Logger.critical('Failed to read entity template file: '+this.templatePath);
            return false;
        }
        let entityClassName = sc.capitalizedCamelCase(tableName)+'Entity';
        let titleProperty = this.determineTitleProperty(tableData.columns);
        for(let columnName of Object.keys(tableData.columns)){
            tableData.columns[columnName].tableName = tableName;
        }
        let primaryKeyColumn = this.detectPrimaryKeyColumn(tableData.columns);
        let propertiesConfig = this.generatePropertiesConfig(tableData.columns, titleProperty, primaryKeyColumn);
        let titlePropertyDeclaration = titleProperty ? '\n        let titleProperty = \''+titleProperty+'\';' : '';
        let titlePropertyReturn = titleProperty ? '\n            titleProperty,' : '';
        let fieldsToRemoveFromEdit = [];
        if(primaryKeyColumn){
            fieldsToRemoveFromEdit.push(primaryKeyColumn);
        }
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
        let properties = this.buildPropertiesObject(tableData.columns);
        this.generatedEntities[tableName] = {
            entityClassName,
            entityFileName: fileName,
            tableName,
            titleProperty,
            properties
        };
        return true;
    }

    buildPropertiesObject(columns)
    {
        let properties = {};
        for(let columnName of Object.keys(columns)){
            properties[columnName] = true;
        }
        return properties;
    }

    detectPrimaryKeyColumn(columns)
    {
        for(let columnName of Object.keys(columns)){
            let column = columns[columnName];
            if('PRI' === column.key){
                return columnName;
            }
        }
        return false;
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
        if(0 === fieldsToRemove.length){
            return 'let editProperties = propertiesKeys;';
        }
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

    countReferencesPerTable(columns)
    {
        let counts = {};
        for(let columnName of Object.keys(columns)){
            let column = columns[columnName];
            if(!sc.hasOwn(column, 'referencedTable')){
                continue;
            }
            if(!counts[column.referencedTable]){
                counts[column.referencedTable] = 0;
            }
            counts[column.referencedTable]++;
        }
        return counts;
    }

    generateForwardRelationKey(referencedTable, columnName, referenceCounts)
    {
        if(1 === referenceCounts[referencedTable]){
            return RELATION_PREFIX+referencedTable;
        }
        let columnSuffix = columnName;
        if(this.removeIdFromMultipleRelations){
            columnSuffix = columnName.replace(/_id$/i, '');
        }
        return RELATION_PREFIX+referencedTable+'_'+columnSuffix;
    }

    generatePropertiesConfig(columns, titleProperty, primaryKeyColumn)
    {
        let referenceCounts = this.countReferencesPerTable(columns);
        let propertiesConfig = [];
        for(let columnName of Object.keys(columns)){
            let column = columns[columnName];
            let propertyKey = titleProperty && titleProperty === columnName ? '[titleProperty]' : columnName;
            let isPrimaryKey = primaryKeyColumn && primaryKeyColumn === columnName;
            if(isPrimaryKey){
                let props = this.getPropertyAttributes(column, columnName, referenceCounts);
                props.unshift('isId: true');
                propertiesConfig.push(propertyKey+': {\n                '+props.join(',\n                ')+ '\n            }');
                continue;
            }
            let props = this.getPropertyAttributes(column, columnName, referenceCounts);
            if(0 === props.length){
                let dbType = column.type.toLowerCase();
                propertiesConfig.push(propertyKey+': {\n                dbType: \''+dbType+'\'\n            }');
                continue;
            }
            propertiesConfig.push(
                propertyKey+': {\n                '+props.join(',\n                ')+ '\n            }'
            );
        }
        return propertiesConfig.join(',\n            ');
    }

    getPropertyAttributes(column, columnName, referenceCounts)
    {
        let props = [];
        let type = column.type.toLowerCase();
        this.addTypeAttribute(props, column, type, columnName, referenceCounts);
        this.addRequiredAttribute(props, column);
        props.push('dbType: \''+type+'\'');
        return props;
    }

    addTypeAttribute(props, column, type, columnName, referenceCounts)
    {
        if(column.referencedTable){
            props.push('type: \'reference\'');
            let referenceTable = this.getReferenceTable(column);
            props.push('reference: \''+referenceTable+'\'');
            let alias = this.generateForwardRelationKey(referenceTable, columnName, referenceCounts);
            props.push('alias: \''+alias+'\'');
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

}

module.exports.EntitiesGeneration = EntitiesGeneration;
