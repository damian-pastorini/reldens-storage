/**
 *
 * Reldens - QueryBuilderModelsGeneration
 *
 */

const { BaseGenerator } = require('./generators/base-generator');
const { sc } = require('@reldens/utils');

class QueryBuilderModelsGeneration extends BaseGenerator
{

    constructor(relationsDetection)
    {
        super();
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
        if(!primaryKeyColumn){
            return '';
        }
        if('id' === primaryKeyColumn){
            return '';
        }
        return '\n    static get idColumn()\n    {\n        return \''+primaryKeyColumn+'\';\n    }\n';
    }

    generateRelations(tableName, tableData, relationMetadata)
    {
        let allRelations = Object.assign(
            {},
            this.relationsDetection.detectForwardRelations(tableName, tableData),
            this.relationsDetection.detectReverseRelations(tableName)
        );
        let relationKeys = Object.keys(allRelations);
        if(0 === relationKeys.length){
            return '';
        }
        let relationMappings = [];
        for(let relationKey of relationKeys){
            relationMappings.push(this.relationMappingDefinition(relationKey, allRelations[relationKey]));
        }
        return '\n    static get relationMappings()\n    {\n        return {\n'
            +relationMappings.join(',\n')
            +'\n        };\n    }';
    }

    relationMappingDefinition(relationKey, relation)
    {
        let relatedTable = sc.get(relation, 'referencedTable', relation.referencingTable);
        let relationMapping = '            '+relationKey+': {\n';
        relationMapping += '                relation: \''+relation.relationType+'\',\n';
        relationMapping += '                tableName: \''+relatedTable+'\',\n';
        relationMapping += '                from: \''+relation.fromColumn+'\',\n';
        relationMapping += '                to: \''+relation.toColumn+'\'\n';
        relationMapping += '            }';
        return relationMapping;
    }

}

module.exports.QueryBuilderModelsGeneration = QueryBuilderModelsGeneration;
