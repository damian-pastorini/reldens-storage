/**
 *
 * Reldens - EntitiesGeneration Test
 *
 */

const { TestRunner, assert } = require('../utils/test-runner');
const { EntitiesGeneration } = require('../../lib/generators/entities-generation');

class EntitiesGenerationTest
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
                type: 'varchar',
                columnType: 'varchar(100)',
                length: '100',
                nullable: true,
                key: '',
                extra: '',
                default: null
            },
            props
        );
    }

    async run()
    {
        this.runner.suite('EntitiesGeneration');
        await this.testAddUniqueAttribute();
        await this.testGetPropertyAttributesUnique();
        await this.testGeneratePropertiesConfigUnique();
        return this.runner.getResults();
    }

    async testAddUniqueAttribute()
    {
        this.runner.group('addUniqueAttribute');
        let generation = new EntitiesGeneration({});
        await this.runner.test('should push isUnique for a UNI column', async () => {
            let props = [];
            generation.addUniqueAttribute(props, this.createColumn({key: 'UNI'}));
            assert.deepStrictEqual(props, ['isUnique: true']);
        });
        await this.runner.test('should not push isUnique for a non indexed column', async () => {
            let props = [];
            generation.addUniqueAttribute(props, this.createColumn({key: ''}));
            assert.deepStrictEqual(props, []);
        });
        await this.runner.test('should not push isUnique for a MUL column', async () => {
            let props = [];
            generation.addUniqueAttribute(props, this.createColumn({key: 'MUL'}));
            assert.deepStrictEqual(props, []);
        });
        await this.runner.test('should not push isUnique for a PRI column', async () => {
            let props = [];
            generation.addUniqueAttribute(props, this.createColumn({key: 'PRI'}));
            assert.deepStrictEqual(props, []);
        });
    }

    async testGetPropertyAttributesUnique()
    {
        this.runner.group('getPropertyAttributes - isUnique');
        let generation = new EntitiesGeneration({});
        await this.runner.test('should include isUnique for a UNI column', async () => {
            let column = this.createColumn({name: 'slug', key: 'UNI'});
            let props = generation.getPropertyAttributes(column, 'slug', {});
            assert.ok(props.includes('isUnique: true'));
        });
        await this.runner.test('should not include isUnique for a non unique column', async () => {
            let column = this.createColumn({name: 'tags', key: ''});
            let props = generation.getPropertyAttributes(column, 'tags', {});
            assert.deepStrictEqual(props, ['dbType: \'varchar\'']);
        });
        await this.runner.test('should include both isRequired and isUnique for a required unique column', async () => {
            let column = this.createColumn({name: 'sku', key: 'UNI', nullable: false});
            let props = generation.getPropertyAttributes(column, 'sku', {});
            assert.deepStrictEqual(props, ['isRequired: true', 'isUnique: true', 'dbType: \'varchar\'']);
        });
        await this.runner.test('should include isUnique only for a nullable unique column', async () => {
            let column = this.createColumn({name: 'sku', key: 'UNI', nullable: true});
            let props = generation.getPropertyAttributes(column, 'sku', {});
            assert.deepStrictEqual(props, ['isUnique: true', 'dbType: \'varchar\'']);
        });
        await this.runner.test('should not include isUnique for a composite unique member column', async () => {
            let column = this.createColumn({name: 'owner_id', type: 'int', key: 'MUL', nullable: false});
            let props = generation.getPropertyAttributes(column, 'owner_id', {});
            assert.deepStrictEqual(props, ['type: \'number\'', 'isRequired: true', 'dbType: \'int\'']);
        });
        await this.runner.test('should not include isUnique for the primary key column', async () => {
            let column = this.createColumn({name: 'id', type: 'int', key: 'PRI', nullable: false, extra: 'auto_increment'});
            let props = generation.getPropertyAttributes(column, 'id', {});
            assert.deepStrictEqual(props, ['type: \'number\'', 'isRequired: true', 'dbType: \'int\'']);
        });
        await this.runner.test('should include isUnique for a unique reference column', async () => {
            let column = this.createColumn({
                name: 'profile_id',
                type: 'int',
                key: 'UNI',
                nullable: false,
                referencedTable: 'profiles',
                referencedColumn: 'id'
            });
            let props = generation.getPropertyAttributes(column, 'profile_id', {profiles: 1});
            assert.deepStrictEqual(props, [
                'type: \'reference\'',
                'reference: \'profiles\'',
                'alias: \'related_profiles\'',
                'isRequired: true',
                'isUnique: true',
                'dbType: \'int\''
            ]);
        });
    }

    async testGeneratePropertiesConfigUnique()
    {
        this.runner.group('generatePropertiesConfig - isUnique');
        let generation = new EntitiesGeneration({});
        await this.runner.test('should render isUnique in the generated properties config', async () => {
            let columns = {
                id: this.createColumn({name: 'id', type: 'int', key: 'PRI', nullable: false}),
                slug: this.createColumn({name: 'slug', key: 'UNI', nullable: false}),
                tags: this.createColumn({name: 'tags', key: ''})
            };
            let propertiesConfig = generation.generatePropertiesConfig(columns, false, 'id');
            assert.ok(propertiesConfig.includes('slug: {'));
            assert.ok(propertiesConfig.includes('isUnique: true'));
            assert.strictEqual(propertiesConfig.split('isUnique: true').length - 1, 1);
        });
        await this.runner.test('should not render isUnique when no unique columns exist', async () => {
            let columns = {
                id: this.createColumn({name: 'id', type: 'int', key: 'PRI', nullable: false}),
                tags: this.createColumn({name: 'tags', key: ''})
            };
            let propertiesConfig = generation.generatePropertiesConfig(columns, false, 'id');
            assert.ok(!propertiesConfig.includes('isUnique'));
        });
    }

}

module.exports = EntitiesGenerationTest;
