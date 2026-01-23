/**
 *
 * Reldens - Nested Filters Integration Test
 * Tests complex filter syntax across all three storage drivers with actual database
 *
 */

const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert');
const { FileHandler } = require('@reldens/server-utils');
const { TestHelpers } = require('../utils/test-helpers');
const { CategoriesFixtures } = require('../fixtures/categories-fixtures');
const { ProductsFixtures } = require('../fixtures/products-fixtures');

let DRIVERS = ['objection-js', 'mikro-orm', 'prisma'];

for(let driverName of DRIVERS){
    describe('Nested Filters - Driver: '+driverName, () => {
        let dataServer;
        let categoriesRepo;
        let productsRepo;
        let schemaPath = FileHandler.joinPaths(__dirname, '..', 'fixtures', 'sql', 'test-schema.sql');
        before(async function(){
            let result = await TestHelpers.setupIntegrationTest(driverName, schemaPath, ['testCategories', 'testProducts']);
            dataServer = result.dataServer;
            categoriesRepo = result.repos.testCategories;
            productsRepo = result.repos.testProducts;
        }, {timeout: 60000});
        beforeEach(async () => {
            await TestHelpers.cleanDatabase(dataServer);
        });
        after(async () => {
            await TestHelpers.teardownIntegrationTest(dataServer);
        });
        describe('AND Operator', () => {
            beforeEach(async () => {
                let cat1 = CategoriesFixtures[driverName].category1;
                let cat2 = CategoriesFixtures[driverName].category2;
                let cat3 = CategoriesFixtures[driverName].category3;
                await categoriesRepo.create(cat1);
                await categoriesRepo.create(cat2);
                await categoriesRepo.create(cat3);
            });
            it('should filter with simple AND condition', async () => {
                let results = await categoriesRepo.load({
                    AND: [
                        {is_active: 1},
                        {display_order: 1}
                    ]
                });
                assert.ok(results);
                assert.strictEqual(results.length, 1);
                assert.strictEqual(results[0].display_order, 1);
                assert.strictEqual(results[0].is_active, 1);
            });
            it('should filter with AND containing multiple conditions', async () => {
                let results = await categoriesRepo.load({
                    AND: [
                        {is_active: 1},
                        {display_order: {operator: 'gte', value: 1}}
                    ]
                });
                assert.ok(results);
                assert.strictEqual(results.length, 2);
            });
            it('should return empty when AND conditions do not match', async () => {
                let results = await categoriesRepo.load({
                    AND: [
                        {is_active: 1},
                        {slug: 'nonexistent'}
                    ]
                });
                assert.ok(results);
                assert.strictEqual(results.length, 0);
            });
        });
        describe('OR Operator', () => {
            beforeEach(async () => {
                let cat1 = CategoriesFixtures[driverName].category1;
                let cat2 = CategoriesFixtures[driverName].category2;
                let cat3 = CategoriesFixtures[driverName].category3;
                await categoriesRepo.create(cat1);
                await categoriesRepo.create(cat2);
                await categoriesRepo.create(cat3);
            });
            it('should filter with simple OR condition', async () => {
                let cat1 = CategoriesFixtures[driverName].category1;
                let cat2 = CategoriesFixtures[driverName].category2;
                let results = await categoriesRepo.load({
                    OR: [
                        {slug: cat1.slug},
                        {slug: cat2.slug}
                    ]
                });
                assert.ok(results);
                assert.strictEqual(results.length, 2);
            });
            it('should filter with OR containing operator conditions', async () => {
                let results = await categoriesRepo.load({
                    OR: [
                        {display_order: {operator: 'lt', value: 2}},
                        {is_active: 0}
                    ]
                });
                assert.ok(results);
                assert.strictEqual(results.length, 2);
            });
            it('should return all matching records with OR', async () => {
                let results = await categoriesRepo.load({
                    OR: [
                        {is_active: 1},
                        {is_active: 0}
                    ]
                });
                assert.ok(results);
                assert.strictEqual(results.length, 3);
            });
        });
        describe('Nested AND/OR', () => {
            beforeEach(async () => {
                let cat1 = CategoriesFixtures[driverName].category1;
                let cat2 = CategoriesFixtures[driverName].category2;
                let cat3 = CategoriesFixtures[driverName].category3;
                await categoriesRepo.create(cat1);
                await categoriesRepo.create(cat2);
                await categoriesRepo.create(cat3);
            });
            it('should filter with OR inside AND', async () => {
                let results = await categoriesRepo.load({
                    AND: [
                        {is_active: 1},
                        {
                            OR: [
                                {display_order: 1},
                                {display_order: 2}
                            ]
                        }
                    ]
                });
                assert.ok(results);
                assert.strictEqual(results.length, 2);
            });
            it('should filter with AND inside OR', async () => {
                let results = await categoriesRepo.load({
                    OR: [
                        {
                            AND: [
                                {is_active: 1},
                                {display_order: 1}
                            ]
                        },
                        {is_active: 0}
                    ]
                });
                assert.ok(results);
                assert.strictEqual(results.length, 2);
            });
            it('should handle deep nesting of AND/OR', async () => {
                let results = await categoriesRepo.load({
                    AND: [
                        {
                            OR: [
                                {display_order: 1},
                                {display_order: 2}
                            ]
                        },
                        {
                            OR: [
                                {is_active: 1},
                                {is_active: 0}
                            ]
                        }
                    ]
                });
                assert.ok(results);
                assert.strictEqual(results.length, 3);
            });
        });
        describe('NOT Operator', () => {
            beforeEach(async () => {
                let cat1 = CategoriesFixtures[driverName].category1;
                let cat2 = CategoriesFixtures[driverName].category2;
                let cat3 = CategoriesFixtures[driverName].category3;
                await categoriesRepo.create(cat1);
                await categoriesRepo.create(cat2);
                await categoriesRepo.create(cat3);
            });
            it('should filter with NOT operator', async () => {
                let results = await categoriesRepo.load({
                    is_active: {operator: 'not', value: 0}
                });
                assert.ok(results);
                assert.strictEqual(results.length, 2);
                for(let category of results){
                    assert.strictEqual(category.is_active, 1);
                }
            });
            it('should filter with NOT inside AND', async () => {
                let results = await categoriesRepo.load({
                    AND: [
                        {is_active: {operator: 'not', value: 0}},
                        {display_order: 1}
                    ]
                });
                assert.ok(results);
                assert.strictEqual(results.length, 1);
            });
        });
        describe('IN Operator', () => {
            beforeEach(async () => {
                let cat1 = CategoriesFixtures[driverName].category1;
                let cat2 = CategoriesFixtures[driverName].category2;
                let cat3 = CategoriesFixtures[driverName].category3;
                await categoriesRepo.create(cat1);
                await categoriesRepo.create(cat2);
                await categoriesRepo.create(cat3);
            });
            it('should filter with IN operator', async () => {
                let results = await categoriesRepo.load({
                    display_order: {operator: 'in', value: [1, 2]}
                });
                assert.ok(results);
                assert.strictEqual(results.length, 2);
            });
            it('should filter with IN operator on string field', async () => {
                let cat1 = CategoriesFixtures[driverName].category1;
                let cat2 = CategoriesFixtures[driverName].category2;
                let results = await categoriesRepo.load({
                    slug: {operator: 'in', value: [cat1.slug, cat2.slug]}
                });
                assert.ok(results);
                assert.strictEqual(results.length, 2);
            });
            it('should return empty with IN operator when no match', async () => {
                let results = await categoriesRepo.load({
                    display_order: {operator: 'in', value: [99, 100]}
                });
                assert.ok(results);
                assert.strictEqual(results.length, 0);
            });
        });
        describe('LIKE Operator', () => {
            beforeEach(async () => {
                let cat1 = CategoriesFixtures[driverName].category1;
                let cat2 = CategoriesFixtures[driverName].category2;
                await categoriesRepo.create(cat1);
                await categoriesRepo.create(cat2);
            });
            it('should filter with LIKE operator', async () => {
                let results = await categoriesRepo.load({
                    name: {operator: 'like', value: '%Electronics%'}
                });
                assert.ok(results);
                assert.ok(results.length > 0);
                assert.ok(results[0].name.includes('Electronics'));
            });
            it('should filter with LIKE and wildcards', async () => {
                let results = await categoriesRepo.load({
                    slug: {operator: 'like', value: '%elec%'}
                });
                assert.ok(results);
                assert.ok(results.length > 0);
            });
            it('should work with LIKE inside AND', async () => {
                let results = await categoriesRepo.load({
                    AND: [
                        {is_active: 1},
                        {name: {operator: 'like', value: '%Electronics%'}}
                    ]
                });
                assert.ok(results);
                assert.ok(results.length > 0);
            });
        });
        describe('Comparison Operators', () => {
            beforeEach(async () => {
                let cat1 = CategoriesFixtures[driverName].category1;
                let cat2 = CategoriesFixtures[driverName].category2;
                let cat3 = CategoriesFixtures[driverName].category3;
                await categoriesRepo.create(cat1);
                await categoriesRepo.create(cat2);
                await categoriesRepo.create(cat3);
            });
            it('should filter with gt operator', async () => {
                let results = await categoriesRepo.load({
                    display_order: {operator: 'gt', value: 1}
                });
                assert.ok(results);
                assert.strictEqual(results.length, 2);
            });
            it('should filter with gte operator', async () => {
                let results = await categoriesRepo.load({
                    display_order: {operator: 'gte', value: 2}
                });
                assert.ok(results);
                assert.strictEqual(results.length, 2);
            });
            it('should filter with lt operator', async () => {
                let results = await categoriesRepo.load({
                    display_order: {operator: 'lt', value: 3}
                });
                assert.ok(results);
                assert.strictEqual(results.length, 2);
            });
            it('should filter with lte operator', async () => {
                let results = await categoriesRepo.load({
                    display_order: {operator: 'lte', value: 2}
                });
                assert.ok(results);
                assert.strictEqual(results.length, 2);
            });
        });
        describe('Complex Nested Scenarios', () => {
            beforeEach(async () => {
                let cat1 = CategoriesFixtures[driverName].category1;
                await categoriesRepo.create(cat1);
                let prod1 = ProductsFixtures[driverName].product1;
                let prod2 = ProductsFixtures[driverName].product2;
                await productsRepo.create(prod1);
                await productsRepo.create(prod2);
            });
            it('should handle complex filter with multiple operators', async () => {
                let results = await productsRepo.load({
                    AND: [
                        {status: 'published'},
                        {
                            OR: [
                                {price: {operator: 'lt', value: 1000}},
                                {stock_quantity: {operator: 'gte', value: 50}}
                            ]
                        }
                    ]
                });
                assert.ok(results);
                assert.ok(results.length > 0);
            });
            it('should handle filter with IN inside OR', async () => {
                let results = await productsRepo.load({
                    OR: [
                        {status: {operator: 'in', value: ['published', 'draft']}},
                        {stock_quantity: {operator: 'gt', value: 0}}
                    ]
                });
                assert.ok(results);
                assert.strictEqual(results.length, 2);
            });
            it('should handle nested AND/OR with LIKE and comparison operators', async () => {
                let results = await productsRepo.load({
                    AND: [
                        {
                            OR: [
                                {name: {operator: 'like', value: '%Phone%'}},
                                {name: {operator: 'like', value: '%Laptop%'}}
                            ]
                        },
                        {price: {operator: 'gte', value: 0}}
                    ]
                });
                assert.ok(results);
                assert.ok(results.length > 0);
            });
        });
        describe('Edge Cases', () => {
            beforeEach(async () => {
                let cat1 = CategoriesFixtures[driverName].category1;
                await categoriesRepo.create(cat1);
            });
            it('should handle empty AND array', async () => {
                let results = await categoriesRepo.load({AND: []});
                assert.ok(results);
            });
            it('should handle empty OR array', async () => {
                let results = await categoriesRepo.load({OR: []});
                assert.ok(results);
            });
            it('should handle single condition in AND', async () => {
                let results = await categoriesRepo.load({
                    AND: [{is_active: 1}]
                });
                assert.ok(results);
                assert.strictEqual(results.length, 1);
            });
            it('should handle single condition in OR', async () => {
                let results = await categoriesRepo.load({
                    OR: [{is_active: 1}]
                });
                assert.ok(results);
                assert.strictEqual(results.length, 1);
            });
        });
    });
}
