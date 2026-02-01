/**
 *
 * Reldens - Drivers Test
 * Tests shared public methods across all storage drivers
 *
 */

const { TestRunner, assert } = require('../utils/test-runner');
const { ObjectionJsDriver } = require('../../lib/objection-js/objection-js-driver');
const { MikroOrmDriver } = require('../../lib/mikro-orm/mikro-orm-driver');
const { PrismaDriver } = require('../../lib/prisma/prisma-driver');

class DriversUnitTest
{

    constructor()
    {
        this.runner = new TestRunner();
        this.DRIVERS = [
            {name: 'objection-js', class: ObjectionJsDriver},
            {name: 'mikro-orm', class: MikroOrmDriver},
            {name: 'prisma', class: PrismaDriver}
        ];
        this.SHARED_PUBLIC_METHODS = [
            'databaseName',
            'id',
            'name',
            'tableName',
            'property',
            'create',
            'createWithRelations',
            'update',
            'updateBy',
            'updateById',
            'upsert',
            'delete',
            'deleteById',
            'count',
            'countWithRelations',
            'loadAll',
            'loadAllWithRelations',
            'load',
            'loadWithRelations',
            'loadBy',
            'loadByWithRelations',
            'loadById',
            'loadByIdWithRelations',
            'loadByIds',
            'loadOne',
            'loadOneWithRelations',
            'loadOneBy',
            'loadOneByWithRelations',
            'rawQuery',
            'executeCustomQuery',
            'isJsonField',
            'parseRelationsString',
            'applyQueryOptions',
            'preserveEntityState',
            'restoreEntityState',
            'loadEntityData'
        ];
    }

    async run()
    {
        this.runner.suite('Drivers Unit Test');
        for(let driver of this.DRIVERS){
            await this.testDriverMethods(driver);
        }
        return this.runner.getResults();
    }

    async testDriverMethods(driver)
    {
        this.runner.group('Driver: '+driver.name+' - Shared public methods');
        for(let methodName of this.SHARED_PUBLIC_METHODS){
            await this.runner.test('should have method '+methodName, async () => {
                assert.strictEqual(
                    typeof driver.class.prototype[methodName],
                    'function',
                    driver.name+' should implement '+methodName
                );
            });
        }
    }

}

module.exports = DriversUnitTest;
