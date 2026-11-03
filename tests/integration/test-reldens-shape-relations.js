/**
 *
 * Reldens - Reldens Shape Relations Test
 * Reproduces the real Reldens data shape against the generated test models:
 * test_reviews.product_id (NOT NULL FK) -> test_products.id, plus test_products.category_id (NOT NULL FK)
 * -> test_categories.id, mirroring skills_owners_class_path.class_path_id -> skills_class_path.id and
 * skills_class_path.levels_set_id -> skills_levels_set.id.
 * The relation hint is passed exactly as lib/actions/server/models-manager.js does it: a bare string.
 *
 */

const { TestRunner, assert } = require('../utils/test-runner');
const { ObservedValue } = require('../utils/observed-value');
const { RelationsShapeSupport } = require('../utils/relations-shape-support');
const { CategoriesFixtures } = require('../fixtures/categories-fixtures');
const { ProductsFixtures } = require('../fixtures/products-fixtures');
const { ReviewsFixtures } = require('../fixtures/reviews-fixtures');

class ReldensShapeRelationsTest
{

    constructor(dataServer, repos, driverName)
    {
        this.driverName = driverName;
        this.support = new RelationsShapeSupport(dataServer, repos);
        this.runner = new TestRunner();
        this.createdChildId = false;
        this.createdParentId = false;
        this.child = ReviewsFixtures.review_relations_1;
        this.parent = ProductsFixtures.product_relations_1;
        this.otherParent = ProductsFixtures.product_relations_2;
        this.grandParent = CategoriesFixtures.category_relations_1;
        this.otherGrandParent = CategoriesFixtures.category_relations_2;
        this.parentColumns = {sku: this.parent.sku, name: this.parent.name};
        this.grandParentColumns = {name: this.grandParent.name, slug: this.grandParent.slug};
        this.parentKey = 'related_test_products';
        this.grandParentKey = 'related_test_categories';
    }

    async run()
    {
        this.runner.suite('Reldens Shape Relations - Driver: '+this.driverName);
        await this.prepareShapeFixtures();
        await this.testSingleLevelHints();
        await this.testTwoLevelHints();
        await this.testNonPrimaryColumnForeignKey();
        await this.testForeignKeyScalarWithoutRelations();
        await this.testForeignKeyOnCreate();
        await this.testForeignKeyOnUpdate();
        return this.runner.getResults();
    }

    async prepareShapeFixtures()
    {
        this.runner.group('Reldens Shape Fixtures');
        await this.support.insertChainFixtures();
        await this.runner.test('should have the child, parent and grandparent rows in place', async () => {
            let childRow = await this.support.cleared('child').loadOneBy('id', this.child.id);
            let parentRow = await this.support.cleared('parent').loadOneBy('id', this.parent.id);
            let grandParentRow = await this.support.cleared('grandParent').loadOneBy('id', this.grandParent.id);
            assert.ok(childRow && parentRow && grandParentRow, 'not every fixture row was inserted');
            this.support.assertNumericColumn(childRow.product_id, this.parent.id, 'child row product_id');
            this.support.assertNumericColumn(parentRow.category_id, this.grandParent.id, 'parent row category_id');
            this.support.assertEntityColumns(grandParentRow, this.grandParentColumns, 'grandparent row');
        });
    }

    async testSingleLevelHints()
    {
        this.runner.group('Single Level Relation Hint - models-manager.js shape');
        let hintForms = {'a bare string': this.parentKey, 'an array': [this.parentKey]};
        for(let hintLabel of Object.keys(hintForms)){
            await this.runner.test('should hydrate the parent entity from '+hintLabel+' hint', async () => {
                let record = await this.support.loadChildWithHint(hintForms[hintLabel]);
                ObservedValue.log('loadOneByWithRelations('+hintLabel+') result', record);
                assert.ok(record, 'loadOneByWithRelations returned: '+ObservedValue.describe(record));
                this.support.assertEntityColumns(record[this.parentKey], this.parentColumns, 'record.'+this.parentKey);
                this.support.assertNumericColumn(record[this.parentKey].id, this.parent.id, 'the parent entity id');
                this.support.assertNumericColumn(record.product_id, this.parent.id, 'the child product_id scalar');
            });
        }
        await this.runner.test('should hydrate the parent on loadByWithRelations with a bare string hint', async () => {
            let records = await this.support.cleared('child').loadByWithRelations(
                'product_id',
                this.parent.id,
                this.parentKey
            );
            ObservedValue.log('loadByWithRelations result', records);
            assert.ok(Array.isArray(records), 'loadByWithRelations returned: '+ObservedValue.describe(records));
            assert.strictEqual(records.length, 1, 'records.length observed: '+records.length);
            this.support.assertEntityColumns(records[0][this.parentKey], this.parentColumns, 'records[0] parent');
        });
        await this.runner.test('should hydrate the parent on loadOneWithRelations with an array hint', async () => {
            let record = await this.support.cleared('child').loadOneWithRelations({id: this.child.id}, [this.parentKey]);
            assert.ok(record, 'loadOneWithRelations returned: '+ObservedValue.describe(record));
            this.support.assertEntityColumns(record[this.parentKey], this.parentColumns, 'loadOneWithRelations parent');
        });
        await this.runner.test('should hydrate the parent on loadByIdWithRelations with a bare string hint', async () => {
            let record = await this.support.cleared('child').loadByIdWithRelations(this.child.id, this.parentKey);
            assert.ok(record, 'loadByIdWithRelations returned: '+ObservedValue.describe(record));
            this.support.assertEntityColumns(record[this.parentKey], this.parentColumns, 'loadByIdWithRelations parent');
        });
    }

    async testTwoLevelHints()
    {
        this.runner.group('Two Level Relation Hint');
        let nestedPath = this.parentKey+'.'+this.grandParentKey;
        let hintForms = {'an array': [nestedPath], 'a bare string': nestedPath};
        for(let hintLabel of Object.keys(hintForms)){
            await this.runner.test('should hydrate the grandparent from '+hintLabel+' two level hint', async () => {
                let record = await this.support.loadChildWithHint(hintForms[hintLabel]);
                assert.ok(record, 'loadOneByWithRelations returned: '+ObservedValue.describe(record));
                let parentValue = record[this.parentKey];
                this.support.assertEntityColumns(parentValue, this.parentColumns, 'record.'+this.parentKey);
                this.support.assertEntityColumns(
                    parentValue[this.grandParentKey],
                    this.grandParentColumns,
                    'record.'+nestedPath
                );
                this.support.assertNumericColumn(parentValue.category_id, this.grandParent.id, 'parent category_id');
            });
        }
    }

    async testNonPrimaryColumnForeignKey()
    {
        this.runner.group('Non Primary Column Foreign Key');
        await this.runner.test('should hydrate a parent whose foreign key targets a unique column', async () => {
            let record = await this.support.cleared('child').loadOneByWithRelations(
                'id',
                this.child.id,
                this.grandParentKey
            );
            assert.ok(record, 'loadOneByWithRelations returned: '+ObservedValue.describe(record));
            this.support.assertEntityColumns(
                record[this.grandParentKey],
                this.grandParentColumns,
                'record.'+this.grandParentKey
            );
            assert.strictEqual(
                record.category_slug,
                this.grandParent.slug,
                'record.category_slug observed: '+ObservedValue.describe(record.category_slug)
            );
        });
    }

    async testForeignKeyScalarWithoutRelations()
    {
        this.runner.group('Foreign Key Scalar Without Relations');
        await this.runner.test('should return the child foreign key scalar on a plain loadOneBy', async () => {
            let record = await this.support.cleared('child').loadOneBy('product_id', this.parent.id);
            ObservedValue.log('plain loadOneBy result', record);
            assert.ok(record, 'loadOneBy returned: '+ObservedValue.describe(record));
            this.support.assertNumericColumn(record.product_id, this.parent.id, 'plain loadOneBy product_id');
            let relationStub = record[this.parentKey];
            let describedStub = ObservedValue.log('plain loadOneBy '+this.parentKey, relationStub);
            assert.ok(
                !relationStub || !relationStub[Object.keys(this.parentColumns)[0]],
                'the relation was hydrated without being requested, observed: '+describedStub
            );
        });
        await this.runner.test('should return the parent foreign key scalar on a plain loadById', async () => {
            let record = await this.support.cleared('parent').loadById(this.parent.id);
            assert.ok(record, 'loadById returned: '+ObservedValue.describe(record));
            this.support.assertNumericColumn(record.category_id, this.grandParent.id, 'plain loadById category_id');
        });
        await this.runner.test('should return the child foreign key scalar on a plain loadBy', async () => {
            let records = await this.support.cleared('child').loadBy('id', this.child.id);
            assert.ok(Array.isArray(records), 'loadBy returned: '+ObservedValue.describe(records));
            this.support.assertNumericColumn(records[0].product_id, this.parent.id, 'plain loadBy product_id');
        });
    }

    async testForeignKeyOnCreate()
    {
        this.runner.group('Foreign Key Persisted On Create');
        await this.runner.test('should persist the child not null foreign key column on create', async () => {
            let created = await this.support.repos.child.create({
                product_id: this.otherParent.id,
                reviewer_name: 'Foreign Key Create',
                reviewer_email: 'fk-create@example.com',
                rating: 5,
                title: 'Foreign key create',
                comment: 'Created to verify the foreign key column is persisted',
                is_verified: 1,
                helpful_count: 0
            });
            ObservedValue.log('child create result', created);
            assert.ok(created, 'create returned: '+ObservedValue.describe(created));
            assert.ok(created.id, 'created.id observed: '+ObservedValue.describe(created.id));
            this.createdChildId = created.id;
            ObservedValue.log('product_id on the instance returned by create', created.product_id);
            await this.support.assertStoredColumn(
                'child',
                created.id,
                'product_id',
                this.otherParent.id,
                'created child'
            );
        });
        await this.runner.test('should persist the parent not null foreign key column on create', async () => {
            let created = await this.support.repos.parent.create({
                category_id: this.otherGrandParent.id,
                name: 'Foreign Key Create Product',
                sku: 'FK-CREATE-PROD-1',
                description: 'Created to verify the parent foreign key column is persisted',
                price: 12.34,
                stock_quantity: 3,
                is_featured: 0,
                tags: 'test,fk',
                status: 'draft'
            });
            ObservedValue.log('parent create result', created);
            assert.ok(created, 'create returned: '+ObservedValue.describe(created));
            assert.ok(created.id, 'created.id observed: '+ObservedValue.describe(created.id));
            this.createdParentId = created.id;
            await this.support.assertStoredColumn(
                'parent',
                created.id,
                'category_id',
                this.otherGrandParent.id,
                'created parent'
            );
        });
    }

    async testForeignKeyOnUpdate()
    {
        this.runner.group('Foreign Key Persisted On Update');
        await this.runner.test('should persist the child foreign key column on updateById', async () => {
            assert.ok(this.createdChildId, 'no created child id is available from the create group');
            let updated = await this.support.repos.child.updateById(this.createdChildId, {product_id: this.parent.id});
            ObservedValue.log('child updateById result', updated);
            await this.support.assertStoredColumn(
                'child',
                this.createdChildId,
                'product_id',
                this.parent.id,
                'child after updateById'
            );
        });
        await this.runner.test('should persist the child foreign key column on updateBy', async () => {
            assert.ok(this.createdChildId, 'no created child id is available from the create group');
            let updated = await this.support.repos.child.updateBy(
                'id',
                this.createdChildId,
                {product_id: this.otherParent.id}
            );
            ObservedValue.log('child updateBy result', updated);
            await this.support.assertStoredColumn(
                'child',
                this.createdChildId,
                'product_id',
                this.otherParent.id,
                'child after updateBy'
            );
        });
        await this.runner.test('should persist the parent foreign key column on updateById', async () => {
            assert.ok(this.createdParentId, 'no created parent id is available from the create group');
            let updated = await this.support.repos.parent.updateById(
                this.createdParentId,
                {category_id: this.grandParent.id}
            );
            ObservedValue.log('parent updateById result', updated);
            await this.support.assertStoredColumn(
                'parent',
                this.createdParentId,
                'category_id',
                this.grandParent.id,
                'parent after updateById'
            );
        });
        await this.runner.test('should hydrate the reassigned parent after the foreign key update', async () => {
            assert.ok(this.createdChildId, 'no created child id is available from the create group');
            let record = await this.support.cleared('child').loadByIdWithRelations(
                this.createdChildId,
                this.parentKey
            );
            assert.ok(record, 'loadByIdWithRelations returned: '+ObservedValue.describe(record));
            this.support.assertEntityColumns(
                record[this.parentKey],
                {sku: this.otherParent.sku, name: this.otherParent.name},
                'reassigned record.'+this.parentKey
            );
        });
    }

}

module.exports = ReldensShapeRelationsTest;
