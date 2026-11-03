/**
 *
 * Reldens - Nested Filters Integration Test
 * Tests complex filter syntax across all the storage drivers with an actual database, asserting the whole
 * result of every filter: the exact amount of records and every column of every returned record against the
 * fixture rows that were inserted.
 *
 */

const { TestRunner } = require('../utils/test-runner');
const { TestHelpers } = require('../utils/test-helpers');
const { WholeResultAssert } = require('../utils/whole-result-assert');
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
        this.categoriesById = {
            1500: CategoriesFixtures.category_filters_1,
            1501: CategoriesFixtures.category_filters_2,
            1502: CategoriesFixtures.category_filters_3
        };
        this.productsById = {
            2500: ProductsFixtures.product_filters_1,
            2501: ProductsFixtures.product_filters_2
        };
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

    async insertCategories(fixtureRows)
    {
        await TestHelpers.cleanDatabase(this.dataServer);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_categories', fixtureRows);
        return true;
    }

    allFilterCategories()
    {
        return [
            CategoriesFixtures.category_filters_1,
            CategoriesFixtures.category_filters_2,
            CategoriesFixtures.category_filters_3
        ];
    }

    assertFilteredRecords(results, tableName, expectedIds, label)
    {
        let fixturesById = 'test_categories' === tableName ? this.categoriesById : this.productsById;
        let expectedFixtures = [];
        for(let expectedId of expectedIds){
            expectedFixtures.push(fixturesById[expectedId]);
        }
        return WholeResultAssert.fixtureList(results, tableName, expectedFixtures, label);
    }

    async testAndOperator()
    {
        this.runner.group('AND Operator');
        await this.insertCategories(this.allFilterCategories());
        await this.runner.test('should filter with simple AND condition', async () => {
            let results = await this.categoriesRepo.load({AND: [{is_active: 1}, {display_order: 1}]});
            this.assertFilteredRecords(results, 'test_categories', [1500], 'AND is_active 1 and order 1');
        });
        await this.runner.test('should filter with AND containing multiple conditions', async () => {
            let orderFilter = {operator: 'gte', value: 1};
            let results = await this.categoriesRepo.load({AND: [{is_active: 1}, {display_order: orderFilter}]});
            this.assertFilteredRecords(results, 'test_categories', [1500, 1501], 'AND is_active 1 and order gte 1');
        });
        await this.runner.test('should return empty when AND conditions do not match', async () => {
            let results = await this.categoriesRepo.load({AND: [{is_active: 1}, {slug: 'nonexistent'}]});
            this.assertFilteredRecords(results, 'test_categories', [], 'AND with a slug that does not exist');
        });
    }

    async testOrOperator()
    {
        this.runner.group('OR Operator');
        await this.insertCategories(this.allFilterCategories());
        await this.runner.test('should filter with simple OR condition', async () => {
            let filters = {OR: [{slug: 'filters-test-1'}, {slug: 'filters-test-2'}]};
            let results = await this.categoriesRepo.load(filters);
            this.assertFilteredRecords(results, 'test_categories', [1500, 1501], 'OR on two slugs');
        });
        await this.runner.test('should filter with OR containing operator conditions', async () => {
            let filters = {OR: [{display_order: {operator: 'lt', value: 2}}, {is_active: 0}]};
            let results = await this.categoriesRepo.load(filters);
            this.assertFilteredRecords(results, 'test_categories', [1500, 1502], 'OR order lt 2 or inactive');
        });
        await this.runner.test('should return all matching records with OR', async () => {
            let results = await this.categoriesRepo.load({OR: [{is_active: 1}, {is_active: 0}]});
            this.assertFilteredRecords(results, 'test_categories', [1500, 1501, 1502], 'OR on both is_active');
        });
    }

    async testNestedAndOr()
    {
        this.runner.group('Nested AND/OR');
        await this.insertCategories(this.allFilterCategories());
        await this.runner.test('should filter with OR inside AND', async () => {
            let orderOptions = {OR: [{display_order: 1}, {display_order: 2}]};
            let results = await this.categoriesRepo.load({AND: [{is_active: 1}, orderOptions]});
            this.assertFilteredRecords(results, 'test_categories', [1500, 1501], 'OR inside AND');
        });
        await this.runner.test('should filter with AND inside OR', async () => {
            let activeAndFirst = {AND: [{is_active: 1}, {display_order: 1}]};
            let results = await this.categoriesRepo.load({OR: [activeAndFirst, {is_active: 0}]});
            this.assertFilteredRecords(results, 'test_categories', [1500, 1502], 'AND inside OR');
        });
        await this.runner.test('should handle deep nesting of AND/OR', async () => {
            let orderOptions = {OR: [{display_order: 1}, {display_order: 2}]};
            let activeOptions = {OR: [{is_active: 1}, {is_active: 0}]};
            let results = await this.categoriesRepo.load({AND: [orderOptions, activeOptions]});
            this.assertFilteredRecords(results, 'test_categories', [1500, 1501], 'two OR groups inside AND');
        });
    }

    async testNotOperator()
    {
        this.runner.group('NOT Operator');
        await this.insertCategories(this.allFilterCategories());
        await this.runner.test('should filter with NOT operator', async () => {
            let results = await this.categoriesRepo.load({is_active: {operator: 'not', value: 0}});
            this.assertFilteredRecords(results, 'test_categories', [1500, 1501], 'NOT is_active 0');
        });
        await this.runner.test('should filter with NOT inside AND', async () => {
            let activeFilter = {is_active: {operator: 'not', value: 0}};
            let results = await this.categoriesRepo.load({AND: [activeFilter, {display_order: 1}]});
            this.assertFilteredRecords(results, 'test_categories', [1500], 'NOT inside AND');
        });
    }

    async testInOperator()
    {
        this.runner.group('IN Operator');
        await this.insertCategories(this.allFilterCategories());
        await this.runner.test('should filter with IN operator', async () => {
            let results = await this.categoriesRepo.load({display_order: {operator: 'in', value: [1, 2]}});
            this.assertFilteredRecords(results, 'test_categories', [1500, 1501], 'IN display_order 1 and 2');
        });
        await this.runner.test('should filter with IN operator on string field', async () => {
            let slugsFilter = {operator: 'in', value: ['filters-test-1', 'filters-test-2']};
            let results = await this.categoriesRepo.load({slug: slugsFilter});
            this.assertFilteredRecords(results, 'test_categories', [1500, 1501], 'IN slug');
        });
        await this.runner.test('should return empty with IN operator when no match', async () => {
            let results = await this.categoriesRepo.load({display_order: {operator: 'in', value: [99, 100]}});
            this.assertFilteredRecords(results, 'test_categories', [], 'IN display_order without match');
        });
    }

    async testLikeOperator()
    {
        this.runner.group('LIKE Operator');
        await this.insertCategories([CategoriesFixtures.category_filters_1, CategoriesFixtures.category_filters_2]);
        await this.runner.test('should filter with LIKE operator', async () => {
            let results = await this.categoriesRepo.load({name: {operator: 'like', value: '%Filters%'}});
            this.assertFilteredRecords(results, 'test_categories', [1500, 1501], 'LIKE on name');
        });
        await this.runner.test('should filter with LIKE and wildcards', async () => {
            let results = await this.categoriesRepo.load({slug: {operator: 'like', value: '%filters%'}});
            this.assertFilteredRecords(results, 'test_categories', [1500, 1501], 'LIKE on slug');
        });
        await this.runner.test('should work with LIKE inside AND', async () => {
            let nameFilter = {name: {operator: 'like', value: '%Filters%'}};
            let results = await this.categoriesRepo.load({AND: [{is_active: 1}, nameFilter]});
            this.assertFilteredRecords(results, 'test_categories', [1500, 1501], 'LIKE inside AND');
        });
    }

    async testComparisonOperators()
    {
        this.runner.group('Comparison Operators');
        await this.insertCategories(this.allFilterCategories());
        await this.runner.test('should filter with gt operator', async () => {
            let results = await this.categoriesRepo.load({display_order: {operator: 'gt', value: 1}});
            this.assertFilteredRecords(results, 'test_categories', [1501, 1502], 'display_order gt 1');
        });
        await this.runner.test('should filter with gte operator', async () => {
            let results = await this.categoriesRepo.load({display_order: {operator: 'gte', value: 2}});
            this.assertFilteredRecords(results, 'test_categories', [1501, 1502], 'display_order gte 2');
        });
        await this.runner.test('should filter with lt operator', async () => {
            let results = await this.categoriesRepo.load({display_order: {operator: 'lt', value: 3}});
            this.assertFilteredRecords(results, 'test_categories', [1500, 1501], 'display_order lt 3');
        });
        await this.runner.test('should filter with lte operator', async () => {
            let results = await this.categoriesRepo.load({display_order: {operator: 'lte', value: 2}});
            this.assertFilteredRecords(results, 'test_categories', [1500, 1501], 'display_order lte 2');
        });
    }

    async testComplexNestedScenarios()
    {
        this.runner.group('Complex Nested Scenarios');
        await this.insertCategories([CategoriesFixtures.category_filters_1]);
        await TestHelpers.insertFixturesViaRawSQL(this.dataServer, 'test_products', [
            ProductsFixtures.product_filters_1,
            ProductsFixtures.product_filters_2
        ]);
        await this.runner.test('should handle complex filter with multiple operators', async () => {
            let priceOrStock = {OR: [{price: {operator: 'lt', value: 1000}}, {stock_quantity: {operator: 'gte', value: 50}}]};
            let results = await this.productsRepo.load({AND: [{status: 'published'}, priceOrStock]});
            this.assertFilteredRecords(results, 'test_products', [2500], 'published with price or stock');
        });
        await this.runner.test('should handle filter with IN inside OR', async () => {
            let statusFilter = {status: {operator: 'in', value: ['published', 'draft']}};
            let stockFilter = {stock_quantity: {operator: 'gt', value: 0}};
            let results = await this.productsRepo.load({OR: [statusFilter, stockFilter]});
            this.assertFilteredRecords(results, 'test_products', [2500, 2501], 'IN inside OR');
        });
        await this.runner.test('should handle nested AND/OR with LIKE and comparison operators', async () => {
            let nameOptions = {OR: [{name: {operator: 'like', value: '%Phone%'}}, {name: {operator: 'like', value: '%Product%'}}]};
            let priceFilter = {price: {operator: 'gte', value: 0}};
            let results = await this.productsRepo.load({AND: [nameOptions, priceFilter]});
            this.assertFilteredRecords(results, 'test_products', [2500, 2501], 'LIKE options with price');
        });
    }

    async testEdgeCases()
    {
        this.runner.group('Edge Cases');
        await this.insertCategories([CategoriesFixtures.category_filters_1]);
        await this.runner.test('should handle empty AND array', async () => {
            let results = await this.categoriesRepo.load({AND: []});
            this.assertFilteredRecords(results, 'test_categories', [1500], 'empty AND returns every record');
        });
        await this.runner.test('should handle empty OR array', async () => {
            let results = await this.categoriesRepo.load({OR: []});
            this.assertFilteredRecords(results, 'test_categories', [1500], 'empty OR returns every record');
        });
        await this.runner.test('should handle single condition in AND', async () => {
            let results = await this.categoriesRepo.load({AND: [{is_active: 1}]});
            this.assertFilteredRecords(results, 'test_categories', [1500], 'single condition in AND');
        });
        await this.runner.test('should handle single condition in OR', async () => {
            let results = await this.categoriesRepo.load({OR: [{is_active: 1}]});
            this.assertFilteredRecords(results, 'test_categories', [1500], 'single condition in OR');
        });
    }

}

module.exports = NestedFiltersTest;
