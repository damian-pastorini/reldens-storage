/**
 *
 * Reldens - TypeMapper Test
 *
 */

const { TestRunner, assert } = require('../utils/test-runner');
const { TypeMapper } = require('../../lib/type-mapper');

class TypeMapperTest
{

    constructor()
    {
        this.runner = new TestRunner();
    }

    async run()
    {
        this.runner.suite('TypeMapper');
        await this.testMapDbTypeToJsTypeNumeric();
        await this.testMapDbTypeToJsTypeString();
        await this.testMapDbTypeToJsTypeDate();
        await this.testMapDbTypeToJsTypeBoolean();
        await this.testMapDbTypeToJsTypeJson();
        await this.testMapDbTypeToJsTypeBinary();
        await this.testMapDbTypeToJsTypeCaseInsensitive();
        await this.testMapDbTypeToPrismaTypeNumeric();
        await this.testMapDbTypeToPrismaTypeString();
        await this.testMapDbTypeToPrismaTypeDate();
        await this.testMapDbTypeToPrismaTypeBoolean();
        await this.testMapDbTypeToPrismaTypeJson();
        await this.testMapDbTypeToPrismaTypeBinary();
        await this.testMapDbTypeToPrismaTypeUnknown();
        await this.testMapDbTypeToPrismaTypeCaseInsensitive();
        return this.runner.getResults();
    }

    async testMapDbTypeToJsTypeNumeric()
    {
        this.runner.group('mapDbTypeToJsType - numeric types');
        await this.runner.test('should map int types to number', async () => {
            assert.strictEqual(TypeMapper.mapDbTypeToJsType('int'), 'number');
            assert.strictEqual(TypeMapper.mapDbTypeToJsType('integer'), 'number');
            assert.strictEqual(TypeMapper.mapDbTypeToJsType('tinyint'), 'number');
            assert.strictEqual(TypeMapper.mapDbTypeToJsType('smallint'), 'number');
            assert.strictEqual(TypeMapper.mapDbTypeToJsType('mediumint'), 'number');
            assert.strictEqual(TypeMapper.mapDbTypeToJsType('bigint'), 'number');
        });
        await this.runner.test('should map decimal types to number', async () => {
            assert.strictEqual(TypeMapper.mapDbTypeToJsType('decimal'), 'number');
            assert.strictEqual(TypeMapper.mapDbTypeToJsType('float'), 'number');
            assert.strictEqual(TypeMapper.mapDbTypeToJsType('double'), 'number');
        });
        await this.runner.test('should map year to number', async () => {
            assert.strictEqual(TypeMapper.mapDbTypeToJsType('year'), 'number');
        });
    }

    async testMapDbTypeToJsTypeString()
    {
        this.runner.group('mapDbTypeToJsType - string types');
        await this.runner.test('should map varchar and char to string', async () => {
            assert.strictEqual(TypeMapper.mapDbTypeToJsType('varchar'), 'string');
            assert.strictEqual(TypeMapper.mapDbTypeToJsType('char'), 'string');
        });
        await this.runner.test('should map text types to string', async () => {
            assert.strictEqual(TypeMapper.mapDbTypeToJsType('text'), 'string');
            assert.strictEqual(TypeMapper.mapDbTypeToJsType('tinytext'), 'string');
            assert.strictEqual(TypeMapper.mapDbTypeToJsType('mediumtext'), 'string');
            assert.strictEqual(TypeMapper.mapDbTypeToJsType('longtext'), 'string');
        });
        await this.runner.test('should map time to string', async () => {
            assert.strictEqual(TypeMapper.mapDbTypeToJsType('time'), 'string');
        });
    }

    async testMapDbTypeToJsTypeDate()
    {
        this.runner.group('mapDbTypeToJsType - date types');
        await this.runner.test('should map date types to Date', async () => {
            assert.strictEqual(TypeMapper.mapDbTypeToJsType('date'), 'Date');
            assert.strictEqual(TypeMapper.mapDbTypeToJsType('datetime'), 'Date');
            assert.strictEqual(TypeMapper.mapDbTypeToJsType('timestamp'), 'Date');
        });
    }

    async testMapDbTypeToJsTypeBoolean()
    {
        this.runner.group('mapDbTypeToJsType - boolean types');
        await this.runner.test('should map boolean types to boolean', async () => {
            assert.strictEqual(TypeMapper.mapDbTypeToJsType('boolean'), 'boolean');
            assert.strictEqual(TypeMapper.mapDbTypeToJsType('bool'), 'boolean');
            assert.strictEqual(TypeMapper.mapDbTypeToJsType('bit'), 'boolean');
        });
    }

    async testMapDbTypeToJsTypeJson()
    {
        this.runner.group('mapDbTypeToJsType - json type');
        await this.runner.test('should map json to object', async () => {
            assert.strictEqual(TypeMapper.mapDbTypeToJsType('json'), 'object');
        });
    }

    async testMapDbTypeToJsTypeBinary()
    {
        this.runner.group('mapDbTypeToJsType - binary types');
        await this.runner.test('should map binary types to Buffer', async () => {
            assert.strictEqual(TypeMapper.mapDbTypeToJsType('binary'), 'Buffer');
            assert.strictEqual(TypeMapper.mapDbTypeToJsType('varbinary'), 'Buffer');
            assert.strictEqual(TypeMapper.mapDbTypeToJsType('blob'), 'Buffer');
            assert.strictEqual(TypeMapper.mapDbTypeToJsType('tinyblob'), 'Buffer');
            assert.strictEqual(TypeMapper.mapDbTypeToJsType('mediumblob'), 'Buffer');
            assert.strictEqual(TypeMapper.mapDbTypeToJsType('longblob'), 'Buffer');
        });
    }

    async testMapDbTypeToJsTypeCaseInsensitive()
    {
        this.runner.group('mapDbTypeToJsType - case insensitive');
        await this.runner.test('should handle uppercase type names', async () => {
            assert.strictEqual(TypeMapper.mapDbTypeToJsType('INT'), 'number');
            assert.strictEqual(TypeMapper.mapDbTypeToJsType('VARCHAR'), 'string');
            assert.strictEqual(TypeMapper.mapDbTypeToJsType('DATETIME'), 'Date');
        });
    }

    async testMapDbTypeToPrismaTypeNumeric()
    {
        this.runner.group('mapDbTypeToPrismaType - numeric types');
        await this.runner.test('should map int types to Int', async () => {
            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('int'), 'Int');
            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('integer'), 'Int');
            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('tinyint'), 'Int');
            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('smallint'), 'Int');
            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('mediumint'), 'Int');
            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('year'), 'Int');
        });
        await this.runner.test('should map bigint to BigInt', async () => {
            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('bigint'), 'BigInt');
        });
        await this.runner.test('should map decimal to Decimal', async () => {
            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('decimal'), 'Decimal');
        });
        await this.runner.test('should map float types to Float', async () => {
            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('float'), 'Float');
            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('double'), 'Float');
        });
    }

    async testMapDbTypeToPrismaTypeString()
    {
        this.runner.group('mapDbTypeToPrismaType - string types');
        await this.runner.test('should map varchar and char to String', async () => {
            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('varchar'), 'String');
            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('char'), 'String');
        });
        await this.runner.test('should map text types to String', async () => {
            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('text'), 'String');
            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('tinytext'), 'String');
            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('mediumtext'), 'String');
            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('longtext'), 'String');
        });
        await this.runner.test('should map time to String', async () => {
            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('time'), 'String');
        });
    }

    async testMapDbTypeToPrismaTypeDate()
    {
        this.runner.group('mapDbTypeToPrismaType - date types');
        await this.runner.test('should map date types to DateTime', async () => {
            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('date'), 'DateTime');
            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('datetime'), 'DateTime');
            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('timestamp'), 'DateTime');
        });
    }

    async testMapDbTypeToPrismaTypeBoolean()
    {
        this.runner.group('mapDbTypeToPrismaType - boolean types');
        await this.runner.test('should map boolean types to Boolean', async () => {
            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('boolean'), 'Boolean');
            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('bool'), 'Boolean');
            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('bit'), 'Boolean');
        });
    }

    async testMapDbTypeToPrismaTypeJson()
    {
        this.runner.group('mapDbTypeToPrismaType - json type');
        await this.runner.test('should map json to Json', async () => {
            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('json'), 'Json');
        });
    }

    async testMapDbTypeToPrismaTypeBinary()
    {
        this.runner.group('mapDbTypeToPrismaType - binary types');
        await this.runner.test('should map binary types to Bytes', async () => {
            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('binary'), 'Bytes');
            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('varbinary'), 'Bytes');
            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('blob'), 'Bytes');
            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('tinyblob'), 'Bytes');
            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('mediumblob'), 'Bytes');
            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('longblob'), 'Bytes');
        });
    }

    async testMapDbTypeToPrismaTypeUnknown()
    {
        this.runner.group('mapDbTypeToPrismaType - unknown types');
        await this.runner.test('should default to String for unknown types', async () => {
            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('unknowntype'), 'String');
            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('customtype'), 'String');
        });
    }

    async testMapDbTypeToPrismaTypeCaseInsensitive()
    {
        this.runner.group('mapDbTypeToPrismaType - case insensitive');
        await this.runner.test('should handle uppercase type names', async () => {
            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('INT'), 'Int');
            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('VARCHAR'), 'String');
            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('DATETIME'), 'DateTime');
        });
    }

}

module.exports = TypeMapperTest;
