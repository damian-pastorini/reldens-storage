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
const { ProductDetailsFixtures } = require('../fixtures/product-details-fixtures');

class RelationsTest
{

    constructor(dataServer, repos, driverName)
    {
        this.dataServer = dataServer;
        this.categoriesRepo = repos.testCategories;
        this.productsRepo = repos.testProducts;
        this.productDetailsRepo = repos.testProductDetails;
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
        await this.testOneToOneRelations();
        await this.testCamelCaseColumns();
        return this.runner.getResults();
    }

    async testCamelCaseColumns()
    {
        this.runner.group('CamelCase Columns');
        await TestHelpers.cleanDatabase(this.dataServer);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_categories', [
            CategoriesFixtures.category_relations_1
        ]);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_products', [
            ProductsFixtures.product_relations_1
        ]);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_product_details', [
            ProductDetailsFixtures.product_details_relations_1
        ]);
        await this.runner.test('should read a camelCase column with the exact database column name', async () => {
            let record = await this.productDetailsRepo.loadById(4600);
            assert.ok(record);
            assert.strictEqual(record.customData, ProductDetailsFixtures.product_details_relations_1.customData);
            assert.strictEqual(record.useTimeOut, ProductDetailsFixtures.product_details_relations_1.useTimeOut);
        });
        await this.runner.test('should read a bigint column as a number', async () => {
            let record = await this.productDetailsRepo.loadById(4600);
            assert.strictEqual(typeof record.total_views, 'number');
            assert.strictEqual(record.total_views, ProductDetailsFixtures.product_details_relations_1.total_views);
            assert.strictEqual(record.total_views + 1, ProductDetailsFixtures.product_details_relations_1.total_views + 1);
        });
        await this.runner.test('should filter by a camelCase column', async () => {
            let records = await this.productDetailsRepo.loadBy('useTimeOut', 45);
            assert.strictEqual(records.length, 1);
            assert.strictEqual(records[0].id, 4600);
        });
        await this.runner.test('should write a camelCase column', async () => {
            await this.productDetailsRepo.updateById(4600, {useTimeOut: 90});
            let updated = await this.productDetailsRepo.loadById(4600);
            assert.strictEqual(updated.useTimeOut, 90);
        });
        await this.runner.test('should populate a relation whose target has camelCase columns', async () => {
            let results = await this.productsRepo.loadWithRelations({id: 2600}, ['related_test_product_details']);
            assert.strictEqual(results.length, 1);
            assert.strictEqual(
                results[0].related_test_product_details.customData,
                ProductDetailsFixtures.product_details_relations_1.customData
            );
        });
        await this.runner.test('should return an explicit null for an empty nullable foreign key', async () => {
            let record = await this.productDetailsRepo.loadById(4600);
            assert.strictEqual(record.category_id, null);
        });
        await this.runner.test('should keep the foreign key column value on a nested populated relation', async () => {
            let results = await this.categoriesRepo.loadWithRelations(
                {id: 1600},
                ['related_test_products.related_test_product_details']
            );
            let product = results[0].related_test_products[0];
            assert.strictEqual(product.category_id, 1600);
            assert.strictEqual(product.related_test_product_details.product_id, 2600);
        });
        await this.runner.test('should keep a nullable foreign key on the leaf of a nested populate', async () => {
            let results = await this.categoriesRepo.loadWithRelations(
                {id: 1600},
                ['related_test_products.related_test_product_details']
            );
            let details = results[0].related_test_products[0].related_test_product_details;
            assert.strictEqual(details.category_id, null);
        });
        await this.runner.test('should keep the foreign key column value on a load without relations', async () => {
            let record = await this.productDetailsRepo.loadById(4600);
            assert.strictEqual(record.product_id, 2600);
        });
        await this.runner.test('should keep the foreign key column value on loadBy without relations', async () => {
            let records = await this.productDetailsRepo.loadBy('id', 4600);
            assert.strictEqual(records[0].product_id, 2600);
        });
        await this.runner.test('should accept an object written into a text column', async () => {
            await this.productDetailsRepo.updateById(4600, {customData: {onlyCurrentPlayer: true}});
            let updated = await this.productDetailsRepo.loadById(4600);
            assert.ok(updated.customData);
        });
    }

    async testOneToOneRelations()
    {
        this.runner.group('One To One Relations');
        await TestHelpers.cleanDatabase(this.dataServer);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_categories', [
            CategoriesFixtures.category_relations_1
        ]);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_products', [
            ProductsFixtures.product_relations_1,
            {...ProductsFixtures.product_relations_2, category_id: 1600}
        ]);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_product_details', [
            ProductDetailsFixtures.product_details_relations_1
        ]);
        await this.runner.test('should load the one to one relation from the referenced side as a single object', async () => {
            let results = await this.productsRepo.loadWithRelations({id: 2600}, ['related_test_product_details']);
            assert.strictEqual(results.length, 1);
            let details = results[0].related_test_product_details;
            assert.ok(details);
            assert.ok(!Array.isArray(details));
            assert.strictEqual(details.id, 4600);
        });
        await this.runner.test('should load the one to one relation from the owning side as a single object', async () => {
            let results = await this.productDetailsRepo.loadWithRelations({id: 4600}, ['related_test_products']);
            assert.strictEqual(results.length, 1);
            let product = results[0].related_test_products;
            assert.ok(product);
            assert.ok(!Array.isArray(product));
            assert.strictEqual(product.id, 2600);
        });
        await this.runner.test('should return no related record on the one to one relation when none exists', async () => {
            let result = await this.productsRepo.loadByIdWithRelations(2601, ['related_test_product_details']);
            assert.ok(result);
            assert.ok(!result.related_test_product_details);
        });
        await this.runner.test('should count records joining the one to one relation from the referenced side', async () => {
            let count = await this.productsRepo.countWithRelations({}, ['related_test_product_details']);
            assert.strictEqual(count, 2);
        });
        await this.runner.test('should count records joining the one to one relation from the owning side', async () => {
            let count = await this.productDetailsRepo.countWithRelations({}, ['related_test_products']);
            assert.strictEqual(count, 1);
        });
        await this.runner.test('should create a record with a nested one to one relation', async () => {
            let productWithDetails = {
                ...ProductsFixtures.product_create_nested,
                category_id: 1600,
                related_test_product_details: {...ProductDetailsFixtures.product_details_create_nested}
            };
            let created = await this.productsRepo.createWithRelations(
                productWithDetails,
                ['related_test_product_details']
            );
            assert.ok(created);
            assert.ok(created.id);
            let details = await this.productDetailsRepo.loadBy('product_id', created.id);
            assert.strictEqual(details.length, 1);
            assert.strictEqual(details[0].dimensions, ProductDetailsFixtures.product_details_create_nested.dimensions);
        });
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
            let results = await this.categoriesRepo.loadWithRelations({id: 1600}, ['related_test_products']);
            assert.ok(results);
            assert.ok(results.length > 0);
            let category = results[0];
            assert.ok(category.related_test_products);
            assert.ok(Array.isArray(category.related_test_products));
            assert.strictEqual(category.related_test_products.length, 1);
        });
        await this.runner.test('should load records with multiple relations', async () => {
            let results = await this.productsRepo.loadWithRelations(
                {id: 2600},
                ['related_test_categories', 'related_test_reviews']
            );
            assert.ok(results);
            assert.ok(results.length > 0);
            let product = results[0];
            assert.ok(product.related_test_categories);
            assert.strictEqual(
                product.related_test_categories.name,
                CategoriesFixtures.category_relations_1.name
            );
            assert.ok(product.related_test_reviews);
            assert.ok(Array.isArray(product.related_test_reviews));
        });
        await this.runner.test('should load with empty filters', async () => {
            let results = await this.categoriesRepo.loadWithRelations({}, ['related_test_products']);
            assert.ok(results);
            assert.strictEqual(results.length, 1);
        });
        await this.runner.test('should filter by nested relation properties', async () => {
            await TestHelpers.cleanDatabase(this.dataServer);
            await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_categories', [
                CategoriesFixtures.category_relations_1,
                CategoriesFixtures.category_relations_2
            ]);
            await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_products', [
                {...ProductsFixtures.product_relations_1, id: 2600, category_id: 1600, price: 149.99},
                {...ProductsFixtures.product_relations_2, id: 2601, category_id: 1601, price: 49.99}
            ]);
            let results = await this.categoriesRepo.loadWithRelations({
                related_test_products: {
                    price: {operator: 'gt', value: 100}
                }
            }, ['related_test_products']);
            assert.ok(results);
            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].id, 1600);
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
            let results = await this.categoriesRepo.loadAllWithRelations(['related_test_products']);
            assert.ok(results);
            assert.strictEqual(results.length, 2);
            for(let category of results){
                assert.ok(category.related_test_products);
                assert.ok(Array.isArray(category.related_test_products));
            }
        });
        await this.runner.test('should respect limit with relations', async () => {
            this.categoriesRepo.limit = 1;
            let results = await this.categoriesRepo.loadWithRelations({}, ['related_test_products']);
            assert.strictEqual(results.length, 1);
            assert.ok(results[0].related_test_products);
            this.categoriesRepo.limit = 0;
        });
        await this.runner.test('should respect sortBy with relations', async () => {
            this.categoriesRepo.sortBy = 'name';
            this.categoriesRepo.sortDirection = 'DESC';
            let results = await this.categoriesRepo.loadWithRelations({}, ['related_test_products']);
            assert.ok(results.length > 0);
            assert.ok(results[0].related_test_products);
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
            let results = await this.categoriesRepo.loadByWithRelations('slug', 'relations-test-1', ['related_test_products']);
            assert.ok(results);
            assert.ok(results.length > 0);
            let category = results[0];
            assert.strictEqual(category.slug, 'relations-test-1');
            assert.ok(category.related_test_products);
            assert.ok(Array.isArray(category.related_test_products));
        });
        await this.runner.test('should return empty array when no match with relations', async () => {
            let results = await this.categoriesRepo.loadByWithRelations('slug', 'nonexistent', ['related_test_products']);
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
            let result = await this.categoriesRepo.loadByIdWithRelations(1600, ['related_test_products']);
            assert.ok(result);
            assert.strictEqual(result.id, 1600);
            assert.ok(result.related_test_products);
            assert.ok(Array.isArray(result.related_test_products));
            assert.strictEqual(result.related_test_products.length, 1);
        });
        await this.runner.test('should return null when ID not found with relations', async () => {
            let result = await this.categoriesRepo.loadByIdWithRelations(99999, ['related_test_products']);
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
            let result = await this.categoriesRepo.loadOneWithRelations({is_active: 1}, ['related_test_products']);
            assert.ok(result);
            assert.strictEqual(result.is_active, 1);
            assert.ok(result.related_test_products);
            assert.ok(Array.isArray(result.related_test_products));
        });
        await this.runner.test('should return null when no match with relations', async () => {
            let result = await this.categoriesRepo.loadOneWithRelations({slug: 'nonexistent'}, ['related_test_products']);
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
            let result = await this.categoriesRepo.loadOneByWithRelations('slug', 'relations-test-1', ['related_test_products']);
            assert.ok(result);
            assert.strictEqual(result.slug, 'relations-test-1');
            assert.ok(result.related_test_products);
            assert.ok(Array.isArray(result.related_test_products));
        });
        await this.runner.test('should return null when no match by field with relations', async () => {
            let result = await this.categoriesRepo.loadOneByWithRelations('slug', 'nonexistent', ['related_test_products']);
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
            let count = await this.categoriesRepo.countWithRelations({is_active: 1}, ['related_test_products']);
            assert.strictEqual(count, 2);
        });
        await this.runner.test('should count all records with relations', async () => {
            let count = await this.categoriesRepo.countWithRelations({}, ['related_test_products']);
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
                related_test_products: [ProductsFixtures.product_create_nested]
            };
            let created = await this.categoriesRepo.createWithRelations(categoryWithProducts, ['related_test_products']);
            assert.ok(created);
            assert.ok(created.id);
            let loaded = await this.categoriesRepo.loadByIdWithRelations(created.id, ['related_test_products']);
            assert.ok(loaded);
            assert.ok(loaded.related_test_products);
            assert.ok(loaded.related_test_products.length > 0);
        });
        await TestHelpers.cleanDatabase(this.dataServer);
        await this.runner.test('should create record without relations when not provided', async () => {
            let created = await this.categoriesRepo.createWithRelations(
                CategoriesFixtures.category_create_nested,
                ['related_test_products']
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
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_product_details', [
            ProductDetailsFixtures.product_details_relations_1
        ]);
        await this.runner.test('should load nested relations (category > products > reviews)', async () => {
            let results = await this.categoriesRepo.loadWithRelations(
                {id: 1600},
                ['related_test_products.related_test_reviews']
            );
            assert.ok(results);
            assert.ok(results.length > 0);
            let category = results[0];
            assert.ok(category.related_test_products);
            assert.ok(category.related_test_products.length > 0);
            let product = category.related_test_products[0];
            assert.ok(product.related_test_reviews);
        });
        await this.runner.test('should load a relation whose foreign key references a non primary column', async () => {
            let results = await this.categoriesRepo.loadWithRelations(
                {id: 1600},
                ['related_test_reviews']
            );
            let related = results[0].related_test_reviews;
            assert.ok(Array.isArray(related));
            assert.strictEqual(related.length, 1);
            assert.strictEqual(related[0].reviewer_name, ReviewsFixtures.review_relations_1.reviewer_name);
        });
        await this.runner.test('should load a collection nested under an owning relation', async () => {
            let results = await this.productDetailsRepo.loadAllWithRelations([
                'related_test_products.related_test_reviews'
            ]);
            let product = results[0].related_test_products;
            assert.strictEqual(typeof product, 'object');
            assert.strictEqual(product.name, ProductsFixtures.product_relations_1.name);
            assert.ok(Array.isArray(product.related_test_reviews));
            assert.strictEqual(
                product.related_test_reviews[0].reviewer_name,
                ReviewsFixtures.review_relations_1.reviewer_name
            );
        });
        await this.runner.test('should load a nested relation through an owning relation as an entity', async () => {
            let results = await this.productDetailsRepo.loadWithRelations(
                {id: 4600},
                ['related_test_products.related_test_categories']
            );
            let product = results[0].related_test_products;
            assert.strictEqual(product.name, ProductsFixtures.product_relations_1.name);
            assert.strictEqual(
                product.related_test_categories.name,
                CategoriesFixtures.category_relations_1.name
            );
        });
        await this.runner.test('should return the nested collection as an array on the deepest level', async () => {
            let results = await this.categoriesRepo.loadWithRelations(
                {id: 1600},
                ['related_test_products.related_test_reviews']
            );
            let product = results[0].related_test_products[0];
            assert.ok(Array.isArray(product.related_test_reviews));
            assert.strictEqual(product.related_test_reviews.length, 1);
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
                'related_test_categories,related_test_reviews'
            );
            assert.ok(results);
            assert.ok(results.length > 0);
        });
        await this.runner.test('should handle single relation as string', async () => {
            let results = await this.productsRepo.loadWithRelations(
                {id: 2600},
                'related_test_categories'
            );
            assert.ok(results);
            assert.ok(results.length > 0);
            assert.ok(results[0].related_test_categories);
            assert.strictEqual(
                results[0].related_test_categories.name,
                CategoriesFixtures.category_relations_1.name
            );
        });
    }

}

module.exports = RelationsTest;
