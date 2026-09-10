/**
 *
 * Reldens - RelationsDetection
 *
 */

const { RELATION_PREFIX } = require('../relation-key');
const { sc } = require('@reldens/utils');

class RelationsDetection
{

    constructor(props)
    {
        this.allTablesData = {};
        this.removeIdFromMultipleRelations = sc.get(props, 'removeIdFromMultipleRelations', true);
    }

    detectForwardRelations(tableName, tableData)
    {
        let relations = {};
        let referenceCounts = this.countReferencesPerTable(tableData);
        for(let columnName of Object.keys(tableData.columns)){
            let column = tableData.columns[columnName];
            if(!sc.hasOwn(column, 'referencedTable')){
                continue;
            }
            let relationKey = this.generateForwardRelationKey(column.referencedTable, columnName, referenceCounts);
            relations[relationKey] = {
                fromColumn: columnName,
                toColumn: column.referencedColumn,
                referencedTable: column.referencedTable,
                relationType: this.determineRelationType(column, true)
            };
        }
        return relations;
    }

    detectReverseRelations(tableName)
    {
        let reverseRelations = {};
        for(let otherTableName of Object.keys(this.allTablesData)){
            if(otherTableName === tableName){
                continue;
            }
            Object.assign(reverseRelations, this.detectTableReverseRelations(tableName, otherTableName));
        }
        return reverseRelations;
    }

    detectTableReverseRelations(tableName, otherTableName)
    {
        let reverseRelations = {};
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
            reverseRelations[relationKey] = {
                fromColumn: column.referencedColumn,
                toColumn: columnName,
                referencingTable: otherTableName,
                relationType: this.determineRelationType(column, false)
            };
        }
        return reverseRelations;
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
            return RELATION_PREFIX+referencedTable;
        }
        return RELATION_PREFIX+referencedTable+'_'+this.relationKeyColumnSuffix(columnName);
    }

    generateReverseRelationKey(referencingTable, columnName, referenceCount)
    {
        if(1 === referenceCount){
            return RELATION_PREFIX+referencingTable;
        }
        return RELATION_PREFIX+referencingTable+'_'+this.relationKeyColumnSuffix(columnName);
    }

    relationKeyColumnSuffix(columnName)
    {
        if(this.removeIdFromMultipleRelations){
            return columnName.replace(/_id$/i, '');
        }
        return columnName;
    }

    findMappedByKey(currentTable, referencingTable, reverseRelation)
    {
        if(!this.allTablesData[referencingTable]){
            return RELATION_PREFIX+currentTable;
        }
        let forwardRelations = this.detectForwardRelations(referencingTable, this.allTablesData[referencingTable]);
        for(let forwardKey of Object.keys(forwardRelations)){
            let forward = forwardRelations[forwardKey];
            if(forward.referencedTable !== currentTable){
                continue;
            }
            if(forward.fromColumn === reverseRelation.toColumn && forward.toColumn === reverseRelation.fromColumn){
                return forwardKey;
            }
        }
        return RELATION_PREFIX+currentTable;
    }

    detectPrimaryKeyColumn(columns)
    {
        for(let columnName of Object.keys(columns)){
            if('PRI' === columns[columnName].key){
                return columnName;
            }
        }
        return null;
    }

}

module.exports.RelationsDetection = RelationsDetection;
