/**
 *
 * Reldens - Drivers Integration Test
 * Tests CRUD operations across all three storage drivers
 *
 */

const { describe, it, before, beforeEach, after, afterEach } = require('node:test');
const assert = require('node:assert');
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
    }

    run()
    {
        let counter = 0;
        let errors = 0;
        return new Promise((resolve) => {
            describe('Driver: '+this.driverName, () => {
                describe('CREATE Operations', () => {
                    before(async () => {
                        await TestHelpers.cleanDatabase(this.dataServer);
                    });
                it('should create single record', async () => {
                    try {
                        let categoryData = CategoriesFixtures[this.driverName].category1;
                        let created = await this.categoriesRepo.create(categoryData);
                        assert.ok(created);
                        assert.strictEqual(created.id, categoryData.id);
                        assert.strictEqual(created.name, categoryData.name);
                        counter++;
                    } catch(error) {
                        process.stderr.write('CREATE single record failed for '+this.driverName+': '+error.message+'\n');
                        process.stderr.write(error.stack+'\n');
                        errors++;
                        throw error;
                    }
                });
                it('should create record with JSON field', async () => {
                    try {
                        let categoryData = CategoriesFixtures[this.driverName].category1;
                        await this.categoriesRepo.create(categoryData);
                        let productData = ProductsFixtures[this.driverName].product1;
                        let created = await this.productsRepo.create(productData);
                        assert.ok(created);
                        assert.ok(created.metadata);
                        counter++;
                    } catch(error) {
                        errors++;
                        throw error;
                    }
                });
                it('should create record with ENUM field', async () => {
                    try {
                        let categoryData = CategoriesFixtures[this.driverName].category1;
                        await this.categoriesRepo.create(categoryData);
                        let productData = ProductsFixtures[this.driverName].product1;
                        let created = await this.productsRepo.create(productData);
                        assert.ok(created);
                        assert.strictEqual(created.status, 'published');
                        counter++;
                    } catch(error) {
                        errors++;
                        throw error;
                    }
                });
                it('should enforce UNIQUE constraints', async () => {
                    try {
                        let categoryData = CategoriesFixtures[this.driverName].category1;
                        await this.categoriesRepo.create(categoryData);
                        await assert.rejects(async () => {
                            await this.categoriesRepo.create(categoryData);
                        });
                        counter++;
                    } catch(error) {
                        errors++;
                        throw error;
                    }
                });
                it('should enforce FOREIGN KEY constraints', async () => {
                    try {
                        let productData = ProductsFixtures[this.driverName].product1;
                        await assert.rejects(async () => {
                            await this.productsRepo.create(productData);
                        });
                        counter++;
                    } catch(error) {
                        errors++;
                        throw error;
                    }
                });
            });
            describe('UPDATE Operations', () => {
                beforeEach(async () => {
                    await TestHelpers.cleanDatabase(this.dataServer);
                });
                it('should update record by ID', async () => {
                    try {
                        let categoryData = CategoriesFixtures[this.driverName].category1;
                        await this.categoriesRepo.create(categoryData);
                        let updated = await this.categoriesRepo.updateById(categoryData.id, {name: 'Updated Name'});
                        assert.ok(updated);
                        let loaded = await this.categoriesRepo.loadById(categoryData.id);
                        assert.strictEqual(loaded.name, 'Updated Name');
                        counter++;
                    } catch(error) {
                        errors++;
                        throw error;
                    }
                });
                it('should update record by filters', async () => {
                    try {
                        let categoryData = CategoriesFixtures[this.driverName].category1;
                        await this.categoriesRepo.create(categoryData);
                        let updated = await this.categoriesRepo.update({slug: categoryData.slug}, {display_order: 10});
                        assert.ok(updated);
                        let loaded = await this.categoriesRepo.loadById(categoryData.id);
                        assert.strictEqual(loaded.display_order, 10);
                        counter++;
                    } catch(error) {
                        errors++;
                        throw error;
                    }
                });
                it('should update record by single field', async () => {
                    try {
                        let categoryData = CategoriesFixtures[this.driverName].category1;
                        await this.categoriesRepo.create(categoryData);
                        let updated = await this.categoriesRepo.updateBy('slug', categoryData.slug, {is_active: 0});
                        assert.ok(updated);
                        let loaded = await this.categoriesRepo.loadById(categoryData.id);
                        assert.strictEqual(loaded.is_active, 0);
                        counter++;
                    } catch(error) {
                        errors++;
                        throw error;
                    }
                });
                it('should upsert when record does not exist', async () => {
                    try {
                        let categoryData = CategoriesFixtures[this.driverName].category1;
                        await this.categoriesRepo.upsert(categoryData, {id: categoryData.id});
                        let loaded = await this.categoriesRepo.loadById(categoryData.id);
                        assert.ok(loaded);
                        assert.strictEqual(loaded.id, categoryData.id);
                        assert.strictEqual(loaded.name, categoryData.name);
                        counter++;
                    } catch(error) {
                        errors++;
                        throw error;
                    }
                });
                it('should upsert when record exists', async () => {
                    try {
                        let categoryData = CategoriesFixtures[this.driverName].category1;
                        await this.categoriesRepo.create(categoryData);
                        categoryData.name = 'Upserted Name';
                        await this.categoriesRepo.upsert(categoryData, {id: categoryData.id});
                        let loaded = await this.categoriesRepo.loadById(categoryData.id);
                        assert.ok(loaded);
                        assert.strictEqual(loaded.name, 'Upserted Name');
                        counter++;
                    } catch(error) {
                        errors++;
                        throw error;
                    }
                });
            });
            describe('QUERY Operations', () => {
                beforeEach(async () => {
                    await TestHelpers.cleanDatabase(this.dataServer);
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
                    try {
                        let all = await this.categoriesRepo.loadAll();
                        assert.strictEqual(all.length, 3);
                        counter++;
                    } catch(error) {
                        errors++;
                        throw error;
                    }
                });
                it('should load records by filters', async () => {
                    try {
                        let active = await this.categoriesRepo.load({is_active: 1});
                        assert.strictEqual(active.length, 2);
                        counter++;
                    } catch(error) {
                        errors++;
                        throw error;
                    }
                });
                it('should load records by single field', async () => {
                    try {
                        let cat1 = CategoriesFixtures[this.driverName].category1;
                        let result = await this.categoriesRepo.loadBy('slug', cat1.slug);
                        assert.ok(result.length > 0);
                        assert.strictEqual(result[0].slug, cat1.slug);
                        counter++;
                    } catch(error) {
                        errors++;
                        throw error;
                    }
                });
                it('should load record by ID', async () => {
                    try {
                        let cat1 = CategoriesFixtures[this.driverName].category1;
                        let loaded = await this.categoriesRepo.loadById(cat1.id);
                        assert.ok(loaded);
                        assert.strictEqual(loaded.id, cat1.id);
                        counter++;
                    } catch(error) {
                        errors++;
                        throw error;
                    }
                });
                it('should load records by multiple IDs', async () => {
                    try {
                        let cat1 = CategoriesFixtures[this.driverName].category1;
                        let cat2 = CategoriesFixtures[this.driverName].category2;
                        let results = await this.categoriesRepo.loadByIds([cat1.id, cat2.id]);
                        assert.strictEqual(results.length, 2);
                        counter++;
                    } catch(error) {
                        errors++;
                        throw error;
                    }
                });
                it('should load one record', async () => {
                    try {
                        let one = await this.categoriesRepo.loadOne({is_active: 1});
                        assert.ok(one);
                        assert.strictEqual(one.is_active, 1);
                        counter++;
                    } catch(error) {
                        errors++;
                        throw error;
                    }
                });
                it('should load one record by field', async () => {
                    try {
                        let cat1 = CategoriesFixtures[this.driverName].category1;
                        let result = await this.categoriesRepo.loadOneBy('slug', cat1.slug);
                        assert.ok(result);
                        assert.strictEqual(result.slug, cat1.slug);
                        counter++;
                    } catch(error) {
                        errors++;
                        throw error;
                    }
                });
                it('should count records with filters', async () => {
                    try {
                        let count = await this.categoriesRepo.count({is_active: 1});
                        assert.strictEqual(count, 2);
                        counter++;
                    } catch(error) {
                        errors++;
                        throw error;
                    }
                });
                it('should apply limit', async () => {
                    try {
                        this.categoriesRepo.limit = 2;
                        let results = await this.categoriesRepo.load({});
                        assert.strictEqual(results.length, 2);
                        counter++;
                    } catch(error) {
                        errors++;
                        throw error;
                    }
                });
                it('should apply offset', async () => {
                    try {
                        this.categoriesRepo.limit = 2;
                        this.categoriesRepo.offset = 1;
                        let results = await this.categoriesRepo.load({});
                        assert.strictEqual(results.length, 2);
                        counter++;
                    } catch(error) {
                        errors++;
                        throw error;
                    }
                });
                it('should apply sortBy and sortDirection', async () => {
                    try {
                        this.categoriesRepo.sortBy = 'display_order';
                        this.categoriesRepo.sortDirection = 'ASC';
                        let results = await this.categoriesRepo.loadAll();
                        assert.strictEqual(results[0].display_order, 1);
                        counter++;
                    } catch(error) {
                        errors++;
                        throw error;
                    }
                });
            });
            describe('DELETE Operations', () => {
                beforeEach(async () => {
                    await TestHelpers.cleanDatabase(this.dataServer);
                    let cat1 = CategoriesFixtures[this.driverName].category1;
                    let cat2 = CategoriesFixtures[this.driverName].category2;
                    await this.categoriesRepo.create(cat1);
                    await this.categoriesRepo.create(cat2);
                });
                it('should delete record by ID', async () => {
                    try {
                        let cat1 = CategoriesFixtures[this.driverName].category1;
                        let deleted = await this.categoriesRepo.deleteById(cat1.id);
                        assert.ok(deleted);
                        let loaded = await this.categoriesRepo.loadById(cat1.id);
                        assert.ok(!loaded);
                        counter++;
                    } catch(error) {
                        errors++;
                        throw error;
                    }
                });
                it('should delete records by filters', async () => {
                    try {
                        let deleted = await this.categoriesRepo.delete({is_active: 1});
                        assert.ok(deleted);
                        let remaining = await this.categoriesRepo.loadAll();
                        assert.strictEqual(remaining.length, 0);
                        counter++;
                    } catch(error) {
                        errors++;
                        throw error;
                    }
                });
            });
        });
        describe('REVIEWS CRUD Operations', () => {
            beforeEach(async () => {
                let cat1 = CategoriesFixtures[this.driverName].category1;
                await this.categoriesRepo.create(cat1);
                let prod1 = ProductsFixtures[this.driverName].product1;
                await this.productsRepo.create(prod1);
            });
            it('should create review record', async () => {
                try {
                    let reviewData = ReviewsFixtures[this.driverName].review1;
                    let created = await this.reviewsRepo.create(reviewData);
                    assert.ok(created);
                    assert.strictEqual(created.id, reviewData.id);
                    assert.strictEqual(created.reviewer_name, reviewData.reviewer_name);
                    assert.strictEqual(created.rating, reviewData.rating);
                    counter++;
                } catch(error) {
                    errors++;
                    throw error;
                }
            });
            it('should load review by ID', async () => {
                try {
                    let reviewData = ReviewsFixtures[this.driverName].review1;
                    await this.reviewsRepo.create(reviewData);
                    let loaded = await this.reviewsRepo.loadById(reviewData.id);
                    assert.ok(loaded);
                    assert.strictEqual(loaded.id, reviewData.id);
                    assert.strictEqual(loaded.reviewer_name, reviewData.reviewer_name);
                    counter++;
                } catch(error) {
                    errors++;
                    throw error;
                }
            });
            it('should update review by ID', async () => {
                try {
                    let reviewData = ReviewsFixtures[this.driverName].review1;
                    await this.reviewsRepo.create(reviewData);
                    let updated = await this.reviewsRepo.updateById(reviewData.id, {rating: 3});
                    assert.ok(updated);
                    let loaded = await this.reviewsRepo.loadById(reviewData.id);
                    assert.strictEqual(loaded.rating, 3);
                    counter++;
                } catch(error) {
                    errors++;
                    throw error;
                }
            });
            it('should delete review by ID', async () => {
                try {
                    let reviewData = ReviewsFixtures[this.driverName].review1;
                    await this.reviewsRepo.create(reviewData);
                    let deleted = await this.reviewsRepo.deleteById(reviewData.id);
                    assert.ok(deleted);
                    let loaded = await this.reviewsRepo.loadById(reviewData.id);
                    assert.ok(!loaded);
                    counter++;
                } catch(error) {
                    errors++;
                    throw error;
                }
            });
            it('should load reviews by product_id', async () => {
                try {
                    let rev1 = ReviewsFixtures[this.driverName].review1;
                    let rev2 = ReviewsFixtures[this.driverName].review2;
                    await this.reviewsRepo.create(rev1);
                    await this.reviewsRepo.create(rev2);
                    let results = await this.reviewsRepo.load({product_id: rev1.product_id});
                    assert.ok(results);
                    assert.strictEqual(results.length, 2);
                    counter++;
                } catch(error) {
                    errors++;
                    throw error;
                }
            });
            after(() => {
                resolve({counter, errors});
            });
        });
        });
    }

}

module.exports = DriversTest;
