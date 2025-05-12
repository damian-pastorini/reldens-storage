/**
 *
 * Reldens - TypeMapper
 *
 */

class TypeMapper
{

    mapDbTypeToJsType(dbType)
    {
        let typeMap = {
            'int': 'number',
            'integer': 'number',
            'tinyint': 'number',
            'smallint': 'number',
            'mediumint': 'number',
            'bigint': 'number',
            'decimal': 'number',
            'float': 'number',
            'double': 'number',
            'varchar': 'string',
            'char': 'string',
            'text': 'string',
            'tinytext': 'string',
            'mediumtext': 'string',
            'longtext': 'string',
            'date': 'Date',
            'datetime': 'Date',
            'timestamp': 'Date',
            'time': 'string',
            'year': 'number',
            'boolean': 'boolean',
            'bool': 'boolean',
            'bit': 'boolean',
            'json': 'object',
            'binary': 'Buffer',
            'varbinary': 'Buffer',
            'blob': 'Buffer',
            'tinyblob': 'Buffer',
            'mediumblob': 'Buffer',
            'longblob': 'Buffer'
        };
        return typeMap[dbType.toLowerCase()];
    }

}

module.exports.TypeMapper = new TypeMapper();
