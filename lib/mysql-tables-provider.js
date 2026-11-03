/**
 *
 * Reldens - MySQLTablesProvider
 *
 */

const { Logger, sc } = require('@reldens/utils');

class MySQLTablesProvider
{

    static async fetchTables(server)
    {
        let tablesQuery = 'SELECT ' +
            '    TABLE_NAME, ' +
            '    COLUMN_NAME, ' +
            '    DATA_TYPE, ' +
            '    CAST(CHARACTER_MAXIMUM_LENGTH AS CHAR) as CHARACTER_MAXIMUM_LENGTH, ' +
            '    COLUMN_TYPE, ' +
            '    IS_NULLABLE, ' +
            '    COLUMN_KEY, ' +
            '    EXTRA, ' +
            '    COLUMN_DEFAULT ' +
            'FROM ' +
            '    information_schema.COLUMNS ' +
            'WHERE ' +
            '    TABLE_SCHEMA = \'' + server.config.database + '\' ' +
            'ORDER BY ' +
            '    TABLE_NAME, ORDINAL_POSITION;';
        try {
            let result = await server.rawQuery(tablesQuery);
            if(!sc.isArray(result) || 0 === result.length){
                Logger.critical('No tables found in the database.');
                return false;
            }
            let tables = {};
            for(let row of result){
                if(!tables[row.TABLE_NAME]){
                    tables[row.TABLE_NAME] = {
                        name: row.TABLE_NAME,
                        columns: {}
                    };
                }
                tables[row.TABLE_NAME].columns[row.COLUMN_NAME] = {
                    name: row.COLUMN_NAME,
                    type: row.DATA_TYPE,
                    columnType: row.COLUMN_TYPE,
                    length: row.CHARACTER_MAXIMUM_LENGTH,
                    nullable: 'YES' === row.IS_NULLABLE,
                    key: row.COLUMN_KEY,
                    extra: row.EXTRA,
                    default: row.COLUMN_DEFAULT
                };
            }
            let foreignKeysQuery = 'SELECT ' +
                '    keyColumnUsage.TABLE_NAME, ' +
                '    keyColumnUsage.COLUMN_NAME, ' +
                '    keyColumnUsage.REFERENCED_TABLE_NAME, ' +
                '    keyColumnUsage.REFERENCED_COLUMN_NAME, ' +
                '    referentialConstraints.DELETE_RULE ' +
                'FROM ' +
                '    information_schema.KEY_COLUMN_USAGE keyColumnUsage ' +
                '    LEFT JOIN information_schema.REFERENTIAL_CONSTRAINTS referentialConstraints ' +
                '        ON referentialConstraints.CONSTRAINT_SCHEMA = keyColumnUsage.CONSTRAINT_SCHEMA ' +
                '        AND referentialConstraints.CONSTRAINT_NAME = keyColumnUsage.CONSTRAINT_NAME ' +
                'WHERE ' +
                '    keyColumnUsage.TABLE_SCHEMA = \'' + server.config.database + '\' ' +
                '    AND keyColumnUsage.REFERENCED_TABLE_NAME IS NOT NULL;';
            let foreignKeysResult = await server.rawQuery(foreignKeysQuery);
            if(!sc.isArray(foreignKeysResult) || 0 === foreignKeysResult.length){
                return tables;
            }
            for(let row of foreignKeysResult){
                if(tables[row.TABLE_NAME] && tables[row.TABLE_NAME].columns[row.COLUMN_NAME]){
                    tables[row.TABLE_NAME].columns[row.COLUMN_NAME].referencedTable = row.REFERENCED_TABLE_NAME;
                    tables[row.TABLE_NAME].columns[row.COLUMN_NAME].referencedColumn = row.REFERENCED_COLUMN_NAME;
                    tables[row.TABLE_NAME].columns[row.COLUMN_NAME].referencedDeleteRule = row.DELETE_RULE;
                }
            }
            return tables;
        } catch(error) {
            Logger.critical('Failed to fetch tables from database: '+error.message);
        }
        return false;
    }

}

module.exports.MySQLTablesProvider = MySQLTablesProvider;
