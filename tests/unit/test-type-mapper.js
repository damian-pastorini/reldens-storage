/**
 *
 * Reldens - TypeMapper Test
 *
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { TypeMapper } = require('../../lib/type-mapper');

describe('TypeMapper', () => {
    describe('mapDbTypeToJsType', () => {
        describe('numeric types', () => {
            it('should map int types to number', () => {
                assert.strictEqual(TypeMapper.mapDbTypeToJsType('int'), 'number');
                assert.strictEqual(TypeMapper.mapDbTypeToJsType('integer'), 'number');
                assert.strictEqual(TypeMapper.mapDbTypeToJsType('tinyint'), 'number');
                assert.strictEqual(TypeMapper.mapDbTypeToJsType('smallint'), 'number');
                assert.strictEqual(TypeMapper.mapDbTypeToJsType('mediumint'), 'number');
                assert.strictEqual(TypeMapper.mapDbTypeToJsType('bigint'), 'number');
            });
            it('should map decimal types to number', () => {
                assert.strictEqual(TypeMapper.mapDbTypeToJsType('decimal'), 'number');
                assert.strictEqual(TypeMapper.mapDbTypeToJsType('float'), 'number');
                assert.strictEqual(TypeMapper.mapDbTypeToJsType('double'), 'number');
            });
            it('should map year to number', () => {
                assert.strictEqual(TypeMapper.mapDbTypeToJsType('year'), 'number');
            });
        });
        describe('string types', () => {
            it('should map varchar and char to string', () => {
                assert.strictEqual(TypeMapper.mapDbTypeToJsType('varchar'), 'string');
                assert.strictEqual(TypeMapper.mapDbTypeToJsType('char'), 'string');
            });
            it('should map text types to string', () => {
                assert.strictEqual(TypeMapper.mapDbTypeToJsType('text'), 'string');
                assert.strictEqual(TypeMapper.mapDbTypeToJsType('tinytext'), 'string');
                assert.strictEqual(TypeMapper.mapDbTypeToJsType('mediumtext'), 'string');
                assert.strictEqual(TypeMapper.mapDbTypeToJsType('longtext'), 'string');
            });
            it('should map time to string', () => {
                assert.strictEqual(TypeMapper.mapDbTypeToJsType('time'), 'string');
            });
        });
        describe('date types', () => {
            it('should map date types to Date', () => {
                assert.strictEqual(TypeMapper.mapDbTypeToJsType('date'), 'Date');
                assert.strictEqual(TypeMapper.mapDbTypeToJsType('datetime'), 'Date');
                assert.strictEqual(TypeMapper.mapDbTypeToJsType('timestamp'), 'Date');
            });
        });
        describe('boolean types', () => {
            it('should map boolean types to boolean', () => {
                assert.strictEqual(TypeMapper.mapDbTypeToJsType('boolean'), 'boolean');
                assert.strictEqual(TypeMapper.mapDbTypeToJsType('bool'), 'boolean');
                assert.strictEqual(TypeMapper.mapDbTypeToJsType('bit'), 'boolean');
            });
        });
        describe('json type', () => {
            it('should map json to object', () => {
                assert.strictEqual(TypeMapper.mapDbTypeToJsType('json'), 'object');
            });
        });
        describe('binary types', () => {
            it('should map binary types to Buffer', () => {
                assert.strictEqual(TypeMapper.mapDbTypeToJsType('binary'), 'Buffer');
                assert.strictEqual(TypeMapper.mapDbTypeToJsType('varbinary'), 'Buffer');
                assert.strictEqual(TypeMapper.mapDbTypeToJsType('blob'), 'Buffer');
                assert.strictEqual(TypeMapper.mapDbTypeToJsType('tinyblob'), 'Buffer');
                assert.strictEqual(TypeMapper.mapDbTypeToJsType('mediumblob'), 'Buffer');
                assert.strictEqual(TypeMapper.mapDbTypeToJsType('longblob'), 'Buffer');
            });
        });
        describe('case insensitive', () => {
            it('should handle uppercase type names', () => {
                assert.strictEqual(TypeMapper.mapDbTypeToJsType('INT'), 'number');
                assert.strictEqual(TypeMapper.mapDbTypeToJsType('VARCHAR'), 'string');
                assert.strictEqual(TypeMapper.mapDbTypeToJsType('DATETIME'), 'Date');
            });
        });
    });
    describe('mapDbTypeToPrismaType', () => {
        describe('numeric types', () => {
            it('should map int types to Int', () => {
                assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('int'), 'Int');
                assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('integer'), 'Int');
                assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('tinyint'), 'Int');
                assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('smallint'), 'Int');
                assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('mediumint'), 'Int');
                assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('year'), 'Int');
            });
            it('should map bigint to BigInt', () => {
                assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('bigint'), 'BigInt');
            });
            it('should map decimal to Decimal', () => {
                assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('decimal'), 'Decimal');
            });
            it('should map float types to Float', () => {
                assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('float'), 'Float');
                assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('double'), 'Float');
            });
        });
        describe('string types', () => {
            it('should map varchar and char to String', () => {
                assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('varchar'), 'String');
                assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('char'), 'String');
            });
            it('should map text types to String', () => {
                assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('text'), 'String');
                assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('tinytext'), 'String');
                assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('mediumtext'), 'String');
                assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('longtext'), 'String');
            });
            it('should map time to String', () => {
                assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('time'), 'String');
            });
        });
        describe('date types', () => {
            it('should map date types to DateTime', () => {
                assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('date'), 'DateTime');
                assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('datetime'), 'DateTime');
                assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('timestamp'), 'DateTime');
            });
        });
        describe('boolean types', () => {
            it('should map boolean types to Boolean', () => {
                assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('boolean'), 'Boolean');
                assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('bool'), 'Boolean');
                assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('bit'), 'Boolean');
            });
        });
        describe('json type', () => {
            it('should map json to Json', () => {
                assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('json'), 'Json');
            });
        });
        describe('binary types', () => {
            it('should map binary types to Bytes', () => {
                assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('binary'), 'Bytes');
                assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('varbinary'), 'Bytes');
                assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('blob'), 'Bytes');
                assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('tinyblob'), 'Bytes');
                assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('mediumblob'), 'Bytes');
                assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('longblob'), 'Bytes');
            });
        });
        describe('unknown types', () => {
            it('should default to String for unknown types', () => {
                assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('unknowntype'), 'String');
                assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('customtype'), 'String');
            });
        });
        describe('case insensitive', () => {
            it('should handle uppercase type names', () => {
                assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('INT'), 'Int');
                assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('VARCHAR'), 'String');
                assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('DATETIME'), 'DateTime');
            });
        });
    });
});
