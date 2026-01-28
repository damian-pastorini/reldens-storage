/**
 *
 * Reldens - Drivers Integration Test
 * Tests CRUD operations across all three storage drivers
 *
 */

const { TestRunner, assert } = require('../utils/test-runner');
const { TestHelpers } = require('../utils/test-helpers');
const { CategoriesFixtures } = require('../fixtures/categories-fixtures');
const { ProductsFixtures } = require('../fixtures/products-fixtures');
const { ReviewsFixtures } = require('../fixtures/reviews-fixtures');

class DriversTest
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
        this.runner.suite('Driver: '+this.driverName);
        await this.testCreateOperations();
        await this.testUpdateOperations();
        await this.testQueryOperations();
        await this.testDeleteOperations();
        await this.testReviewsCrud();
        return this.runner.getResults();
    }

    async testCreateOperations()
    {
        this.runner.group('CREATE Operations');
        await TestHelpers.cleanDatabase(this.dataServer);
        await this.categoriesRepo.create(CategoriesFixtures.category_create_single);
        let categoryJson = await this.categoriesRepo.create(CategoriesFixtures.category_create_json);
        await this.productsRepo.create({...ProductsFixtures.product_create_json, category_id: categoryJson.id});
        let categoryEnum = await this.categoriesRepo.create(CategoriesFixtures.category_create_enum);
        await this.productsRepo.create({...ProductsFixtures.product_create_enum, category_id: categoryEnum.id});
        await this.categoriesRepo.create(CategoriesFixtures.category_unique_test);
        await this.runner.test('should create single record', async () => {
            let created = await this.categoriesRepo.loadOne({slug: 'electronics'});
            assert.ok(created);
            assert.ok(created.id);
            assert.strictEqual(created.name, 'Electronics');
        });
        await this.runner.test('should create record with JSON field', async () => {
            let category = await this.categoriesRepo.loadOne({slug: 'books'});
            let product = await this.productsRepo.loadOne({sku: 'LAPTOP-PRO-15'});
            assert.ok(category);
            assert.ok(product);
            assert.ok(product.metadata);
        });
        await this.runner.test('should create record with ENUM field', async () => {
            let category = await this.categoriesRepo.loadOne({slug: 'clothing'});
            let product = await this.productsRepo.loadOne({sku: 'TSHIRT-CLASSIC'});
            assert.ok(category);
            assert.ok(product);
            assert.strictEqual(product.status, 'published');
        });
        await this.runner.test('should enforce UNIQUE constraints', async () => {
            let categoryData = CategoriesFixtures.category_unique_test;
            try {
                await this.categoriesRepo.create(categoryData);
                assert.fail('Should have thrown duplicate key error');
            } catch(error){
                assert.ok(error);
            }
        });
        await this.runner.test('should enforce FOREIGN KEY constraints', async () => {
            let productData = ProductsFixtures.product_fk_test;
            try {
                await this.productsRepo.create(productData);
                assert.fail('Should have thrown foreign key error');
            } catch(error){
                assert.ok(error);
            }
        });
    }

    async testUpdateOperations()
    {
        this.runner.group('UPDATE Operations');
        await TestHelpers.cleanDatabase(this.dataServer);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_categories', [
            CategoriesFixtures.category_update_by_id
        ]);
        await this.runner.test('should update record by ID', async () => {
            let updated = await this.categoriesRepo.updateById(1100, {name: 'Updated Name'});
            assert.ok(updated);
            assert.strictEqual(updated.name, 'Updated Name');
        });
        await this.runner.test('should update record by filters', async () => {
            let updated = await this.categoriesRepo.updateBy('id', 1100, {name: 'Updated via filters'});
            assert.ok(updated);
        });
        await this.runner.test('should update record by single field', async () => {
            let updated = await this.categoriesRepo.updateBy('id', 1100, {name: 'Updated via field'});
            assert.ok(updated);
        });
        await this.runner.test('should upsert when record does not exist', async () => {
            let newData = CategoriesFixtures.category_upsert_new;
            let result = await this.categoriesRepo.upsert({id: newData.id}, newData);
            assert.ok(result);
        });
        await this.runner.test('should upsert when record exists', async () => {
            let result = await this.categoriesRepo.upsert({id: 1100}, {name: 'Upserted Name'});
            assert.ok(result);
        });
    }

    async testQueryOperations()
    {
        this.runner.group('QUERY Operations');
        await TestHelpers.cleanDatabase(this.dataServer);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_categories', [
            CategoriesFixtures.category_query_1,
            CategoriesFixtures.category_query_2,
            CategoriesFixtures.category_query_3
        ]);
        await this.runner.test('should load all records', async () => {
            let all = await this.categoriesRepo.loadAll();
            assert.strictEqual(all.length, 3);
        });
        await this.runner.test('should load records by filters', async () => {
            let filtered = await this.categoriesRepo.load({name: 'Query Test 1'});
            assert.strictEqual(filtered.length, 1);
            assert.strictEqual(filtered[0].id, 1300);
        });
        await this.runner.test('should load records by single field', async () => {
            let result = await this.categoriesRepo.loadBy('name', 'Query Test 2');
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].id, 1301);
        });
        await this.runner.test('should load record by ID', async () => {
            let record = await this.categoriesRepo.loadById(1300);
            assert.ok(record);
            assert.strictEqual(record.id, 1300);
        });
        await this.runner.test('should load records by multiple IDs', async () => {
            let records = await this.categoriesRepo.loadByIds([1300, 1301]);
            assert.strictEqual(records.length, 2);
        });
        await this.runner.test('should load one record', async () => {
            let record = await this.categoriesRepo.loadOne({name: 'Query Test 1'});
            assert.ok(record);
            assert.strictEqual(record.id, 1300);
        });
        await this.runner.test('should load one record by field', async () => {
            let record = await this.categoriesRepo.loadOneBy('name', 'Query Test 3');
            assert.ok(record);
            assert.strictEqual(record.id, 1302);
        });
        await this.runner.test('should count records with filters', async () => {
            let count = await this.categoriesRepo.count({name: 'Query Test 1'});
            assert.strictEqual(count, 1);
        });
        await this.runner.test('should apply limit', async () => {
            this.categoriesRepo.limit = 2;
            let records = await this.categoriesRepo.load();
            assert.strictEqual(records.length, 2);
            this.categoriesRepo.limit = 0;
        });
        await this.runner.test('should apply offset', async () => {
            this.categoriesRepo.offset = 1;
            this.categoriesRepo.limit = 2;
            let records = await this.categoriesRepo.load();
            assert.strictEqual(records.length, 2);
            this.categoriesRepo.offset = 0;
            this.categoriesRepo.limit = 0;
        });
        await this.runner.test('should apply sortBy and sortDirection', async () => {
            this.categoriesRepo.sortBy = 'name';
            this.categoriesRepo.sortDirection = 'DESC';
            let records = await this.categoriesRepo.load();
            assert.strictEqual(records.length, 3);
            assert.strictEqual(records[0].name, 'Query Test 3');
            assert.strictEqual(records[1].name, 'Query Test 2');
            assert.strictEqual(records[2].name, 'Query Test 1');
            this.categoriesRepo.sortBy = false;
            this.categoriesRepo.sortDirection = 'ASC';
        });
    }

    async testDeleteOperations()
    {
        this.runner.group('DELETE Operations');
        await TestHelpers.cleanDatabase(this.dataServer);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_categories', [
            CategoriesFixtures.category_delete_by_id,
            CategoriesFixtures.category_delete_by_filters
        ]);
        await this.runner.test('should delete record by ID', async () => {
            let result = await this.categoriesRepo.deleteById(1200);
            assert.ok(result);
            let remaining = await this.categoriesRepo.loadAll();
            assert.strictEqual(remaining.length, 1);
        });
        await this.runner.test('should delete records by filters', async () => {
            let result = await this.categoriesRepo.delete({name: 'Art'});
            assert.ok(result);
            let remaining = await this.categoriesRepo.loadAll();
            assert.strictEqual(remaining.length, 0);
        });
    }

    async testReviewsCrud()
    {
        this.runner.group('REVIEWS CRUD Operations');
        await TestHelpers.cleanDatabase(this.dataServer);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_categories', [
            CategoriesFixtures.category_reviews_crud
        ]);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_products', [
            ProductsFixtures.product_reviews_crud
        ]);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_reviews', [
            ReviewsFixtures.review_crud_1
        ]);
        await this.runner.test('should create review record', async () => {
            let created = await this.reviewsRepo.loadById(3400);
            assert.ok(created);
            assert.strictEqual(created.product_id, 2400);
        });
        await this.runner.test('should load review by ID', async () => {
            let record = await this.reviewsRepo.loadById(3400);
            assert.ok(record);
            assert.strictEqual(record.id, 3400);
        });
        await this.runner.test('should update review by ID', async () => {
            let updated = await this.reviewsRepo.updateById(3400, {rating: 5});
            assert.ok(updated);
            assert.strictEqual(updated.rating, 5);
        });
        await this.runner.test('should delete review by ID', async () => {
            let result = await this.reviewsRepo.deleteById(3400);
            assert.ok(result);
        });
        await this.runner.test('should load reviews by product_id', async () => {
            await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_reviews', [
                ReviewsFixtures.review_crud_1
            ]);
            let reviews = await this.reviewsRepo.loadBy('product_id', 2400);
            assert.strictEqual(reviews.length, 1);
        });
    }

}

module.exports = DriversTest;
