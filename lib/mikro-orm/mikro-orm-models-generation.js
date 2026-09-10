/**
 *
 * Reldens - MikroOrmModelsGeneration
 *
 */

const { sc } = require('@reldens/utils');

class MikroOrmModelsGeneration
{

    constructor(relationsDetection)
    {
        this.relationsDetection = relationsDetection;
        this.relationKindMap = {
            'BelongsToOneRelation': 'm:1',
            'HasOneRelation': '1:1',
            'HasManyRelation': '1:m',
            'ManyToManyRelation': 'm:n'
        };
        this.columnTypesMap = {
            'bigint': 'number'
        };
    }

    modelTableName(tableName)
    {
        return tableName;
    }

    generateRelations(tableName, tableData, relationMetadata)
    {
        return '';
    }

    generateIdColumn(columns)
    {
        return '';
    }

    generateEntityProperties(columns, tableName, tableData)
    {
        if(!tableName || !tableData){
            return this.columnsProperties(columns, {}).join(',\n        ');
        }
        let relations = this.relationsDetection.detectForwardRelations(tableName, tableData);
        let entityProps = this.columnsProperties(columns);
        for(let relationKey of Object.keys(relations)){
            entityProps.push(this.forwardRelationProperty(relationKey, relations[relationKey], columns));
        }
        let reverseRelations = this.relationsDetection.detectReverseRelations(tableName);
        for(let relationKey of Object.keys(reverseRelations)){
            entityProps.push(this.reverseRelationProperty(relationKey, reverseRelations[relationKey], tableName));
        }
        return entityProps.join(',\n        ');
    }

    columnsProperties(columns)
    {
        let entityProps = [];
        for(let columnName of Object.keys(columns)){
            entityProps.push(this.columnProperty(columnName, columns[columnName]));
        }
        return entityProps;
    }

    columnProperty(columnName, column)
    {
        let propDef = columnName+': { type: \''+sc.get(this.columnTypesMap, column.type, column.type)+'\'';
        if('PRI' === column.key){
            propDef += ', primary: true';
        }
        if('UNI' === column.key){
            propDef += ', unique: true';
        }
        if(column.nullable || this.hasDefaultValue(column)){
            propDef += ', nullable: true';
        }
        return propDef+' }';
    }

    hasDefaultValue(column)
    {
        return null !== column.default && 'undefined' !== typeof column.default;
    }

    forwardRelationProperty(relationKey, relation, columns)
    {
        let relatedModelClass = sc.capitalizedCamelCase(relation.referencedTable)+'Model';
        let relatedModelFile = sc.kebabCase(relation.referencedTable)+'-model';
        let propDef = relationKey+': {\n';
        propDef += '            kind: \''+this.forwardRelationKind(columns[relation.fromColumn])+'\',\n';
        propDef += '            entity: () => require(\'./'+relatedModelFile+'\').'+relatedModelClass;
        if(relation.fromColumn){
            propDef += ',\n            joinColumns: [\''+relation.fromColumn+'\']';
        }
        if(this.isNonPrimaryReference(relation)){
            propDef += ',\n            referencedColumnNames: [\''+relation.toColumn+'\']';
            propDef += ',\n            targetKey: \''+relation.toColumn+'\'';
            propDef += ',\n            cascade: [],\n            mapToPk: true';
        }
        if(this.isNullableColumn(columns[relation.fromColumn])){
            propDef += ',\n            nullable: true';
        }
        propDef += ',\n            persist: false';
        return propDef+'\n        }';
    }

    isNonPrimaryReference(relation)
    {
        if(!relation.toColumn){
            return false;
        }
        return 'id' !== relation.toColumn;
    }

    isNullableColumn(column)
    {
        if(!column){
            return false;
        }
        return Boolean(column.nullable);
    }

    forwardRelationKind(column)
    {
        if('HasOneRelation' === this.relationsDetection.determineRelationType(column, false)){
            return this.relationKindMap.HasOneRelation;
        }
        return this.relationKindMap.BelongsToOneRelation;
    }

    reverseRelationProperty(relationKey, relation, tableName)
    {
        let relatedModelClass = sc.capitalizedCamelCase(relation.referencingTable)+'Model';
        let relatedModelFile = sc.kebabCase(relation.referencingTable)+'-model';
        let mappedBy = this.relationsDetection.findMappedByKey(tableName, relation.referencingTable, relation);
        let propDef = relationKey+': {\n';
        propDef += '            kind: \''+sc.get(this.relationKindMap, relation.relationType, '1:m')+'\',\n';
        propDef += '            entity: () => require(\'./'+relatedModelFile+'\').'+relatedModelClass;
        if(mappedBy){
            propDef += ',\n            mappedBy: \''+mappedBy+'\'';
        }
        return propDef+'\n        }';
    }

    generateFkMappings(tableName, tableData)
    {
        if(!tableName || !tableData){
            return '';
        }
        let fkMappings = {};
        let referenceCounts = this.relationsDetection.countReferencesPerTable(tableData);
        for(let columnName of Object.keys(tableData.columns)){
            let column = tableData.columns[columnName];
            if(!sc.hasOwn(column, 'referencedTable')){
                continue;
            }
            fkMappings[columnName] = {
                relationKey: this.relationsDetection.generateForwardRelationKey(
                    column.referencedTable,
                    columnName,
                    referenceCounts
                ),
                entityName: sc.capitalizedCamelCase(column.referencedTable)+'Model',
                referencedColumn: column.referencedColumn,
                nullable: sc.get(column, 'nullable', false)
            };
        }
        if(0 === Object.keys(fkMappings).length){
            return '';
        }
        return JSON.stringify(fkMappings, null, 4);
    }

}

module.exports.MikroOrmModelsGeneration = MikroOrmModelsGeneration;
