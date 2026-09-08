/**
 *
 * Reldens - ModelsGeneration Test
 *
 */

const { TestRunner, assert } = require('../utils/test-runner');
const { ModelsGeneration } = require('../../lib/generators/models-generation');

class ModelsGenerationTest
{

    constructor()
    {
        this.runner = new TestRunner();
    }

    createColumn(props)
    {
        return Object.assign(
            {
                name: 'test_column',
                type: 'int',
                columnType: 'int(10) unsigned',
                length: null,
                nullable: false,
                key: '',
                extra: '',
                default: null
            },
            props
        );
    }

    createForeignKeyColumn(name, key)
    {
        return this.createColumn({
            name,
            key,
            referencedTable: 'test_products',
            referencedColumn: 'id',
            referencedDeleteRule: 'CASCADE'
        });
    }

    createTables()
    {
        return {
            test_products: {
                name: 'test_products',
                columns: {
                    id: this.createColumn({name: 'id', key: 'PRI', extra: 'auto_increment'}),
                    name: this.createColumn({name: 'name', type: 'varchar', columnType: 'varchar(200)', length: '200'})
                }
            },
            test_product_details: {
                name: 'test_product_details',
                columns: {
                    id: this.createColumn({name: 'id', key: 'PRI', extra: 'auto_increment'}),
                    product_id: this.createForeignKeyColumn('product_id', 'UNI')
                }
            },
            test_reviews: {
                name: 'test_reviews',
                columns: {
                    id: this.createColumn({name: 'id', key: 'PRI', extra: 'auto_increment'}),
                    product_id: this.createForeignKeyColumn('product_id', 'MUL')
                }
            }
        };
    }

    createGeneration()
    {
        let generation = new ModelsGeneration({});
        generation.setAllTablesData(this.createTables());
        return generation;
    }

    mikroOrmDefinition(generation, tableName)
    {
        let tableData = generation.allTablesData[tableName];
        return generation.getEntityPropertiesDefinition(tableData.columns, 'mikro-orm', tableName, tableData);
    }

    async run()
    {
        this.runner.suite('ModelsGeneration');
        await this.testDetermineMikroOrmForwardKind();
        await this.testMikroOrmOneToOneDefinitions();
        await this.testObjectionJsRelationTypes();
        return this.runner.getResults();
    }

    async testDetermineMikroOrmForwardKind()
    {
        this.runner.group('determineMikroOrmForwardKind');
        let generation = this.createGeneration();
        await this.runner.test('should return 1:1 for a unique foreign key column', async () => {
            let kind = generation.determineMikroOrmForwardKind(this.createColumn({key: 'UNI'}));
            assert.strictEqual(kind, '1:1');
        });
        await this.runner.test('should return 1:1 for a primary foreign key column', async () => {
            let kind = generation.determineMikroOrmForwardKind(this.createColumn({key: 'PRI'}));
            assert.strictEqual(kind, '1:1');
        });
        await this.runner.test('should return m:1 for an indexed foreign key column', async () => {
            let kind = generation.determineMikroOrmForwardKind(this.createColumn({key: 'MUL'}));
            assert.strictEqual(kind, 'm:1');
        });
        await this.runner.test('should return m:1 for a non indexed foreign key column', async () => {
            let kind = generation.determineMikroOrmForwardKind(this.createColumn({key: ''}));
            assert.strictEqual(kind, 'm:1');
        });
    }

    async testMikroOrmOneToOneDefinitions()
    {
        this.runner.group('getEntityPropertiesDefinition - mikro-orm one to one');
        let generation = this.createGeneration();
        await this.runner.test('should emit a 1:1 owning side with joinColumns for a unique foreign key', async () => {
            let definition = this.mikroOrmDefinition(generation, 'test_product_details');
            assert.ok(definition.includes('related_test_products: {\n            kind: \'1:1\','));
            assert.ok(definition.includes('joinColumns: [\'product_id\']'));
            assert.ok(!definition.includes('mappedBy'));
        });
        await this.runner.test('should emit a 1:1 inverse side with mappedBy for a unique foreign key', async () => {
            let definition = this.mikroOrmDefinition(generation, 'test_products');
            assert.ok(definition.includes('related_test_product_details: {\n            kind: \'1:1\','));
            assert.ok(definition.includes('mappedBy: \'related_test_products\''));
        });
        await this.runner.test('should emit a 1:m inverse side for a non unique foreign key', async () => {
            let definition = this.mikroOrmDefinition(generation, 'test_products');
            assert.ok(definition.includes('related_test_reviews: {\n            kind: \'1:m\','));
        });
        await this.runner.test('should emit a m:1 owning side for a non unique foreign key', async () => {
            let definition = this.mikroOrmDefinition(generation, 'test_reviews');
            assert.ok(definition.includes('related_test_products: {\n            kind: \'m:1\','));
            assert.ok(definition.includes('joinColumns: [\'product_id\']'));
        });
    }

    async testObjectionJsRelationTypes()
    {
        this.runner.group('ObjectionJS relation types for unique foreign keys');
        let generation = this.createGeneration();
        let tables = generation.allTablesData;
        await this.runner.test('should keep BelongsToOneRelation on the owning side', async () => {
            let relations = generation.detectObjectionJsRelations('test_product_details', tables.test_product_details);
            assert.strictEqual(relations.related_test_products.relationType, 'BelongsToOneRelation');
        });
        await this.runner.test('should use HasOneRelation on the referenced side of a unique foreign key', async () => {
            let reverseRelations = generation.detectReverseObjectionJsRelations('test_products');
            assert.strictEqual(reverseRelations.related_test_product_details.relationType, 'HasOneRelation');
        });
        await this.runner.test('should use HasManyRelation on the referenced side of a non unique foreign key', async () => {
            let reverseRelations = generation.detectReverseObjectionJsRelations('test_products');
            assert.strictEqual(reverseRelations.related_test_reviews.relationType, 'HasManyRelation');
        });
    }

}

module.exports = ModelsGenerationTest;
