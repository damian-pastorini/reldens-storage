/**
 *
 * Reldens - Relations Test
 * Tests relation loading across all three storage drivers
 *
 */

const { TestRunner, assert } = require('../utils/test-runner');
const { TestHelpers } = require('../utils/test-helpers');
const { CategoriesFixtures } = require('../fixtures/categories-fixtures');
const { ProductsFixtures } = require('../fixtures/products-fixtures');
const { ReviewsFixtures } = require('../fixtures/reviews-fixtures');

class RelationsTest
{

    constructor(dataServer, repos, driverName)
    {
        this.dataServer = dataServer;
        this.categoriesRepo = repos.testCategories;
        this.productsRepo = repos.testProducts;
        this.reviewsRepo = repos.testReviews;
        this.driverName = driverName;
        this.runner = new TestRunner();
    }

    async run()
    {
        this.runner.suite('Relations - Driver: '+this.driverName);
        await this.testLoadWithRelations();
        await this.testLoadAllWithRelations();
        await this.testLoadByWithRelations();
        await this.testLoadByIdWithRelations();
        await this.testLoadOneWithRelations();
        await this.testLoadOneByWithRelations();
        await this.testCountWithRelations();
        await this.testCreateWithRelations();
        await this.testNestedRelations();
        await this.testRelationStringParsing();
        return this.runner.getResults();
    }

    async testLoadWithRelations()
    {
        this.runner.group('loadWithRelations');
        await TestHelpers.cleanDatabase(this.dataServer);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_categories', [
            CategoriesFixtures.category_relations_1
        ]);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_products', [
            ProductsFixtures.product_relations_1
        ]);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_reviews', [
            ReviewsFixtures.review_relations_1
        ]);
        await this.runner.test('should load records with single relation', async () => {
            let results = await this.categoriesRepo.loadWithRelations({id: 1600}, ['related_products']);
            assert.ok(results);
            assert.ok(results.length > 0);
            let category = results[0];
            assert.ok(category.related_products);
            assert.ok(Array.isArray(category.related_products));
            assert.strictEqual(category.related_products.length, 1);
        });
        await this.runner.test('should load records with multiple relations', async () => {
            let results = await this.productsRepo.loadWithRelations(
                {id: 2600},
                ['related_categories', 'related_reviews']
            );
            assert.ok(results);
            assert.ok(results.length > 0);
            let product = results[0];
            assert.ok(product.related_categories);
            assert.ok(product.related_reviews);
            assert.ok(Array.isArray(product.related_reviews));
        });
        await this.runner.test('should load with empty filters', async () => {
            let results = await this.categoriesRepo.loadWithRelations({}, ['related_products']);
            assert.ok(results);
            assert.strictEqual(results.length, 1);
        });
    }

    async testLoadAllWithRelations()
    {
        this.runner.group('loadAllWithRelations');
        await TestHelpers.cleanDatabase(this.dataServer);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_categories', [
            CategoriesFixtures.category_relations_1,
            CategoriesFixtures.category_relations_2
        ]);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_products', [
            ProductsFixtures.product_relations_1,
            ProductsFixtures.product_relations_2
        ]);
        await this.runner.test('should load all records with relations', async () => {
            let results = await this.categoriesRepo.loadAllWithRelations(['related_products']);
            assert.ok(results);
            assert.strictEqual(results.length, 2);
            for(let category of results){
                assert.ok(category.related_products);
                assert.ok(Array.isArray(category.related_products));
            }
        });
        await this.runner.test('should respect limit with relations', async () => {
            this.categoriesRepo.limit = 1;
            let results = await this.categoriesRepo.loadWithRelations({}, ['related_products']);
            assert.strictEqual(results.length, 1);
            assert.ok(results[0].related_products);
            this.categoriesRepo.limit = 0;
        });
        await this.runner.test('should respect sortBy with relations', async () => {
            this.categoriesRepo.sortBy = 'name';
            this.categoriesRepo.sortDirection = 'DESC';
            let results = await this.categoriesRepo.loadWithRelations({}, ['related_products']);
            assert.ok(results.length > 0);
            assert.ok(results[0].related_products);
            this.categoriesRepo.sortBy = false;
            this.categoriesRepo.sortDirection = 'ASC';
        });
    }

    async testLoadByWithRelations()
    {
        this.runner.group('loadByWithRelations');
        await TestHelpers.cleanDatabase(this.dataServer);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_categories', [
            CategoriesFixtures.category_relations_1
        ]);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_products', [
            ProductsFixtures.product_relations_1
        ]);
        await this.runner.test('should load records by field with relations', async () => {
            let results = await this.categoriesRepo.loadByWithRelations('slug', 'relations-test-1', ['related_products']);
            assert.ok(results);
            assert.ok(results.length > 0);
            let category = results[0];
            assert.strictEqual(category.slug, 'relations-test-1');
            assert.ok(category.related_products);
            assert.ok(Array.isArray(category.related_products));
        });
        await this.runner.test('should return empty array when no match with relations', async () => {
            let results = await this.categoriesRepo.loadByWithRelations('slug', 'nonexistent', ['related_products']);
            assert.ok(results);
            assert.strictEqual(results.length, 0);
        });
    }

    async testLoadByIdWithRelations()
    {
        this.runner.group('loadByIdWithRelations');
        await TestHelpers.cleanDatabase(this.dataServer);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_categories', [
            CategoriesFixtures.category_relations_1,
            CategoriesFixtures.category_relations_2
        ]);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_products', [
            ProductsFixtures.product_relations_1,
            ProductsFixtures.product_relations_2
        ]);
        await this.runner.test('should load single record by ID with relations', async () => {
            let result = await this.categoriesRepo.loadByIdWithRelations(1600, ['related_products']);
            assert.ok(result);
            assert.strictEqual(result.id, 1600);
            assert.ok(result.related_products);
            assert.ok(Array.isArray(result.related_products));
            assert.strictEqual(result.related_products.length, 1);
        });
        await this.runner.test('should return null when ID not found with relations', async () => {
            let result = await this.categoriesRepo.loadByIdWithRelations(99999, ['related_products']);
            assert.ok(!result);
        });
    }

    async testLoadOneWithRelations()
    {
        this.runner.group('loadOneWithRelations');
        await TestHelpers.cleanDatabase(this.dataServer);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_categories', [
            CategoriesFixtures.category_relations_1,
            CategoriesFixtures.category_relations_2
        ]);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_products', [
            ProductsFixtures.product_relations_1
        ]);
        await this.runner.test('should load one record with relations', async () => {
            let result = await this.categoriesRepo.loadOneWithRelations({is_active: 1}, ['related_products']);
            assert.ok(result);
            assert.strictEqual(result.is_active, 1);
            assert.ok(result.related_products);
            assert.ok(Array.isArray(result.related_products));
        });
        await this.runner.test('should return null when no match with relations', async () => {
            let result = await this.categoriesRepo.loadOneWithRelations({slug: 'nonexistent'}, ['related_products']);
            assert.ok(!result);
        });
    }

    async testLoadOneByWithRelations()
    {
        this.runner.group('loadOneByWithRelations');
        await TestHelpers.cleanDatabase(this.dataServer);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_categories', [
            CategoriesFixtures.category_relations_1
        ]);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_products', [
            ProductsFixtures.product_relations_1
        ]);
        await this.runner.test('should load one record by field with relations', async () => {
            let result = await this.categoriesRepo.loadOneByWithRelations('slug', 'relations-test-1', ['related_products']);
            assert.ok(result);
            assert.strictEqual(result.slug, 'relations-test-1');
            assert.ok(result.related_products);
            assert.ok(Array.isArray(result.related_products));
        });
        await this.runner.test('should return null when no match by field with relations', async () => {
            let result = await this.categoriesRepo.loadOneByWithRelations('slug', 'nonexistent', ['related_products']);
            assert.ok(!result);
        });
    }

    async testCountWithRelations()
    {
        this.runner.group('countWithRelations');
        await TestHelpers.cleanDatabase(this.dataServer);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_categories', [
            CategoriesFixtures.category_relations_1,
            CategoriesFixtures.category_relations_2,
            CategoriesFixtures.category_filters_3
        ]);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_products', [
            ProductsFixtures.product_relations_1
        ]);
        await this.runner.test('should count records with relation filter', async () => {
            let count = await this.categoriesRepo.countWithRelations({is_active: 1}, ['related_products']);
            assert.strictEqual(count, 2);
        });
        await this.runner.test('should count all records with relations', async () => {
            let count = await this.categoriesRepo.countWithRelations({}, ['related_products']);
            assert.strictEqual(count, 3);
        });
    }

    async testCreateWithRelations()
    {
        this.runner.group('createWithRelations');
        await TestHelpers.cleanDatabase(this.dataServer);
        await this.runner.test('should create record with nested relations', async () => {
            let categoryWithProducts = {
                ...CategoriesFixtures.category_create_nested,
                related_products: [ProductsFixtures.product_create_nested]
            };
            let created = await this.categoriesRepo.createWithRelations(categoryWithProducts, ['related_products']);
            assert.ok(created);
            assert.ok(created.id);
            let loaded = await this.categoriesRepo.loadByIdWithRelations(created.id, ['related_products']);
            assert.ok(loaded);
            assert.ok(loaded.related_products);
            assert.ok(loaded.related_products.length > 0);
        });
        await TestHelpers.cleanDatabase(this.dataServer);
        await this.runner.test('should create record without relations when not provided', async () => {
            let created = await this.categoriesRepo.createWithRelations(
                CategoriesFixtures.category_create_nested,
                ['related_products']
            );
            assert.ok(created);
            assert.ok(created.id);
        });
    }

    async testNestedRelations()
    {
        this.runner.group('Nested Relations');
        await TestHelpers.cleanDatabase(this.dataServer);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_categories', [
            CategoriesFixtures.category_relations_1
        ]);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_products', [
            ProductsFixtures.product_relations_1
        ]);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_reviews', [
            ReviewsFixtures.review_relations_1
        ]);
        await this.runner.test('should load nested relations (category > products > reviews)', async () => {
            let results = await this.categoriesRepo.loadWithRelations(
                {id: 1600},
                ['related_products.related_reviews']
            );
            assert.ok(results);
            assert.ok(results.length > 0);
            let category = results[0];
            assert.ok(category.related_products);
            assert.ok(category.related_products.length > 0);
            let product = category.related_products[0];
            assert.ok(product.related_reviews);
        });
    }

    async testRelationStringParsing()
    {
        this.runner.group('Relation String Parsing');
        await TestHelpers.cleanDatabase(this.dataServer);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_categories', [
            CategoriesFixtures.category_relations_1
        ]);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_products', [
            ProductsFixtures.product_relations_1
        ]);
        await this.runner.test('should parse comma-separated relations string', async () => {
            let results = await this.productsRepo.loadWithRelations(
                {id: 2600},
                'related_categories,related_reviews'
            );
            assert.ok(results);
            assert.ok(results.length > 0);
        });
        await this.runner.test('should handle single relation as string', async () => {
            let results = await this.productsRepo.loadWithRelations(
                {id: 2600},
                'related_categories'
            );
            assert.ok(results);
            assert.ok(results.length > 0);
            assert.ok(results[0].related_categories);
        });
    }

}

module.exports = RelationsTest;
