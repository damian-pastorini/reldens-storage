/**
 *
 * Reldens - Raw Queries Integration Test
 * Tests rawQuery with single and multiple SQL statements across all drivers
 *
 */

const { TestRunner, assert } = require('../utils/test-runner');
const { TestHelpers } = require('../utils/test-helpers');

class RawQueriesTest
{

    constructor(dataServer, repos, driverName)
    {
        this.dataServer = dataServer;
        this.driverName = driverName;
        this.runner = new TestRunner();
    }

    async run()
    {
        this.runner.suite('Raw Queries - Driver: '+this.driverName);
        await this.testSingleStatements();
        await this.testMultipleStatements();
        return this.runner.getResults();
    }

    async testSingleStatements()
    {
        this.runner.group('Single Statement');
        await TestHelpers.cleanDatabase(this.dataServer);
        await this.dataServer.rawQuery(
            'INSERT INTO test_categories (id, name, slug, is_active, display_order)'
            +' VALUES (9001, \'Raw Single Test\', \'raw-single-test\', 1, 99)'
        );
        await this.runner.test('should return rows from SELECT single statement', async () => {
            let result = await this.dataServer.rawQuery(
                'SELECT id, name, slug FROM test_categories WHERE id = 9001'
            );
            assert.ok(result);
            assert.ok(Array.isArray(result));
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].name, 'Raw Single Test');
            assert.strictEqual(result[0].slug, 'raw-single-test');
        });
        await this.runner.test('should execute UPDATE single statement and reflect changes', async () => {
            await this.dataServer.rawQuery(
                'UPDATE test_categories SET name = \'Updated Raw Single\' WHERE id = 9001'
            );
            let result = await this.dataServer.rawQuery(
                'SELECT id, name FROM test_categories WHERE id = 9001'
            );
            assert.ok(result);
            assert.ok(Array.isArray(result));
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].name, 'Updated Raw Single');
        });
        await this.runner.test('should execute DELETE single statement and remove record', async () => {
            await this.dataServer.rawQuery('DELETE FROM test_categories WHERE id = 9001');
            let result = await this.dataServer.rawQuery(
                'SELECT id FROM test_categories WHERE id = 9001'
            );
            let isEmpty = !result || (Array.isArray(result) && 0 === result.length);
            assert.ok(isEmpty, 'Record should not exist after DELETE');
        });
    }

    async testMultipleStatements()
    {
        this.runner.group('Multiple Statements');
        await TestHelpers.cleanDatabase(this.dataServer);
        if('prisma' === this.driverName){
            await this.runner.test('should execute multiple statements in one rawQuery call', async () => {
                let results = await this.dataServer.rawQuery(
                    'INSERT INTO test_categories (id, name, slug, is_active, display_order)'
                    +' VALUES (9002, \'Raw Multi 1\', \'raw-multi-1\', 1, 1);'
                    +'INSERT INTO test_categories (id, name, slug, is_active, display_order)'
                    +' VALUES (9003, \'Raw Multi 2\', \'raw-multi-2\', 1, 2);'
                );
                assert.ok(results);
                assert.ok(Array.isArray(results));
                assert.strictEqual(results.length, 2);
                let rows = await this.dataServer.rawQuery(
                    'SELECT id, name FROM test_categories ORDER BY id'
                );
                assert.ok(rows);
                assert.ok(Array.isArray(rows));
                assert.strictEqual(rows.length, 2);
                assert.strictEqual(rows[0].name, 'Raw Multi 1');
                assert.strictEqual(rows[1].name, 'Raw Multi 2');
            });
        } else {
            await this.runner.test('should execute multiple sequential rawQuery calls', async () => {
                await this.dataServer.rawQuery(
                    'INSERT INTO test_categories (id, name, slug, is_active, display_order)'
                    +' VALUES (9002, \'Raw Multi 1\', \'raw-multi-1\', 1, 1)'
                );
                await this.dataServer.rawQuery(
                    'INSERT INTO test_categories (id, name, slug, is_active, display_order)'
                    +' VALUES (9003, \'Raw Multi 2\', \'raw-multi-2\', 1, 2)'
                );
                let result = await this.dataServer.rawQuery(
                    'SELECT id, name FROM test_categories ORDER BY id'
                );
                assert.ok(result);
                assert.ok(Array.isArray(result));
                assert.strictEqual(result.length, 2);
                assert.strictEqual(result[0].name, 'Raw Multi 1');
                assert.strictEqual(result[1].name, 'Raw Multi 2');
            });
        }
    }

}

module.exports = RawQueriesTest;
