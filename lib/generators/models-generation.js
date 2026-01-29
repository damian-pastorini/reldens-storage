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
        this.removeIdFromMultipleRelations = sc.get(props, 'removeIdFromMultipleRelations', true);
        this.mikroOrmRelationKindMap = {
            'BelongsToOneRelation': 'm:1',
            'HasOneRelation': '1:1',
            'HasManyRelation': '1:m',
            'ManyToManyRelation': 'm:n'
        };
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
        let idColumn = this.generateIdColumn(tableData.columns, driverKey);
        let replacements = {
            modelClassName,
            tableName: 'prisma' === driverKey ? tableName.toLowerCase() : tableName,
            modelPropertiesList,
            modelPropertiesConstructor,
            modelRelations,
            entityPropertiesDefinition,
            idColumn
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

    generateIdColumn(columns, driverKey)
    {
        if('objection-js' !== driverKey){
            return '';
        }
        let primaryKeyColumn = this.detectPrimaryKeyColumn(columns);
        if(!primaryKeyColumn || 'id' === primaryKeyColumn){
            return '';
        }
        return '\n    static get idColumn()\n    {\n        return \''+primaryKeyColumn+'\';\n    }\n';
    }

    detectPrimaryKeyColumn(columns)
    {
        for(let columnName of Object.keys(columns)){
            let column = columns[columnName];
            if('PRI' === column.key){
                return columnName;
            }
        }
        return null;
    }

    setAllTablesData(allTablesData)
    {
        this.allTablesData = allTablesData;
    }

    generateModelRelations(tableName, tableData, relationMetadata, driverKey)
    {
        if('prisma' === driverKey){
            return this.generatePrismaRelations(tableName, tableData, relationMetadata);
        }
        if('objection-js' === driverKey){
            return this.generateObjectionJsRelations(tableName, tableData);
        }
        return '';
    }

    generatePrismaRelations(tableName, tableData, relationMetadata)
    {
        if(!relationMetadata || 0 === Object.keys(relationMetadata).length){
            return '';
        }
        let relationTypesArray = [];
        let relationMappingsArray = [];
        let forwardMappings = this.buildPrismaForwardMappings(tableData, relationMetadata);
        let reverseMappings = this.buildPrismaReverseMappings(tableName, relationMetadata);
        let allMappings = Object.assign({}, forwardMappings, reverseMappings);
        for(let prismaRelationName of Object.keys(relationMetadata)){
            let relation = relationMetadata[prismaRelationName];
            relationTypesArray.push('            '+prismaRelationName+': \''+relation.type+'\'');
        }
        for(let reldensKey of Object.keys(allMappings)){
            let prismaName = allMappings[reldensKey];
            relationMappingsArray.push('            \''+reldensKey+'\': \''+prismaName+'\'');
        }
        let result = '';
        if(0 < relationTypesArray.length){
            result += '\n\n    static get relationTypes()\n    {\n        return {\n';
            result += relationTypesArray.join(',\n');
            result += '\n        };\n    }';
        }
        if(0 < relationMappingsArray.length){
            result += '\n\n    static get relationMappings()\n    {\n        return {\n';
            result += relationMappingsArray.join(',\n');
            result += '\n        };\n    }';
        }
        return result;
    }

    buildPrismaForwardMappings(tableData, relationMetadata)
    {
        let mappings = {};
        let referenceCounts = this.countReferencesPerTable(tableData);
        for(let columnName of Object.keys(tableData.columns)){
            let column = tableData.columns[columnName];
            if(!sc.hasOwn(column, 'referencedTable')){
                continue;
            }
            let reldensKey = this.generateForwardRelationKey(
                column.referencedTable,
                columnName,
                referenceCounts
            );
            let prismaName = this.findPrismaRelationForFk(columnName, column.referencedTable, relationMetadata);
            if(!prismaName){
                continue;
            }
            mappings[reldensKey] = prismaName;
        }
        return mappings;
    }

    findPrismaRelationForFk(columnName, referencedTable, relationMetadata)
    {
        let lowerColumn = columnName.toLowerCase();
        let lowerTable = referencedTable.toLowerCase();
        for(let prismaName of Object.keys(relationMetadata)){
            let relation = relationMetadata[prismaName];
            if(relation.model.toLowerCase() !== lowerTable){
                continue;
            }
            if(relation.isList){
                continue;
            }
            let lowerPrisma = prismaName.toLowerCase();
            if(lowerPrisma.includes(lowerColumn.replace('_id', ''))){
                return prismaName;
            }
            if(lowerPrisma.includes(lowerColumn)){
                return prismaName;
            }
        }
        for(let prismaName of Object.keys(relationMetadata)){
            let relation = relationMetadata[prismaName];
            if(relation.model.toLowerCase() !== lowerTable){
                continue;
            }
            if(relation.isList){
                continue;
            }
            return prismaName;
        }
        return null;
    }

    buildPrismaReverseMappings(tableName, relationMetadata)
    {
        let mappings = {};
        let reverseRelations = {};
        for(let prismaName of Object.keys(relationMetadata)){
            let relation = relationMetadata[prismaName];
            if(this.isForwardRelation(relation)){
                continue;
            }
            let relatedTable = relation.model.toLowerCase();
            if(!reverseRelations[relatedTable]){
                reverseRelations[relatedTable] = [];
            }
            reverseRelations[relatedTable].push({prismaName, relation});
        }
        for(let relatedTable of Object.keys(reverseRelations)){
            let relations = reverseRelations[relatedTable];
            let referenceCount = relations.length;
            for(let relInfo of relations){
                let reldensKey = this.generatePrismaReverseRelationKey(
                    relatedTable,
                    relInfo.prismaName,
                    tableName,
                    referenceCount
                );
                mappings[reldensKey] = relInfo.prismaName;
            }
        }
        return mappings;
    }

    isForwardRelation(relation)
    {
        return sc.hasOwn(relation, 'foreignKeys')
            && sc.isArray(relation.foreignKeys)
            && 0 < relation.foreignKeys.length;
    }

    generatePrismaReverseRelationKey(relatedTable, prismaName, tableName, referenceCount)
    {
        if(1 === referenceCount){
            return 'related_'+relatedTable;
        }
        let columnHint = this.extractColumnHintFromPrismaName(prismaName, relatedTable, tableName);
        if(columnHint){
            return 'related_'+relatedTable+'_'+columnHint;
        }
        return 'related_'+relatedTable;
    }

    extractColumnHintFromPrismaName(prismaName, relatedTable, tableName)
    {
        let lowerName = prismaName.toLowerCase();
        let lowerTable = tableName.toLowerCase();
        let lowerRelated = relatedTable.toLowerCase();
        let toSuffix = 'to'+lowerTable;
        if(!lowerName.endsWith(toSuffix)){
            toSuffix = 'to'+lowerRelated;
            if(!lowerName.endsWith(toSuffix)){
                return null;
            }
        }
        let withoutSuffix = prismaName.slice(0, -toSuffix.length);
        let lowerWithout = withoutSuffix.toLowerCase();
        let prefixes = [
            lowerRelated+'_'+lowerRelated+'_',
            lowerRelated+'_',
            lowerTable+'_'
        ];
        for(let prefix of prefixes){
            if(lowerWithout.startsWith(prefix)){
                withoutSuffix = withoutSuffix.slice(prefix.length);
                lowerWithout = withoutSuffix.toLowerCase();
            }
        }
        if(withoutSuffix.endsWith('_id')){
            withoutSuffix = withoutSuffix.slice(0, -3);
        }
        return withoutSuffix.toLowerCase();
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
        let relationMappingsMethod = '\n    static get relationMappings()\n    {\n';
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
        let referenceCounts = this.countReferencesPerTable(tableData);
        for(let columnName of Object.keys(tableData.columns)){
            let column = tableData.columns[columnName];
            if(!sc.hasOwn(column, 'referencedTable')){
                continue;
            }
            let relationKey = this.generateForwardRelationKey(column.referencedTable, columnName, referenceCounts);
            let relationType = this.determineForwardRelationType(tableName, columnName, column);
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
            let referenceCounts = this.countReferencesToTable(tableName, otherTableData);
            for(let columnName of Object.keys(otherTableData.columns)){
                let column = otherTableData.columns[columnName];
                if(!sc.hasOwn(column, 'referencedTable')){
                    continue;
                }
                if(column.referencedTable !== tableName){
                    continue;
                }
                let relationKey = this.generateReverseRelationKey(otherTableName, columnName, referenceCounts);
                let relationType = this.determineReverseRelationType(otherTableName, columnName, column);
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

    countReferencesPerTable(tableData)
    {
        let counts = {};
        for(let columnName of Object.keys(tableData.columns)){
            let column = tableData.columns[columnName];
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

    countReferencesToTable(targetTable, sourceTableData)
    {
        let count = 0;
        for(let columnName of Object.keys(sourceTableData.columns)){
            let column = sourceTableData.columns[columnName];
            if(!sc.hasOwn(column, 'referencedTable')){
                continue;
            }
            if(column.referencedTable === targetTable){
                count++;
            }
        }
        return count;
    }

    generateForwardRelationKey(referencedTable, columnName, referenceCounts)
    {
        if(1 === referenceCounts[referencedTable]){
            return 'related_'+referencedTable;
        }
        let columnSuffix = columnName;
        if(this.removeIdFromMultipleRelations){
            columnSuffix = columnName.replace(/_id$/i, '');
        }
        return 'related_'+referencedTable+'_'+columnSuffix;
    }

    generateReverseRelationKey(referencingTable, columnName, referenceCount)
    {
        if(1 === referenceCount){
            return 'related_'+referencingTable;
        }
        let columnSuffix = columnName;
        if(this.removeIdFromMultipleRelations){
            columnSuffix = columnName.replace(/_id$/i, '');
        }
        return 'related_'+referencingTable+'_'+columnSuffix;
    }

    determineForwardRelationType(tableName, columnName, column)
    {
        return 'BelongsToOneRelation';
    }

    determineReverseRelationType(referencingTableName, referencingColumnName, referencingColumn)
    {
        if(!this.allTablesData[referencingTableName]){
            return 'HasManyRelation';
        }
        let referencingTableData = this.allTablesData[referencingTableName];
        let referencingColumnData = referencingTableData.columns[referencingColumnName];
        if(!referencingColumnData){
            return 'HasManyRelation';
        }
        if('UNI' === referencingColumnData.key || 'PRI' === referencingColumnData.key){
            return 'HasOneRelation';
        }
        return 'HasManyRelation';
    }

    determineRelationType(column, isForwardRelation)
    {
        if(isForwardRelation){
            return 'BelongsToOneRelation';
        }
        if('PRI' === column.key || 'UNI' === column.key){
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

    findMappedByKey(currentTable, referencingTable, reverseRelation)
    {
        if(!this.allTablesData[referencingTable]){
            return 'related_'+currentTable;
        }
        let referencingTableData = this.allTablesData[referencingTable];
        let forwardRelations = this.detectObjectionJsRelations(referencingTable, referencingTableData);
        for(let forwardKey of Object.keys(forwardRelations)){
            let forward = forwardRelations[forwardKey];
            if(forward.referencedTable === currentTable && forward.toColumn === reverseRelation.fromColumn){
                return forwardKey;
            }
        }
        return 'related_'+currentTable;
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
            if(entity.driverKey && driverKey !== entity.driverKey){
                if(!existingModels[tableName] || !existingModels[tableName][driverKey]){
                    continue;
                }
            }
            let modelClassName = entity.modelClassName || sc.capitalizedCamelCase(tableName)+'Model';
            let variableName = 'mikro-orm' === driverKey ? sc.camelCase(tableName)+'Model' : modelClassName;
            registeredEntitiesObject.push(sc.camelCase(tableName)+': '+variableName);
        }
        return registeredEntitiesObject.join(',\n    ');
    }

}

module.exports.ModelsGeneration = ModelsGeneration;
