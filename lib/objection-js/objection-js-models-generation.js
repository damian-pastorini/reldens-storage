/**
 *
 * Reldens - ObjectionJsModelsGeneration
 *
 */

const { sc } = require('@reldens/utils');

class ObjectionJsModelsGeneration
{

    constructor(relationsDetection)
    {
        this.relationsDetection = relationsDetection;
    }

    modelTableName(tableName)
    {
        return tableName;
    }

    generateEntityProperties(columns, tableName, tableData)
    {
        return '';
    }

    generateFkMappings(tableName, tableData)
    {
        return '';
    }

    generateIdColumn(columns)
    {
        let primaryKeyColumn = this.relationsDetection.detectPrimaryKeyColumn(columns);
        if(!primaryKeyColumn || 'id' === primaryKeyColumn){
            return '';
        }
        return '\n    static get idColumn()\n    {\n        return \''+primaryKeyColumn+'\';\n    }\n';
    }

    generateRelations(tableName, tableData, relationMetadata)
    {
        let relations = this.relationsDetection.detectForwardRelations(tableName, tableData);
        let reverseRelations = this.relationsDetection.detectReverseRelations(tableName);
        let allRelations = Object.assign({}, relations, reverseRelations);
        if(0 === Object.keys(allRelations).length){
            return '';
        }
        let relationMappings = [];
        let requiredModels = [];
        for(let relationKey of Object.keys(allRelations)){
            let relation = allRelations[relationKey];
            let tableReference = sc.get(relation, 'referencedTable', relation.referencingTable);
            let relatedModelClass = sc.capitalizedCamelCase(tableReference)+'Model';
            if(!requiredModels.find(requiredModel => requiredModel.modelClass === relatedModelClass)){
                requiredModels.push({
                    modelClass: relatedModelClass,
                    fileName: sc.kebabCase(tableReference)+'-model'
                });
            }
            relationMappings.push(this.relationMappingDefinition(relationKey, relation, relatedModelClass));
        }
        return this.relationMappingsMethod(requiredModels, relationMappings);
    }

    relationMappingDefinition(relationKey, relation, relatedModelClass)
    {
        let relationMapping = '            '+relationKey+': {\n';
        relationMapping += '                relation: this.'+relation.relationType+',\n';
        relationMapping += '                modelClass: '+relatedModelClass+',\n';
        relationMapping += '                join: {\n';
        relationMapping += '                    from: this.tableName+\'.'+relation.fromColumn+'\',\n';
        relationMapping += '                    to: '+relatedModelClass+'.tableName+\'.'+relation.toColumn+'\'\n';
        relationMapping += '                }\n';
        relationMapping += '            }';
        return relationMapping;
    }

    relationMappingsMethod(requiredModels, relationMappings)
    {
        let requireStatements = [];
        for(let modelInfo of requiredModels){
            requireStatements.push(
                '        const { '+modelInfo.modelClass+' } = require(\'./'+modelInfo.fileName+'\');'
            );
        }
        let relationMappingsMethod = '\n    static get relationMappings()\n    {\n';
        relationMappingsMethod += requireStatements.join('\n')+'\n';
        relationMappingsMethod += '        return {\n';
        relationMappingsMethod += relationMappings.join(',\n');
        relationMappingsMethod += '\n        };\n';
        relationMappingsMethod += '    }';
        return relationMappingsMethod;
    }

}

module.exports.ObjectionJsModelsGeneration = ObjectionJsModelsGeneration;
