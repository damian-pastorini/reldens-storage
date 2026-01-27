/**
 *
 * Reldens - Drivers Test
 * Tests shared public methods across all storage drivers
 *
 */

const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const { ObjectionJsDriver } = require('../../lib/objection-js/objection-js-driver');
const { MikroOrmDriver } = require('../../lib/mikro-orm/mikro-orm-driver');
const { PrismaDriver } = require('../../lib/prisma/prisma-driver');

class DriversUnitTest
{

    run()
    {
        let counter = 0;
        let errors = 0;
        return new Promise((resolve) => {
            let DRIVERS = [
            {name: 'objection-js', class: ObjectionJsDriver},
            {name: 'mikro-orm', class: MikroOrmDriver},
            {name: 'prisma', class: PrismaDriver}
        ];
        let SHARED_PUBLIC_METHODS = [
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
        for(let driver of DRIVERS){
            describe('Driver: '+driver.name, () => {
                describe('Shared public methods', () => {
                    for(let methodName of SHARED_PUBLIC_METHODS){
                        it('should have method '+methodName, () => {
                            try {
                                assert.strictEqual(typeof driver.class.prototype[methodName], 'function', driver.name+' should implement '+methodName);
                                counter++;
                            } catch(error) {
                                errors++;
                                throw error;
                            }
                        });
                    }
                });
            });
        }
        after(() => {
            resolve({counter, errors});
        });
        });
    }

}

module.exports = DriversUnitTest;
