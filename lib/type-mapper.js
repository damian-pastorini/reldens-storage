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

    mapDbTypeToPrismaType(dbType)
    {
        let typeMap = {
            'int': 'Int',
            'integer': 'Int',
            'tinyint': 'Int',
            'smallint': 'Int',
            'mediumint': 'Int',
            'bigint': 'BigInt',
            'decimal': 'Decimal',
            'float': 'Float',
            'double': 'Float',
            'varchar': 'String',
            'char': 'String',
            'text': 'String',
            'tinytext': 'String',
            'mediumtext': 'String',
            'longtext': 'String',
            'date': 'DateTime',
            'datetime': 'DateTime',
            'timestamp': 'DateTime',
            'time': 'String',
            'year': 'Int',
            'boolean': 'Boolean',
            'bool': 'Boolean',
            'bit': 'Boolean',
            'json': 'Json',
            'binary': 'Bytes',
            'varbinary': 'Bytes',
            'blob': 'Bytes',
            'tinyblob': 'Bytes',
            'mediumblob': 'Bytes',
            'longblob': 'Bytes'
        };
        return typeMap[dbType.toLowerCase()] || 'String';
    }

}

module.exports.TypeMapper = new TypeMapper();
