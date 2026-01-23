/**
 *
 * Reldens - Relations Test
 * Tests relation loading across all three storage drivers
 *
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
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
    }

    run()
    {
        describe('Relations - Driver: '+this.driverName, () => {
            beforeEach(async () => {
                await TestHelpers.cleanDatabase(this.dataServer);
            });
        describe('loadWithRelations', () => {
            beforeEach(async () => {
                let cat1 = CategoriesFixtures[this.driverName].category1;
                await this.categoriesRepo.create(cat1);
                let prod1 = ProductsFixtures[this.driverName].product1;
                await this.productsRepo.create(prod1);
                let rev1 = ReviewsFixtures[this.driverName].review1;
                await this.reviewsRepo.create(rev1);
            });
            it('should load records with single relation', async () => {
                let cat1 = CategoriesFixtures[this.driverName].category1;
                let results = await this.categoriesRepo.loadWithRelations({id: cat1.id}, ['related_products']);
                assert.ok(results);
                assert.ok(results.length > 0);
                let category = results[0];
                assert.ok(category.related_products);
                assert.ok(Array.isArray(category.related_products));
                assert.strictEqual(category.related_products.length, 1);
            });
            it('should load records with multiple relations', async () => {
                let prod1 = ProductsFixtures[this.driverName].product1;
                let results = await this.productsRepo.loadWithRelations(
                    {id: prod1.id},
                    ['related_categories', 'related_reviews']
                );
                assert.ok(results);
                assert.ok(results.length > 0);
                let product = results[0];
                assert.ok(product.related_categories);
                assert.ok(product.related_reviews);
                assert.ok(Array.isArray(product.related_reviews));
            });
            it('should load with empty filters', async () => {
                let results = await this.categoriesRepo.loadWithRelations({}, ['related_products']);
                assert.ok(results);
                assert.strictEqual(results.length, 1);
            });
        });
        describe('loadAllWithRelations', () => {
            beforeEach(async () => {
                let cat1 = CategoriesFixtures[this.driverName].category1;
                let cat2 = CategoriesFixtures[this.driverName].category2;
                await this.categoriesRepo.create(cat1);
                await this.categoriesRepo.create(cat2);
                let prod1 = ProductsFixtures[this.driverName].product1;
                let prod2 = ProductsFixtures[this.driverName].product2;
                await this.productsRepo.create(prod1);
                await this.productsRepo.create(prod2);
            });
            it('should load all records with relations', async () => {
                let results = await this.categoriesRepo.loadAllWithRelations(['related_products']);
                assert.ok(results);
                assert.strictEqual(results.length, 2);
                for(let category of results){
                    assert.ok(category.related_products);
                    assert.ok(Array.isArray(category.related_products));
                }
            });
            it('should respect limit with relations', async () => {
                this.categoriesRepo.limit = 1;
                let results = await this.categoriesRepo.loadAllWithRelations(['related_products']);
                assert.strictEqual(results.length, 1);
                assert.ok(results[0].related_products);
            });
            it('should respect sortBy with relations', async () => {
                this.categoriesRepo.sortBy = 'name';
                this.categoriesRepo.sortDirection = 'DESC';
                let results = await this.categoriesRepo.loadAllWithRelations(['related_products']);
                assert.ok(results.length > 0);
                assert.ok(results[0].related_products);
            });
        });
        describe('loadByWithRelations', () => {
            beforeEach(async () => {
                let cat1 = CategoriesFixtures[this.driverName].category1;
                await this.categoriesRepo.create(cat1);
                let prod1 = ProductsFixtures[this.driverName].product1;
                await this.productsRepo.create(prod1);
            });
            it('should load records by field with relations', async () => {
                let cat1 = CategoriesFixtures[this.driverName].category1;
                let results = await this.categoriesRepo.loadByWithRelations('slug', cat1.slug, ['related_products']);
                assert.ok(results);
                assert.ok(results.length > 0);
                let category = results[0];
                assert.strictEqual(category.slug, cat1.slug);
                assert.ok(category.related_products);
                assert.ok(Array.isArray(category.related_products));
            });
            it('should return empty array when no match with relations', async () => {
                let results = await this.categoriesRepo.loadByWithRelations('slug', 'nonexistent', ['related_products']);
                assert.ok(results);
                assert.strictEqual(results.length, 0);
            });
        });
        describe('loadByIdWithRelations', () => {
            beforeEach(async () => {
                let cat1 = CategoriesFixtures[this.driverName].category1;
                await this.categoriesRepo.create(cat1);
                let prod1 = ProductsFixtures[this.driverName].product1;
                let prod2 = ProductsFixtures[this.driverName].product2;
                await this.productsRepo.create(prod1);
                await this.productsRepo.create(prod2);
            });
            it('should load single record by ID with relations', async () => {
                let cat1 = CategoriesFixtures[this.driverName].category1;
                let result = await this.categoriesRepo.loadByIdWithRelations(cat1.id, ['related_products']);
                assert.ok(result);
                assert.strictEqual(result.id, cat1.id);
                assert.ok(result.related_products);
                assert.ok(Array.isArray(result.related_products));
                assert.strictEqual(result.related_products.length, 2);
            });
            it('should return null when ID not found with relations', async () => {
                let result = await this.categoriesRepo.loadByIdWithRelations(99999, ['related_products']);
                assert.ok(!result);
            });
        });
        describe('loadOneWithRelations', () => {
            beforeEach(async () => {
                let cat1 = CategoriesFixtures[this.driverName].category1;
                let cat2 = CategoriesFixtures[this.driverName].category2;
                await this.categoriesRepo.create(cat1);
                await this.categoriesRepo.create(cat2);
                let prod1 = ProductsFixtures[this.driverName].product1;
                await this.productsRepo.create(prod1);
            });
            it('should load one record with relations', async () => {
                let result = await this.categoriesRepo.loadOneWithRelations({is_active: 1}, ['related_products']);
                assert.ok(result);
                assert.strictEqual(result.is_active, 1);
                assert.ok(result.related_products);
                assert.ok(Array.isArray(result.related_products));
            });
            it('should return null when no match with relations', async () => {
                let result = await this.categoriesRepo.loadOneWithRelations({slug: 'nonexistent'}, ['related_products']);
                assert.ok(!result);
            });
        });
        describe('loadOneByWithRelations', () => {
            beforeEach(async () => {
                let cat1 = CategoriesFixtures[this.driverName].category1;
                await this.categoriesRepo.create(cat1);
                let prod1 = ProductsFixtures[this.driverName].product1;
                await this.productsRepo.create(prod1);
            });
            it('should load one record by field with relations', async () => {
                let cat1 = CategoriesFixtures[this.driverName].category1;
                let result = await this.categoriesRepo.loadOneByWithRelations('slug', cat1.slug, ['related_products']);
                assert.ok(result);
                assert.strictEqual(result.slug, cat1.slug);
                assert.ok(result.related_products);
                assert.ok(Array.isArray(result.related_products));
            });
            it('should return null when no match by field with relations', async () => {
                let result = await this.categoriesRepo.loadOneByWithRelations('slug', 'nonexistent', ['related_products']);
                assert.ok(!result);
            });
        });
        describe('countWithRelations', () => {
            beforeEach(async () => {
                let cat1 = CategoriesFixtures[this.driverName].category1;
                let cat2 = CategoriesFixtures[this.driverName].category2;
                let cat3 = CategoriesFixtures[this.driverName].category3;
                await this.categoriesRepo.create(cat1);
                await this.categoriesRepo.create(cat2);
                await this.categoriesRepo.create(cat3);
                let prod1 = ProductsFixtures[this.driverName].product1;
                await this.productsRepo.create(prod1);
            });
            it('should count records with relation filter', async () => {
                let count = await this.categoriesRepo.countWithRelations({is_active: 1}, ['related_products']);
                assert.strictEqual(count, 2);
            });
            it('should count all records with relations', async () => {
                let count = await this.categoriesRepo.countWithRelations({}, ['related_products']);
                assert.strictEqual(count, 3);
            });
        });
        describe('createWithRelations', () => {
            it('should create record with nested relations', async () => {
                let cat1 = CategoriesFixtures[this.driverName].category1;
                let prod1 = ProductsFixtures[this.driverName].product1;
                let categoryWithProducts = {
                    ...cat1,
                    related_products: [prod1]
                };
                let created = await this.categoriesRepo.createWithRelations(categoryWithProducts, ['related_products']);
                assert.ok(created);
                assert.strictEqual(created.id, cat1.id);
                let loaded = await this.categoriesRepo.loadByIdWithRelations(cat1.id, ['related_products']);
                assert.ok(loaded);
                assert.ok(loaded.related_products);
                assert.ok(loaded.related_products.length > 0);
            });
            it('should create record without relations when not provided', async () => {
                let cat1 = CategoriesFixtures[this.driverName].category1;
                let created = await this.categoriesRepo.createWithRelations(cat1, ['related_products']);
                assert.ok(created);
                assert.strictEqual(created.id, cat1.id);
            });
        });
        describe('Nested Relations', () => {
            beforeEach(async () => {
                let cat1 = CategoriesFixtures[this.driverName].category1;
                await this.categoriesRepo.create(cat1);
                let prod1 = ProductsFixtures[this.driverName].product1;
                await this.productsRepo.create(prod1);
                let rev1 = ReviewsFixtures[this.driverName].review1;
                await this.reviewsRepo.create(rev1);
            });
            it('should load nested relations (category > products > reviews)', async () => {
                let cat1 = CategoriesFixtures[this.driverName].category1;
                let results = await this.categoriesRepo.loadWithRelations(
                    {id: cat1.id},
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
        });
        describe('Relation String Parsing', () => {
            it('should parse comma-separated relations string', async () => {
                let cat1 = CategoriesFixtures[this.driverName].category1;
                await this.categoriesRepo.create(cat1);
                let prod1 = ProductsFixtures[this.driverName].product1;
                await this.productsRepo.create(prod1);
                let results = await this.productsRepo.loadWithRelations(
                    {id: prod1.id},
                    'related_categories,related_reviews'
                );
                assert.ok(results);
                assert.ok(results.length > 0);
            });
            it('should handle single relation as string', async () => {
                let cat1 = CategoriesFixtures[this.driverName].category1;
                await this.categoriesRepo.create(cat1);
                let prod1 = ProductsFixtures[this.driverName].product1;
                await this.productsRepo.create(prod1);
                let results = await this.productsRepo.loadWithRelations(
                    {id: prod1.id},
                    'related_categories'
                );
                assert.ok(results);
                assert.ok(results.length > 0);
                assert.ok(results[0].related_categories);
            });
        });
        });
    }

}

module.exports = RelationsTest;
