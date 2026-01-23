/**
 *
 * Reldens - Drivers Integration Test
 * Tests CRUD operations across all three storage drivers
 *
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { TestHelpers } = require('../utils/test-helpers');
const { CategoriesFixtures } = require('../fixtures/categories-fixtures');
const { ProductsFixtures } = require('../fixtures/products-fixtures');

class DriversTest
{

    constructor(dataServer, repos, driverName)
    {
        this.dataServer = dataServer;
        this.categoriesRepo = repos.testCategories;
        this.productsRepo = repos.testProducts;
        this.reviewsRepo = repos.testReviews;
        this.driverName = driverName;
    }

    run()
    {
        describe('Driver: '+this.driverName, () => {
            beforeEach(async () => {
                await TestHelpers.cleanDatabase(this.dataServer);
            });
            describe('CREATE Operations', () => {
                it('should create single record', async () => {
                    try {
                        let categoryData = CategoriesFixtures[this.driverName].category1;
                        let created = await this.categoriesRepo.create(categoryData);
                        assert.ok(created);
                        assert.strictEqual(created.id, categoryData.id);
                        assert.strictEqual(created.name, categoryData.name);
                    } catch(error) {
                        process.stderr.write('CREATE single record failed for '+this.driverName+': '+error.message+'\n');
                        process.stderr.write(error.stack+'\n');
                        throw error;
                    }
                });
                it('should create record with JSON field', async () => {
                    let categoryData = CategoriesFixtures[this.driverName].category1;
                    await this.categoriesRepo.create(categoryData);
                    let productData = ProductsFixtures[this.driverName].product1;
                    let created = await this.productsRepo.create(productData);
                    assert.ok(created);
                    assert.ok(created.metadata);
                });
                it('should create record with ENUM field', async () => {
                    let categoryData = CategoriesFixtures[this.driverName].category1;
                    await this.categoriesRepo.create(categoryData);
                    let productData = ProductsFixtures[this.driverName].product1;
                    let created = await this.productsRepo.create(productData);
                    assert.ok(created);
                    assert.strictEqual(created.status, 'published');
                });
                it('should enforce UNIQUE constraints', async () => {
                    let categoryData = CategoriesFixtures[this.driverName].category1;
                    await this.categoriesRepo.create(categoryData);
                    await assert.rejects(async () => {
                        await this.categoriesRepo.create(categoryData);
                    });
                });
                it('should enforce FOREIGN KEY constraints', async () => {
                    let productData = ProductsFixtures[this.driverName].product1;
                    await assert.rejects(async () => {
                        await this.productsRepo.create(productData);
                    });
                });
            });
            describe('UPDATE Operations', () => {
                it('should update record by ID', async () => {
                    let categoryData = CategoriesFixtures[this.driverName].category1;
                    await this.categoriesRepo.create(categoryData);
                    let updated = await this.categoriesRepo.updateById(categoryData.id, {name: 'Updated Name'});
                    assert.ok(updated);
                    let loaded = await this.categoriesRepo.loadById(categoryData.id);
                    assert.strictEqual(loaded.name, 'Updated Name');
                });
                it('should update record by filters', async () => {
                    let categoryData = CategoriesFixtures[this.driverName].category1;
                    await this.categoriesRepo.create(categoryData);
                    let updated = await this.categoriesRepo.update({slug: categoryData.slug}, {display_order: 10});
                    assert.ok(updated);
                    let loaded = await this.categoriesRepo.loadById(categoryData.id);
                    assert.strictEqual(loaded.display_order, 10);
                });
                it('should update record by single field', async () => {
                    let categoryData = CategoriesFixtures[this.driverName].category1;
                    await this.categoriesRepo.create(categoryData);
                    let updated = await this.categoriesRepo.updateBy('slug', categoryData.slug, {is_active: 0});
                    assert.ok(updated);
                    let loaded = await this.categoriesRepo.loadById(categoryData.id);
                    assert.strictEqual(loaded.is_active, 0);
                });
                it('should upsert when record does not exist', async () => {
                    let categoryData = CategoriesFixtures[this.driverName].category1;
                    await this.categoriesRepo.upsert(categoryData, {id: categoryData.id});
                    let loaded = await this.categoriesRepo.loadById(categoryData.id);
                    assert.ok(loaded);
                    assert.strictEqual(loaded.id, categoryData.id);
                    assert.strictEqual(loaded.name, categoryData.name);
                });
                it('should upsert when record exists', async () => {
                    let categoryData = CategoriesFixtures[this.driverName].category1;
                    await this.categoriesRepo.create(categoryData);
                    categoryData.name = 'Upserted Name';
                    await this.categoriesRepo.upsert(categoryData, {id: categoryData.id});
                    let loaded = await this.categoriesRepo.loadById(categoryData.id);
                    assert.ok(loaded);
                    assert.strictEqual(loaded.name, 'Upserted Name');
                });
            });
            describe('QUERY Operations', () => {
                beforeEach(async () => {
                    let cat1 = CategoriesFixtures[this.driverName].category1;
                    let cat2 = CategoriesFixtures[this.driverName].category2;
                    let cat3 = CategoriesFixtures[this.driverName].category3;
                    await this.categoriesRepo.create(cat1);
                    await this.categoriesRepo.create(cat2);
                    await this.categoriesRepo.create(cat3);
                });
                afterEach(() => {
                    this.categoriesRepo.limit = 0;
                    this.categoriesRepo.offset = 0;
                    this.categoriesRepo.sortBy = null;
                    this.categoriesRepo.sortDirection = 'ASC';
                });
                it('should load all records', async () => {
                    let all = await this.categoriesRepo.loadAll();
                    assert.strictEqual(all.length, 3);
                });
                it('should load records by filters', async () => {
                    let active = await this.categoriesRepo.load({is_active: 1});
                    assert.strictEqual(active.length, 2);
                });
                it('should load records by single field', async () => {
                    let cat1 = CategoriesFixtures[this.driverName].category1;
                    let result = await this.categoriesRepo.loadBy('slug', cat1.slug);
                    assert.ok(result.length > 0);
                    assert.strictEqual(result[0].slug, cat1.slug);
                });
                it('should load record by ID', async () => {
                    let cat1 = CategoriesFixtures[this.driverName].category1;
                    let loaded = await this.categoriesRepo.loadById(cat1.id);
                    assert.ok(loaded);
                    assert.strictEqual(loaded.id, cat1.id);
                });
                it('should load records by multiple IDs', async () => {
                    let cat1 = CategoriesFixtures[this.driverName].category1;
                    let cat2 = CategoriesFixtures[this.driverName].category2;
                    let results = await this.categoriesRepo.loadByIds([cat1.id, cat2.id]);
                    assert.strictEqual(results.length, 2);
                });
                it('should load one record', async () => {
                    let one = await this.categoriesRepo.loadOne({is_active: 1});
                    assert.ok(one);
                    assert.strictEqual(one.is_active, 1);
                });
                it('should load one record by field', async () => {
                    let cat1 = CategoriesFixtures[this.driverName].category1;
                    let result = await this.categoriesRepo.loadOneBy('slug', cat1.slug);
                    assert.ok(result);
                    assert.strictEqual(result.slug, cat1.slug);
                });
                it('should count records with filters', async () => {
                    let count = await this.categoriesRepo.count({is_active: 1});
                    assert.strictEqual(count, 2);
                });
                it('should apply limit', async () => {
                    this.categoriesRepo.limit = 2;
                    let results = await this.categoriesRepo.load({});
                    assert.strictEqual(results.length, 2);
                });
                it('should apply offset', async () => {
                    this.categoriesRepo.limit = 2;
                    this.categoriesRepo.offset = 1;
                    let results = await this.categoriesRepo.load({});
                    assert.strictEqual(results.length, 2);
                });
                it('should apply sortBy and sortDirection', async () => {
                    this.categoriesRepo.sortBy = 'display_order';
                    this.categoriesRepo.sortDirection = 'ASC';
                    let results = await this.categoriesRepo.loadAll();
                    assert.strictEqual(results[0].display_order, 1);
                });
            });
            describe('DELETE Operations', () => {
                beforeEach(async () => {
                    let cat1 = CategoriesFixtures[this.driverName].category1;
                    let cat2 = CategoriesFixtures[this.driverName].category2;
                    await this.categoriesRepo.create(cat1);
                    await this.categoriesRepo.create(cat2);
                });
                it('should delete record by ID', async () => {
                    let cat1 = CategoriesFixtures[this.driverName].category1;
                    let deleted = await this.categoriesRepo.deleteById(cat1.id);
                    assert.ok(deleted);
                    let loaded = await this.categoriesRepo.loadById(cat1.id);
                    assert.ok(!loaded);
                });
                it('should delete records by filters', async () => {
                    let deleted = await this.categoriesRepo.delete({is_active: 1});
                    assert.ok(deleted);
                    let remaining = await this.categoriesRepo.loadAll();
                    assert.strictEqual(remaining.length, 0);
                });
            });
        });
    }

}

module.exports = DriversTest;
