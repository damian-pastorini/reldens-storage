/**
 *
 * Reldens - PrismaModelsGeneration
 *
 */

const { sc } = require('@reldens/utils');
const { TypeMapper } = require('../type-mapper');
const { RELATION_PREFIX } = require('../relation-key');

class PrismaModelsGeneration
{

    constructor(relationsDetection)
    {
        this.relationsDetection = relationsDetection;
    }

    modelTableName(tableName)
    {
        return tableName.toLowerCase();
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

    generateEntityProperties(columns, tableName, tableData)
    {
        let prismaProps = [];
        for(let columnName of Object.keys(columns)){
            let column = columns[columnName];
            let propDef = columnName+': {\n            type: \''+TypeMapper.mapDbTypeToPrismaType(column.type)+'\'';
            if('PRI' === column.key){
                propDef += ',\n            id: true';
            }
            if(column.nullable){
                propDef += ',\n            optional: true';
            }
            prismaProps.push(propDef+'\n        }');
        }
        return prismaProps.join(',\n        ');
    }

    generateRelations(tableName, tableData, relationMetadata)
    {
        if(!relationMetadata || 0 === Object.keys(relationMetadata).length){
            return '';
        }
        let relationTypesArray = [];
        for(let prismaRelationName of Object.keys(relationMetadata)){
            relationTypesArray.push(
                '            '+prismaRelationName+': \''+relationMetadata[prismaRelationName].type+'\''
            );
        }
        let allMappings = Object.assign(
            {},
            this.buildForwardMappings(tableData, relationMetadata),
            this.buildReverseMappings(tableName, relationMetadata)
        );
        let relationMappingsArray = [];
        for(let reldensKey of Object.keys(allMappings)){
            relationMappingsArray.push('            \''+reldensKey+'\': \''+allMappings[reldensKey]+'\'');
        }
        return this.staticGetter('relationTypes', relationTypesArray)
            +this.staticGetter('relationMappings', relationMappingsArray);
    }

    staticGetter(getterName, entries)
    {
        if(0 === entries.length){
            return '';
        }
        return '\n\n    static get '+getterName+'()\n    {\n        return {\n'+entries.join(',\n')+'\n        };\n    }';
    }

    buildForwardMappings(tableData, relationMetadata)
    {
        let mappings = {};
        let referenceCounts = this.relationsDetection.countReferencesPerTable(tableData);
        for(let columnName of Object.keys(tableData.columns)){
            let column = tableData.columns[columnName];
            if(!sc.hasOwn(column, 'referencedTable')){
                continue;
            }
            let prismaName = this.findRelationForFk(columnName, column.referencedTable, relationMetadata);
            if(!prismaName){
                continue;
            }
            let reldensKey = this.relationsDetection.generateForwardRelationKey(
                column.referencedTable,
                columnName,
                referenceCounts
            );
            mappings[reldensKey] = prismaName;
        }
        return mappings;
    }

    findRelationForFk(columnName, referencedTable, relationMetadata)
    {
        let lowerColumn = columnName.toLowerCase();
        let candidates = this.singleRelationCandidates(referencedTable, relationMetadata);
        for(let prismaName of candidates){
            let lowerPrisma = prismaName.toLowerCase();
            if(lowerPrisma.includes(lowerColumn.replace('_id', ''))){
                return prismaName;
            }
            if(lowerPrisma.includes(lowerColumn)){
                return prismaName;
            }
        }
        if(0 === candidates.length){
            return null;
        }
        return [...candidates].shift();
    }

    singleRelationCandidates(referencedTable, relationMetadata)
    {
        let lowerTable = referencedTable.toLowerCase();
        let candidates = [];
        for(let prismaName of Object.keys(relationMetadata)){
            let relation = relationMetadata[prismaName];
            if(relation.model.toLowerCase() !== lowerTable){
                continue;
            }
            if(relation.isList){
                continue;
            }
            candidates.push(prismaName);
        }
        return candidates;
    }

    buildReverseMappings(tableName, relationMetadata)
    {
        let mappings = {};
        let reverseRelations = this.groupReverseRelationsByTable(relationMetadata);
        for(let relatedTable of Object.keys(reverseRelations)){
            Object.assign(
                mappings,
                this.tableReverseMappings(relatedTable, reverseRelations[relatedTable], tableName)
            );
        }
        return mappings;
    }

    tableReverseMappings(relatedTable, relations, tableName)
    {
        let mappings = {};
        for(let relInfo of relations){
            let reldensKey = this.reverseRelationKey(relatedTable, relInfo.prismaName, tableName, relations.length);
            mappings[reldensKey] = relInfo.prismaName;
        }
        return mappings;
    }

    groupReverseRelationsByTable(relationMetadata)
    {
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
        return reverseRelations;
    }

    isForwardRelation(relation)
    {
        return sc.hasOwn(relation, 'foreignKeys')
            && sc.isArray(relation.foreignKeys)
            && 0 < relation.foreignKeys.length;
    }

    reverseRelationKey(relatedTable, prismaName, tableName, referenceCount)
    {
        if(1 === referenceCount){
            return RELATION_PREFIX+relatedTable;
        }
        let columnHint = this.extractColumnHint(prismaName, relatedTable, tableName);
        if(columnHint){
            return RELATION_PREFIX+relatedTable+'_'+columnHint;
        }
        return RELATION_PREFIX+relatedTable;
    }

    extractColumnHint(prismaName, relatedTable, tableName)
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
        let prefixes = [
            lowerRelated+'_'+lowerRelated+'_',
            lowerRelated+'_',
            lowerTable+'_'
        ];
        for(let prefix of prefixes){
            if(withoutSuffix.toLowerCase().startsWith(prefix)){
                withoutSuffix = withoutSuffix.slice(prefix.length);
            }
        }
        if(withoutSuffix.endsWith('_id')){
            withoutSuffix = withoutSuffix.slice(0, -3);
        }
        return withoutSuffix.toLowerCase();
    }

}

module.exports.PrismaModelsGeneration = PrismaModelsGeneration;
