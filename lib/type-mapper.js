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

    mapDbTypeToDrizzleBuilder(dbType)
    {
        let typeMap = {
            'int': 'int',
            'integer': 'int',
            'tinyint': 'tinyint',
            'smallint': 'smallint',
            'mediumint': 'mediumint',
            'bigint': 'bigint',
            'decimal': 'decimal',
            'float': 'float',
            'double': 'double',
            'varchar': 'varchar',
            'char': 'char',
            'text': 'text',
            'tinytext': 'text',
            'mediumtext': 'text',
            'longtext': 'text',
            'date': 'date',
            'datetime': 'datetime',
            'timestamp': 'timestamp',
            'time': 'time',
            'year': 'year',
            'boolean': 'boolean',
            'bool': 'boolean',
            'bit': 'binary',
            'json': 'json',
            'enum': 'mysqlEnum',
            'binary': 'binary',
            'varbinary': 'varbinary',
            'blob': 'binary',
            'tinyblob': 'binary',
            'mediumblob': 'binary',
            'longblob': 'binary'
        };
        return typeMap[dbType.toLowerCase()] || 'text';
    }

}

module.exports.TypeMapper = new TypeMapper();
