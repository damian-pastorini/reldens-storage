/**
 *
 * Reldens - TypeMapper Test
 *
 */

const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const { TypeMapper } = require('../../lib/type-mapper');

class TypeMapperTest
{

    run()
    {
        let counter = 0;
        let errors = 0;
        return new Promise((resolve) => {
            describe('TypeMapper', () => {
            describe('mapDbTypeToJsType', () => {
                describe('numeric types', () => {
                    it('should map int types to number', () => {
                        try {
                            assert.strictEqual(TypeMapper.mapDbTypeToJsType('int'), 'number');
                            assert.strictEqual(TypeMapper.mapDbTypeToJsType('integer'), 'number');
                            assert.strictEqual(TypeMapper.mapDbTypeToJsType('tinyint'), 'number');
                            assert.strictEqual(TypeMapper.mapDbTypeToJsType('smallint'), 'number');
                            assert.strictEqual(TypeMapper.mapDbTypeToJsType('mediumint'), 'number');
                            assert.strictEqual(TypeMapper.mapDbTypeToJsType('bigint'), 'number');
                            counter++;
                        } catch(error) {
                            errors++;
                            throw error;
                        }
                    });
                    it('should map decimal types to number', () => {
                        try {
                            assert.strictEqual(TypeMapper.mapDbTypeToJsType('decimal'), 'number');
                            assert.strictEqual(TypeMapper.mapDbTypeToJsType('float'), 'number');
                            assert.strictEqual(TypeMapper.mapDbTypeToJsType('double'), 'number');
                            counter++;
                        } catch(error) {
                            errors++;
                            throw error;
                        }
                    });
                    it('should map year to number', () => {
                        try {
                            assert.strictEqual(TypeMapper.mapDbTypeToJsType('year'), 'number');
                            counter++;
                        } catch(error) {
                            errors++;
                            throw error;
                        }
                    });
                });
                describe('string types', () => {
                    it('should map varchar and char to string', () => {
                        try {
                            assert.strictEqual(TypeMapper.mapDbTypeToJsType('varchar'), 'string');
                            assert.strictEqual(TypeMapper.mapDbTypeToJsType('char'), 'string');
                            counter++;
                        } catch(error) {
                            errors++;
                            throw error;
                        }
                    });
                    it('should map text types to string', () => {
                        try {
                            assert.strictEqual(TypeMapper.mapDbTypeToJsType('text'), 'string');
                            assert.strictEqual(TypeMapper.mapDbTypeToJsType('tinytext'), 'string');
                            assert.strictEqual(TypeMapper.mapDbTypeToJsType('mediumtext'), 'string');
                            assert.strictEqual(TypeMapper.mapDbTypeToJsType('longtext'), 'string');
                            counter++;
                        } catch(error) {
                            errors++;
                            throw error;
                        }
                    });
                    it('should map time to string', () => {
                        try {
                            assert.strictEqual(TypeMapper.mapDbTypeToJsType('time'), 'string');
                            counter++;
                        } catch(error) {
                            errors++;
                            throw error;
                        }
                    });
                });
                describe('date types', () => {
                    it('should map date types to Date', () => {
                        try {
                            assert.strictEqual(TypeMapper.mapDbTypeToJsType('date'), 'Date');
                            assert.strictEqual(TypeMapper.mapDbTypeToJsType('datetime'), 'Date');
                            assert.strictEqual(TypeMapper.mapDbTypeToJsType('timestamp'), 'Date');
                            counter++;
                        } catch(error) {
                            errors++;
                            throw error;
                        }
                    });
                });
                describe('boolean types', () => {
                    it('should map boolean types to boolean', () => {
                        try {
                            assert.strictEqual(TypeMapper.mapDbTypeToJsType('boolean'), 'boolean');
                            assert.strictEqual(TypeMapper.mapDbTypeToJsType('bool'), 'boolean');
                            assert.strictEqual(TypeMapper.mapDbTypeToJsType('bit'), 'boolean');
                            counter++;
                        } catch(error) {
                            errors++;
                            throw error;
                        }
                    });
                });
                describe('json type', () => {
                    it('should map json to object', () => {
                        try {
                            assert.strictEqual(TypeMapper.mapDbTypeToJsType('json'), 'object');
                            counter++;
                        } catch(error) {
                            errors++;
                            throw error;
                        }
                    });
                });
                describe('binary types', () => {
                    it('should map binary types to Buffer', () => {
                        try {
                            assert.strictEqual(TypeMapper.mapDbTypeToJsType('binary'), 'Buffer');
                            assert.strictEqual(TypeMapper.mapDbTypeToJsType('varbinary'), 'Buffer');
                            assert.strictEqual(TypeMapper.mapDbTypeToJsType('blob'), 'Buffer');
                            assert.strictEqual(TypeMapper.mapDbTypeToJsType('tinyblob'), 'Buffer');
                            assert.strictEqual(TypeMapper.mapDbTypeToJsType('mediumblob'), 'Buffer');
                            assert.strictEqual(TypeMapper.mapDbTypeToJsType('longblob'), 'Buffer');
                            counter++;
                        } catch(error) {
                            errors++;
                            throw error;
                        }
                    });
                });
                describe('case insensitive', () => {
                    it('should handle uppercase type names', () => {
                        try {
                            assert.strictEqual(TypeMapper.mapDbTypeToJsType('INT'), 'number');
                            assert.strictEqual(TypeMapper.mapDbTypeToJsType('VARCHAR'), 'string');
                            assert.strictEqual(TypeMapper.mapDbTypeToJsType('DATETIME'), 'Date');
                            counter++;
                        } catch(error) {
                            errors++;
                            throw error;
                        }
                    });
                });
            });
            describe('mapDbTypeToPrismaType', () => {
                describe('numeric types', () => {
                    it('should map int types to Int', () => {
                        try {
                            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('int'), 'Int');
                            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('integer'), 'Int');
                            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('tinyint'), 'Int');
                            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('smallint'), 'Int');
                            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('mediumint'), 'Int');
                            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('year'), 'Int');
                            counter++;
                        } catch(error) {
                            errors++;
                            throw error;
                        }
                    });
                    it('should map bigint to BigInt', () => {
                        try {
                            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('bigint'), 'BigInt');
                            counter++;
                        } catch(error) {
                            errors++;
                            throw error;
                        }
                    });
                    it('should map decimal to Decimal', () => {
                        try {
                            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('decimal'), 'Decimal');
                            counter++;
                        } catch(error) {
                            errors++;
                            throw error;
                        }
                    });
                    it('should map float types to Float', () => {
                        try {
                            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('float'), 'Float');
                            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('double'), 'Float');
                            counter++;
                        } catch(error) {
                            errors++;
                            throw error;
                        }
                    });
                });
                describe('string types', () => {
                    it('should map varchar and char to String', () => {
                        try {
                            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('varchar'), 'String');
                            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('char'), 'String');
                            counter++;
                        } catch(error) {
                            errors++;
                            throw error;
                        }
                    });
                    it('should map text types to String', () => {
                        try {
                            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('text'), 'String');
                            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('tinytext'), 'String');
                            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('mediumtext'), 'String');
                            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('longtext'), 'String');
                            counter++;
                        } catch(error) {
                            errors++;
                            throw error;
                        }
                    });
                    it('should map time to String', () => {
                        try {
                            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('time'), 'String');
                            counter++;
                        } catch(error) {
                            errors++;
                            throw error;
                        }
                    });
                });
                describe('date types', () => {
                    it('should map date types to DateTime', () => {
                        try {
                            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('date'), 'DateTime');
                            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('datetime'), 'DateTime');
                            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('timestamp'), 'DateTime');
                            counter++;
                        } catch(error) {
                            errors++;
                            throw error;
                        }
                    });
                });
                describe('boolean types', () => {
                    it('should map boolean types to Boolean', () => {
                        try {
                            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('boolean'), 'Boolean');
                            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('bool'), 'Boolean');
                            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('bit'), 'Boolean');
                            counter++;
                        } catch(error) {
                            errors++;
                            throw error;
                        }
                    });
                });
                describe('json type', () => {
                    it('should map json to Json', () => {
                        try {
                            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('json'), 'Json');
                            counter++;
                        } catch(error) {
                            errors++;
                            throw error;
                        }
                    });
                });
                describe('binary types', () => {
                    it('should map binary types to Bytes', () => {
                        try {
                            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('binary'), 'Bytes');
                            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('varbinary'), 'Bytes');
                            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('blob'), 'Bytes');
                            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('tinyblob'), 'Bytes');
                            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('mediumblob'), 'Bytes');
                            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('longblob'), 'Bytes');
                            counter++;
                        } catch(error) {
                            errors++;
                            throw error;
                        }
                    });
                });
                describe('unknown types', () => {
                    it('should default to String for unknown types', () => {
                        try {
                            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('unknowntype'), 'String');
                            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('customtype'), 'String');
                            counter++;
                        } catch(error) {
                            errors++;
                            throw error;
                        }
                    });
                });
                describe('case insensitive', () => {
                    it('should handle uppercase type names', () => {
                        try {
                            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('INT'), 'Int');
                            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('VARCHAR'), 'String');
                            assert.strictEqual(TypeMapper.mapDbTypeToPrismaType('DATETIME'), 'DateTime');
                            counter++;
                        } catch(error) {
                            errors++;
                            throw error;
                        }
                    });
                });
            });
            after(() => {
                resolve({counter, errors});
            });
        });
        });
    }

}

module.exports = TypeMapperTest;
