/**
 *
 * Reldens - Drivers Integration Test
 * Tests CRUD operations across all three storage drivers
 *
 */

const { describe, it, before, beforeEach, after, afterEach } = require('node:test');
const assert = require('node:assert');
const { FileHandler } = require('@reldens/server-utils');
const { TestHelpers } = require('../utils/test-helpers');
const { CategoriesFixtures } = require('../fixtures/categories-fixtures');
const { ProductsFixtures } = require('../fixtures/products-fixtures');

let DRIVERS = ['objection-js', 'mikro-orm', 'prisma'];

for(let driverName of DRIVERS){
    describe('Driver: '+driverName, () => {
        let dataServer;
        let categoriesRepo;
        let productsRepo;
        let reviewsRepo;
        let schemaPath = FileHandler.joinPaths(__dirname, '..', 'fixtures', 'sql', 'test-schema.sql');
        before(async function(){
            let result = await TestHelpers.setupIntegrationTest(driverName, schemaPath, ['testCategories', 'testProducts', 'testReviews']);
            dataServer = result.dataServer;
            categoriesRepo = result.repos.testCategories;
            productsRepo = result.repos.testProducts;
            reviewsRepo = result.repos.testReviews;
        }, {timeout: 60000});
        beforeEach(async () => {
            await TestHelpers.cleanDatabase(dataServer);
        });
        after(async () => {
            await TestHelpers.teardownIntegrationTest(dataServer);
        });
        describe('CREATE Operations', () => {
            it('should create single record', async () => {
                try {
                    let categoryData = CategoriesFixtures[driverName].category1;
                    let created = await categoriesRepo.create(categoryData);
                    assert.ok(created);
                    assert.strictEqual(created.id, categoryData.id);
                    assert.strictEqual(created.name, categoryData.name);
                } catch(error) {
                    process.stderr.write('CREATE single record failed for '+driverName+': '+error.message+'\n');
                    process.stderr.write(error.stack+'\n');
                    throw error;
                }
            });
            it('should create record with JSON field', async () => {
                let categoryData = CategoriesFixtures[driverName].category1;
                await categoriesRepo.create(categoryData);
                let productData = ProductsFixtures[driverName].product1;
                let created = await productsRepo.create(productData);
                assert.ok(created);
                assert.ok(created.metadata);
            });
            it('should create record with ENUM field', async () => {
                let categoryData = CategoriesFixtures[driverName].category1;
                await categoriesRepo.create(categoryData);
                let productData = ProductsFixtures[driverName].product1;
                let created = await productsRepo.create(productData);
                assert.ok(created);
                assert.strictEqual(created.status, 'published');
            });
            it('should enforce UNIQUE constraints', async () => {
                let categoryData = CategoriesFixtures[driverName].category1;
                await categoriesRepo.create(categoryData);
                await assert.rejects(async () => {
                    await categoriesRepo.create(categoryData);
                });
            });
            it('should enforce FOREIGN KEY constraints', async () => {
                let productData = ProductsFixtures[driverName].product1;
                await assert.rejects(async () => {
                    await productsRepo.create(productData);
                });
            });
        });
        describe('UPDATE Operations', () => {
            it('should update record by ID', async () => {
                let categoryData = CategoriesFixtures[driverName].category1;
                await categoriesRepo.create(categoryData);
                let updated = await categoriesRepo.updateById(categoryData.id, {name: 'Updated Name'});
                assert.ok(updated);
                let loaded = await categoriesRepo.loadById(categoryData.id);
                assert.strictEqual(loaded.name, 'Updated Name');
            });
            it('should update record by filters', async () => {
                let categoryData = CategoriesFixtures[driverName].category1;
                await categoriesRepo.create(categoryData);
                let updated = await categoriesRepo.update({slug: categoryData.slug}, {display_order: 10});
                assert.ok(updated);
                let loaded = await categoriesRepo.loadById(categoryData.id);
                assert.strictEqual(loaded.display_order, 10);
            });
            it('should update record by single field', async () => {
                let categoryData = CategoriesFixtures[driverName].category1;
                await categoriesRepo.create(categoryData);
                let updated = await categoriesRepo.updateBy('slug', categoryData.slug, {is_active: 0});
                assert.ok(updated);
                let loaded = await categoriesRepo.loadById(categoryData.id);
                assert.strictEqual(loaded.is_active, 0);
            });
            it('should upsert when record does not exist', async () => {
                let categoryData = CategoriesFixtures[driverName].category1;
                await categoriesRepo.upsert(categoryData, {id: categoryData.id});
                let loaded = await categoriesRepo.loadById(categoryData.id);
                assert.ok(loaded);
                assert.strictEqual(loaded.id, categoryData.id);
                assert.strictEqual(loaded.name, categoryData.name);
            });
            it('should upsert when record exists', async () => {
                let categoryData = CategoriesFixtures[driverName].category1;
                await categoriesRepo.create(categoryData);
                categoryData.name = 'Upserted Name';
                await categoriesRepo.upsert(categoryData, {id: categoryData.id});
                let loaded = await categoriesRepo.loadById(categoryData.id);
                assert.ok(loaded);
                assert.strictEqual(loaded.name, 'Upserted Name');
            });
        });
        describe('QUERY Operations', () => {
            beforeEach(async () => {
                let cat1 = CategoriesFixtures[driverName].category1;
                let cat2 = CategoriesFixtures[driverName].category2;
                let cat3 = CategoriesFixtures[driverName].category3;
                await categoriesRepo.create(cat1);
                await categoriesRepo.create(cat2);
                await categoriesRepo.create(cat3);
            });
            afterEach(() => {
                categoriesRepo.limit = 0;
                categoriesRepo.offset = 0;
                categoriesRepo.sortBy = null;
                categoriesRepo.sortDirection = 'ASC';
            });
            it('should load all records', async () => {
                let all = await categoriesRepo.loadAll();
                assert.strictEqual(all.length, 3);
            });
            it('should load records by filters', async () => {
                let active = await categoriesRepo.load({is_active: 1});
                assert.strictEqual(active.length, 2);
            });
            it('should load records by single field', async () => {
                let cat1 = CategoriesFixtures[driverName].category1;
                let result = await categoriesRepo.loadBy('slug', cat1.slug);
                assert.ok(result.length > 0);
                assert.strictEqual(result[0].slug, cat1.slug);
            });
            it('should load record by ID', async () => {
                let cat1 = CategoriesFixtures[driverName].category1;
                let loaded = await categoriesRepo.loadById(cat1.id);
                assert.ok(loaded);
                assert.strictEqual(loaded.id, cat1.id);
            });
            it('should load records by multiple IDs', async () => {
                let cat1 = CategoriesFixtures[driverName].category1;
                let cat2 = CategoriesFixtures[driverName].category2;
                let results = await categoriesRepo.loadByIds([cat1.id, cat2.id]);
                assert.strictEqual(results.length, 2);
            });
            it('should load one record', async () => {
                let one = await categoriesRepo.loadOne({is_active: 1});
                assert.ok(one);
                assert.strictEqual(one.is_active, 1);
            });
            it('should load one record by field', async () => {
                let cat1 = CategoriesFixtures[driverName].category1;
                let result = await categoriesRepo.loadOneBy('slug', cat1.slug);
                assert.ok(result);
                assert.strictEqual(result.slug, cat1.slug);
            });
            it('should count records with filters', async () => {
                let count = await categoriesRepo.count({is_active: 1});
                assert.strictEqual(count, 2);
            });
            it('should apply limit', async () => {
                categoriesRepo.limit = 2;
                let results = await categoriesRepo.load({});
                assert.strictEqual(results.length, 2);
            });
            it('should apply offset', async () => {
                categoriesRepo.limit = 2;
                categoriesRepo.offset = 1;
                let results = await categoriesRepo.load({});
                assert.strictEqual(results.length, 2);
            });
            it('should apply sortBy and sortDirection', async () => {
                categoriesRepo.sortBy = 'display_order';
                categoriesRepo.sortDirection = 'ASC';
                let results = await categoriesRepo.loadAll();
                assert.strictEqual(results[0].display_order, 1);
            });
        });
        describe('DELETE Operations', () => {
            beforeEach(async () => {
                let cat1 = CategoriesFixtures[driverName].category1;
                let cat2 = CategoriesFixtures[driverName].category2;
                await categoriesRepo.create(cat1);
                await categoriesRepo.create(cat2);
            });
            it('should delete record by ID', async () => {
                let cat1 = CategoriesFixtures[driverName].category1;
                let deleted = await categoriesRepo.deleteById(cat1.id);
                assert.ok(deleted);
                let loaded = await categoriesRepo.loadById(cat1.id);
                assert.ok(!loaded);
            });
            it('should delete records by filters', async () => {
                let deleted = await categoriesRepo.delete({is_active: 1});
                assert.ok(deleted);
                let remaining = await categoriesRepo.loadAll();
                assert.strictEqual(remaining.length, 0);
            });
        });
    });
}
