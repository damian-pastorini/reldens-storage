/**
 *
 * Reldens - Drivers Test
 * Tests shared public methods across all storage drivers
 *
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { ObjectionJsDriver } = require('../../lib/objection-js/objection-js-driver');
const { MikroOrmDriver } = require('../../lib/mikro-orm/mikro-orm-driver');
const { PrismaDriver } = require('../../lib/prisma/prisma-driver');

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
                    assert.strictEqual(typeof driver.class.prototype[methodName], 'function', driver.name+' should implement '+methodName);
                });
            }
        });
    });
}
