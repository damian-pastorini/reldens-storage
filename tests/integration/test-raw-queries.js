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
        this.insertPrefix = 'INSERT INTO test_categories (id, name, slug, is_active, display_order) VALUES ';
    }

    async run()
    {
        this.runner.suite('Raw Queries - Driver: '+this.driverName);
        await this.testSingleWriteStatements();
        await this.testSingleDdlStatements();
        await this.testSingleReadStatements();
        await this.testFailingStatements();
        await this.testMultipleWriteStatements();
        await this.testMultipleReadStatements();
        return this.runner.getResults();
    }

    async rawQueryOrFalse(content)
    {
        return await this.dataServer.rawQuery(content).catch(() => false);
    }

    async selectNames(whereClause)
    {
        return await this.dataServer.rawQuery('SELECT name FROM test_categories WHERE '+whereClause+' ORDER BY id');
    }

    assertNames(rows, expectedNames)
    {
        assert.ok(Array.isArray(rows), 'Rows must be an array');
        assert.strictEqual(rows.length, expectedNames.length);
        for(let i = 0; i < expectedNames.length; i++){
            assert.strictEqual(rows[i].name, expectedNames[i]);
        }
    }

    assertResultsCount(results, expectedCount)
    {
        assert.ok(Array.isArray(results), 'Multiple statements must return an array');
        assert.strictEqual(results.length, expectedCount);
        for(let result of results){
            assert.notStrictEqual(result, false);
        }
    }

    async testSingleWriteStatements()
    {
        this.runner.group('Single Write Statement');
        await TestHelpers.cleanDatabase(this.dataServer);
        await this.runner.test('should return a truthy result for a single INSERT', async () => {
            let result = await this.dataServer.rawQuery(
                this.insertPrefix+'(9001, \'Raw Single Test\', \'raw-single-test\', 1, 99)'
            );
            assert.ok(result, 'Single INSERT must not be reported as a failed query');
        });
        await this.runner.test('should keep a semicolon inside a quoted value on a single INSERT', async () => {
            let result = await this.dataServer.rawQuery(this.insertPrefix+'(9006, \'Raw; Quoted\', \'raw-quoted\', 1, 98)');
            assert.ok(result, 'Single INSERT with quoted semicolon must not be reported as a failed query');
            this.assertNames(await this.selectNames('id = 9006'), ['Raw; Quoted']);
        });
        await this.runner.test('should return a truthy result for a single UPDATE matching rows', async () => {
            let result = await this.dataServer.rawQuery(
                'UPDATE test_categories SET name = \'Updated Raw Single\' WHERE id = 9001'
            );
            assert.ok(result, 'Single UPDATE must not be reported as a failed query');
            this.assertNames(await this.selectNames('id = 9001'), ['Updated Raw Single']);
        });
        await this.runner.test('should not return false for a single UPDATE matching no rows', async () => {
            let result = await this.dataServer.rawQuery('UPDATE test_categories SET name = \'Nobody\' WHERE id = 9999');
            assert.notStrictEqual(result, false, 'UPDATE matching no rows is not a failed query');
        });
        await this.runner.test('should return a truthy result for a single DELETE matching rows', async () => {
            let result = await this.dataServer.rawQuery('DELETE FROM test_categories WHERE id = 9006');
            assert.ok(result, 'Single DELETE must not be reported as a failed query');
            this.assertNames(await this.selectNames('id = 9006'), []);
        });
        await this.runner.test('should not return false for a single DELETE matching no rows', async () => {
            let result = await this.dataServer.rawQuery('DELETE FROM test_categories WHERE id = 9999');
            assert.notStrictEqual(result, false, 'DELETE matching no rows is not a failed query');
        });
        await this.runner.test('should not return false for a single DELETE without WHERE on an empty table', async () => {
            let result = await this.dataServer.rawQuery('DELETE FROM test_reviews');
            assert.notStrictEqual(result, false, 'DELETE on an empty table is not a failed query');
        });
    }

    async testSingleDdlStatements()
    {
        this.runner.group('Single DDL Statement');
        await this.runner.test('should return a truthy result for a single CREATE TABLE', async () => {
            let result = await this.dataServer.rawQuery('CREATE TABLE test_raw_ddl (id INT NOT NULL PRIMARY KEY)');
            assert.ok(result, 'Single CREATE TABLE must not be reported as a failed query');
            let rows = await this.dataServer.rawQuery('SHOW TABLES LIKE \'test_raw_ddl\'');
            assert.strictEqual(rows.length, 1);
        });
        await this.runner.test('should return a truthy result for a single ALTER TABLE', async () => {
            let result = await this.dataServer.rawQuery('ALTER TABLE test_raw_ddl ADD COLUMN label VARCHAR(50) NULL');
            assert.ok(result, 'Single ALTER TABLE must not be reported as a failed query');
            let rows = await this.dataServer.rawQuery('SHOW COLUMNS FROM test_raw_ddl LIKE \'label\'');
            assert.strictEqual(rows.length, 1);
        });
        await this.runner.test('should return a truthy result for a single DROP TABLE', async () => {
            let result = await this.dataServer.rawQuery('DROP TABLE test_raw_ddl');
            assert.ok(result, 'Single DROP TABLE must not be reported as a failed query');
            let rows = await this.dataServer.rawQuery('SHOW TABLES LIKE \'test_raw_ddl\'');
            assert.ok(Array.isArray(rows));
            assert.strictEqual(rows.length, 0);
        });
        await this.runner.test('should not return false for a single SET statement', async () => {
            let result = await this.dataServer.rawQuery('SET FOREIGN_KEY_CHECKS=1');
            assert.notStrictEqual(result, false, 'SET statement is not a failed query');
        });
    }

    async testSingleReadStatements()
    {
        this.runner.group('Single Read Statement');
        await TestHelpers.cleanDatabase(this.dataServer);
        await this.dataServer.rawQuery(this.insertPrefix+'(9001, \'Raw Read 1\', \'raw-read-1\', 1, 1)');
        await this.dataServer.rawQuery(this.insertPrefix+'(9002, \'Raw Read 2\', \'raw-read-2\', 1, 2)');
        await this.dataServer.rawQuery(this.insertPrefix+'(9003, \'Raw Read 3\', \'raw-read-3\', 0, 3)');
        await this.runner.test('should return one row for a SELECT matching one record', async () => {
            let result = await this.dataServer.rawQuery('SELECT id, name, slug FROM test_categories WHERE id = 9001');
            this.assertNames(result, ['Raw Read 1']);
            assert.strictEqual(result[0].slug, 'raw-read-1');
        });
        await this.runner.test('should return all rows in the requested order for a SELECT matching many', async () => {
            let result = await this.dataServer.rawQuery(
                'SELECT name FROM test_categories WHERE id IN (9001, 9002, 9003) ORDER BY id DESC'
            );
            this.assertNames(result, ['Raw Read 3', 'Raw Read 2', 'Raw Read 1']);
        });
        await this.runner.test('should return an empty array for a SELECT matching no rows', async () => {
            let result = await this.dataServer.rawQuery('SELECT id FROM test_categories WHERE id = 9999');
            assert.ok(Array.isArray(result), 'Empty SELECT must return an array, not false');
            assert.strictEqual(result.length, 0);
        });
        await this.runner.test('should return a row for a SELECT without FROM', async () => {
            let result = await this.dataServer.rawQuery('SELECT \'raw-constant\' AS value');
            assert.ok(Array.isArray(result));
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].value, 'raw-constant');
        });
        await this.runner.test('should return rows for a SELECT with trailing semicolon and whitespace', async () => {
            let result = await this.dataServer.rawQuery('\n   SELECT name FROM test_categories WHERE id = 9002 ;  \n');
            this.assertNames(result, ['Raw Read 2']);
        });
        await this.runner.test('should return rows for a SELECT preceded by line and block comments', async () => {
            let result = await this.dataServer.rawQuery(
                '-- line comment; with semicolon\n/* block comment; with semicolon */\n'
                +'SELECT name FROM test_categories WHERE id = 9003'
            );
            this.assertNames(result, ['Raw Read 3']);
        });
        await this.runner.test('should return rows for a SHOW statement', async () => {
            let result = await this.dataServer.rawQuery('SHOW TABLES LIKE \'test_categories\'');
            assert.ok(Array.isArray(result));
            assert.strictEqual(result.length, 1);
        });
    }

    async testFailingStatements()
    {
        this.runner.group('Failing Statement');
        await TestHelpers.cleanDatabase(this.dataServer);
        await this.dataServer.rawQuery(this.insertPrefix+'(9001, \'Raw Fail 1\', \'raw-fail-1\', 1, 1)');
        await this.runner.test('should not return a truthy result for invalid SQL', async () => {
            assert.strictEqual(await this.rawQueryOrFalse('THIS IS NOT SQL'), false);
        });
        await this.runner.test('should not return a truthy result for an empty string', async () => {
            assert.strictEqual(await this.rawQueryOrFalse(''), false);
        });
        await this.runner.test('should not return a truthy result for a whitespace only string', async () => {
            assert.strictEqual(await this.rawQueryOrFalse('   \n  '), false);
        });
        await this.runner.test('should not return a truthy result for a SELECT on a missing table', async () => {
            assert.strictEqual(await this.rawQueryOrFalse('SELECT id FROM test_missing_table'), false);
        });
        await this.runner.test('should not return a truthy result for an INSERT violating a unique key', async () => {
            let result = await this.rawQueryOrFalse(this.insertPrefix+'(9007, \'Raw Duplicate\', \'raw-fail-1\', 1, 2)');
            assert.strictEqual(result, false);
            this.assertNames(await this.selectNames('id = 9007'), []);
        });
        await this.runner.test('should not return a truthy result when a later statement is invalid', async () => {
            let result = await this.rawQueryOrFalse('SELECT id FROM test_categories WHERE id = 9001; THIS IS NOT SQL;');
            assert.strictEqual(result, false);
        });
    }

    async testMultipleWriteStatements()
    {
        this.runner.group('Multiple Write Statements');
        await TestHelpers.cleanDatabase(this.dataServer);
        await this.runner.test('should return one result per statement for multiple INSERTs', async () => {
            let results = await this.dataServer.rawQuery(
                this.insertPrefix+'(9002, \'Raw Multi 1\', \'raw-multi-1\', 1, 1);'
                +this.insertPrefix+'(9003, \'Raw Multi 2\', \'raw-multi-2\', 1, 2);'
            );
            this.assertResultsCount(results, 2);
            this.assertNames(await this.selectNames('id IN (9002, 9003)'), ['Raw Multi 1', 'Raw Multi 2']);
        });
        await this.runner.test('should return one result per statement for an UPDATE and a DELETE', async () => {
            let results = await this.dataServer.rawQuery(
                'UPDATE test_categories SET name = \'Raw Multi Updated\' WHERE id = 9002;'
                +'DELETE FROM test_categories WHERE id = 9003;'
            );
            this.assertResultsCount(results, 2);
            this.assertNames(await this.selectNames('id IN (9002, 9003)'), ['Raw Multi Updated']);
        });
        await this.runner.test('should return one result per statement for a CREATE and a DROP TABLE', async () => {
            let results = await this.dataServer.rawQuery(
                'CREATE TABLE test_raw_multi_ddl (id INT NOT NULL PRIMARY KEY);DROP TABLE test_raw_multi_ddl;'
            );
            this.assertResultsCount(results, 2);
            let rows = await this.dataServer.rawQuery('SHOW TABLES LIKE \'test_raw_multi_ddl\'');
            assert.strictEqual(rows.length, 0);
        });
        await this.runner.test('should ignore comments and blank lines between statements', async () => {
            let results = await this.dataServer.rawQuery(
                '-- first statement\n'
                +this.insertPrefix+'(9005, \'Raw Commented 1\', \'raw-commented-1\', 1, 4);\n\n'
                +'/* second statement */\n'
                +this.insertPrefix+'(9008, \'Raw Commented 2\', \'raw-commented-2\', 1, 5);\n'
            );
            this.assertResultsCount(results, 2);
            this.assertNames(await this.selectNames('id IN (9005, 9008)'), ['Raw Commented 1', 'Raw Commented 2']);
        });
        await this.runner.test('should execute multiple sequential rawQuery calls', async () => {
            await this.dataServer.rawQuery(this.insertPrefix+'(9009, \'Raw Sequential 1\', \'raw-sequential-1\', 1, 6)');
            await this.dataServer.rawQuery(this.insertPrefix+'(9010, \'Raw Sequential 2\', \'raw-sequential-2\', 1, 7)');
            this.assertNames(await this.selectNames('id IN (9009, 9010)'), ['Raw Sequential 1', 'Raw Sequential 2']);
        });
    }

    async testMultipleReadStatements()
    {
        this.runner.group('Multiple Read Statements');
        await TestHelpers.cleanDatabase(this.dataServer);
        await this.dataServer.rawQuery(this.insertPrefix+'(9002, \'Raw Multi 1\', \'raw-multi-1\', 1, 1)');
        await this.dataServer.rawQuery(this.insertPrefix+'(9003, \'Raw Multi 2\', \'raw-multi-2\', 1, 2)');
        await this.runner.test('should return one result set per SELECT for multiple SELECTs', async () => {
            let results = await this.dataServer.rawQuery(
                'SELECT id, name FROM test_categories WHERE id = 9002;'
                +'SELECT id, name FROM test_categories WHERE id = 9003;'
            );
            this.assertResultsCount(results, 2);
            this.assertNames(results[0], ['Raw Multi 1']);
            this.assertNames(results[1], ['Raw Multi 2']);
        });
        await this.runner.test('should return an empty result set for an empty SELECT among multiple SELECTs', async () => {
            let results = await this.dataServer.rawQuery(
                'SELECT id FROM test_categories WHERE id = 9999;'
                +'SELECT name FROM test_categories WHERE id = 9002;'
            );
            this.assertResultsCount(results, 2);
            this.assertNames(results[0], []);
            this.assertNames(results[1], ['Raw Multi 1']);
        });
        await this.runner.test('should return one result per statement for a mixed INSERT and SELECT', async () => {
            let results = await this.dataServer.rawQuery(
                this.insertPrefix+'(9004, \'Raw Mixed\', \'raw-mixed\', 1, 3);'
                +'SELECT name FROM test_categories WHERE id = 9004;'
            );
            this.assertResultsCount(results, 2);
            this.assertNames(results[1], ['Raw Mixed']);
        });
    }

}

module.exports = RawQueriesTest;
