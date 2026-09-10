/**
 *
 * Reldens - DrizzleModelsGeneration
 *
 */

const { QueryBuilderModelsGeneration } = require('../query-builder-models-generation');
const { TypeMapper } = require('../type-mapper');

class DrizzleModelsGeneration extends QueryBuilderModelsGeneration
{

    generateEntityProperties(columns, tableName, tableData)
    {
        let columnLines = [];
        for(let columnName of Object.keys(columns)){
            columnLines.push(columnName+': '+this.columnBuilder(columns[columnName]));
        }
        return columnLines.join(',\n    ');
    }

    columnBuilder(column)
    {
        let builderName = TypeMapper.mapDbTypeToDrizzleBuilder(column.type);
        let builder = 'DrizzleMysqlCore.'+builderName+'('+this.builderArguments(builderName, column)+')';
        if('PRI' === column.key){
            return builder+'.primaryKey()';
        }
        return builder;
    }

    builderArguments(builderName, column)
    {
        let builderArguments = '\''+column.name+'\'';
        if('mysqlEnum' === builderName){
            return builderArguments+', [\''+this.parseEnumValues(column.columnType).join('\', \'')+'\']';
        }
        if('varchar' === builderName || 'char' === builderName || 'varbinary' === builderName){
            return builderArguments+', {length: '+column.length+'}';
        }
        if('bigint' === builderName){
            return builderArguments+', {mode: \'number\'}';
        }
        return builderArguments;
    }

}

module.exports.DrizzleModelsGeneration = DrizzleModelsGeneration;
