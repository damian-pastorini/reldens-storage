/**
 *
 * Reldens - Nested Filters Integration Test
 * Tests complex filter syntax across all three storage drivers with actual database
 *
 */

const { TestRunner, assert } = require('../utils/test-runner');
const { TestHelpers } = require('../utils/test-helpers');
const { CategoriesFixtures } = require('../fixtures/categories-fixtures');
const { ProductsFixtures } = require('../fixtures/products-fixtures');

class NestedFiltersTest
{

    constructor(dataServer, repos, driverName)
    {
        this.dataServer = dataServer;
        this.categoriesRepo = repos.testCategories;
        this.productsRepo = repos.testProducts;
        this.driverName = driverName;
        this.runner = new TestRunner();
    }

    async run()
    {
        this.runner.suite('Nested Filters - Driver: '+this.driverName);
        await this.testAndOperator();
        await this.testOrOperator();
        await this.testNestedAndOr();
        await this.testNotOperator();
        await this.testInOperator();
        await this.testLikeOperator();
        await this.testComparisonOperators();
        await this.testComplexNestedScenarios();
        await this.testEdgeCases();
        return this.runner.getResults();
    }

    async testAndOperator()
    {
        this.runner.group('AND Operator');
        await TestHelpers.cleanDatabase(this.dataServer);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_categories', [
            CategoriesFixtures.category_filters_1,
            CategoriesFixtures.category_filters_2,
            CategoriesFixtures.category_filters_3
        ]);
        await this.runner.test('should filter with simple AND condition', async () => {
            let results = await this.categoriesRepo.load({
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
        await this.runner.test('should filter with AND containing multiple conditions', async () => {
            let results = await this.categoriesRepo.load({
                AND: [
                    {is_active: 1},
                    {display_order: {operator: 'gte', value: 1}}
                ]
            });
            assert.ok(results);
            assert.strictEqual(results.length, 2);
        });
        await this.runner.test('should return empty when AND conditions do not match', async () => {
            let results = await this.categoriesRepo.load({
                AND: [
                    {is_active: 1},
                    {slug: 'nonexistent'}
                ]
            });
            assert.ok(results);
            assert.strictEqual(results.length, 0);
        });
    }

    async testOrOperator()
    {
        this.runner.group('OR Operator');
        await TestHelpers.cleanDatabase(this.dataServer);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_categories', [
            CategoriesFixtures.category_filters_1,
            CategoriesFixtures.category_filters_2,
            CategoriesFixtures.category_filters_3
        ]);
        await this.runner.test('should filter with simple OR condition', async () => {
            let results = await this.categoriesRepo.load({
                OR: [
                    {slug: 'filters-test-1'},
                    {slug: 'filters-test-2'}
                ]
            });
            assert.ok(results);
            assert.strictEqual(results.length, 2);
        });
        await this.runner.test('should filter with OR containing operator conditions', async () => {
            let results = await this.categoriesRepo.load({
                OR: [
                    {display_order: {operator: 'lt', value: 2}},
                    {is_active: 0}
                ]
            });
            assert.ok(results);
            assert.strictEqual(results.length, 2);
        });
        await this.runner.test('should return all matching records with OR', async () => {
            let results = await this.categoriesRepo.load({
                OR: [
                    {is_active: 1},
                    {is_active: 0}
                ]
            });
            assert.ok(results);
            assert.strictEqual(results.length, 3);
        });
    }

    async testNestedAndOr()
    {
        this.runner.group('Nested AND/OR');
        await TestHelpers.cleanDatabase(this.dataServer);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_categories', [
            CategoriesFixtures.category_filters_1,
            CategoriesFixtures.category_filters_2,
            CategoriesFixtures.category_filters_3
        ]);
        await this.runner.test('should filter with OR inside AND', async () => {
            let results = await this.categoriesRepo.load({
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
        await this.runner.test('should filter with AND inside OR', async () => {
            let results = await this.categoriesRepo.load({
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
        await this.runner.test('should handle deep nesting of AND/OR', async () => {
            let results = await this.categoriesRepo.load({
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
            assert.strictEqual(results.length, 2);
        });
    }

    async testNotOperator()
    {
        this.runner.group('NOT Operator');
        await TestHelpers.cleanDatabase(this.dataServer);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_categories', [
            CategoriesFixtures.category_filters_1,
            CategoriesFixtures.category_filters_2,
            CategoriesFixtures.category_filters_3
        ]);
        await this.runner.test('should filter with NOT operator', async () => {
            let results = await this.categoriesRepo.load({
                is_active: {operator: 'not', value: 0}
            });
            assert.ok(results);
            assert.strictEqual(results.length, 2);
            for(let category of results){
                assert.strictEqual(category.is_active, 1);
            }
        });
        await this.runner.test('should filter with NOT inside AND', async () => {
            let results = await this.categoriesRepo.load({
                AND: [
                    {is_active: {operator: 'not', value: 0}},
                    {display_order: 1}
                ]
            });
            assert.ok(results);
            assert.strictEqual(results.length, 1);
        });
    }

    async testInOperator()
    {
        this.runner.group('IN Operator');
        await TestHelpers.cleanDatabase(this.dataServer);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_categories', [
            CategoriesFixtures.category_filters_1,
            CategoriesFixtures.category_filters_2,
            CategoriesFixtures.category_filters_3
        ]);
        await this.runner.test('should filter with IN operator', async () => {
            let results = await this.categoriesRepo.load({
                display_order: {operator: 'in', value: [1, 2]}
            });
            assert.ok(results);
            assert.strictEqual(results.length, 2);
        });
        await this.runner.test('should filter with IN operator on string field', async () => {
            let results = await this.categoriesRepo.load({
                slug: {operator: 'in', value: ['filters-test-1', 'filters-test-2']}
            });
            assert.ok(results);
            assert.strictEqual(results.length, 2);
        });
        await this.runner.test('should return empty with IN operator when no match', async () => {
            let results = await this.categoriesRepo.load({
                display_order: {operator: 'in', value: [99, 100]}
            });
            assert.ok(results);
            assert.strictEqual(results.length, 0);
        });
    }

    async testLikeOperator()
    {
        this.runner.group('LIKE Operator');
        await TestHelpers.cleanDatabase(this.dataServer);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_categories', [
            CategoriesFixtures.category_filters_1,
            CategoriesFixtures.category_filters_2
        ]);
        await this.runner.test('should filter with LIKE operator', async () => {
            let results = await this.categoriesRepo.load({
                name: {operator: 'like', value: '%Filters%'}
            });
            assert.ok(results);
            assert.ok(results.length > 0);
            assert.ok(results[0].name.includes('Filters'));
        });
        await this.runner.test('should filter with LIKE and wildcards', async () => {
            let results = await this.categoriesRepo.load({
                slug: {operator: 'like', value: '%filters%'}
            });
            assert.ok(results);
            assert.ok(results.length > 0);
        });
        await this.runner.test('should work with LIKE inside AND', async () => {
            let results = await this.categoriesRepo.load({
                AND: [
                    {is_active: 1},
                    {name: {operator: 'like', value: '%Filters%'}}
                ]
            });
            assert.ok(results);
            assert.ok(results.length > 0);
        });
    }

    async testComparisonOperators()
    {
        this.runner.group('Comparison Operators');
        await TestHelpers.cleanDatabase(this.dataServer);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_categories', [
            CategoriesFixtures.category_filters_1,
            CategoriesFixtures.category_filters_2,
            CategoriesFixtures.category_filters_3
        ]);
        await this.runner.test('should filter with gt operator', async () => {
            let results = await this.categoriesRepo.load({
                display_order: {operator: 'gt', value: 1}
            });
            assert.ok(results);
            assert.strictEqual(results.length, 2);
        });
        await this.runner.test('should filter with gte operator', async () => {
            let results = await this.categoriesRepo.load({
                display_order: {operator: 'gte', value: 2}
            });
            assert.ok(results);
            assert.strictEqual(results.length, 2);
        });
        await this.runner.test('should filter with lt operator', async () => {
            let results = await this.categoriesRepo.load({
                display_order: {operator: 'lt', value: 3}
            });
            assert.ok(results);
            assert.strictEqual(results.length, 2);
        });
        await this.runner.test('should filter with lte operator', async () => {
            let results = await this.categoriesRepo.load({
                display_order: {operator: 'lte', value: 2}
            });
            assert.ok(results);
            assert.strictEqual(results.length, 2);
        });
    }

    async testComplexNestedScenarios()
    {
        this.runner.group('Complex Nested Scenarios');
        await TestHelpers.cleanDatabase(this.dataServer);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_categories', [
            CategoriesFixtures.category_filters_1
        ]);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_products', [
            ProductsFixtures.product_filters_1,
            ProductsFixtures.product_filters_2
        ]);
        await this.runner.test('should handle complex filter with multiple operators', async () => {
            let results = await this.productsRepo.load({
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
        await this.runner.test('should handle filter with IN inside OR', async () => {
            let results = await this.productsRepo.load({
                OR: [
                    {status: {operator: 'in', value: ['published', 'draft']}},
                    {stock_quantity: {operator: 'gt', value: 0}}
                ]
            });
            assert.ok(results);
            assert.strictEqual(results.length, 2);
        });
        await this.runner.test('should handle nested AND/OR with LIKE and comparison operators', async () => {
            let results = await this.productsRepo.load({
                AND: [
                    {
                        OR: [
                            {name: {operator: 'like', value: '%Phone%'}},
                            {name: {operator: 'like', value: '%Product%'}}
                        ]
                    },
                    {price: {operator: 'gte', value: 0}}
                ]
            });
            assert.ok(results);
            assert.ok(results.length > 0);
        });
    }

    async testEdgeCases()
    {
        this.runner.group('Edge Cases');
        await TestHelpers.cleanDatabase(this.dataServer);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_categories', [
            CategoriesFixtures.category_filters_1
        ]);
        await this.runner.test('should handle empty AND array', async () => {
            let results = await this.categoriesRepo.load({AND: []});
            assert.ok(results);
        });
        await this.runner.test('should handle empty OR array', async () => {
            let results = await this.categoriesRepo.load({OR: []});
            assert.ok(results);
        });
        await this.runner.test('should handle single condition in AND', async () => {
            let results = await this.categoriesRepo.load({
                AND: [{is_active: 1}]
            });
            assert.ok(results);
            assert.strictEqual(results.length, 1);
        });
        await this.runner.test('should handle single condition in OR', async () => {
            let results = await this.categoriesRepo.load({
                OR: [{is_active: 1}]
            });
            assert.ok(results);
            assert.strictEqual(results.length, 1);
        });
    }

}

module.exports = NestedFiltersTest;
