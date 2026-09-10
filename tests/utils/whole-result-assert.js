/**
 *
 * Reldens - Whole Result Assert
 * Full output assertions shared by every driver integration suite: the exact own enumerable key set of a
 * record, the exact value of every column against the inserted fixture row, the exact length and full
 * content of a list, the exact shape and content of every relation, and the exact count numbers. The very
 * same expectations run on every driver, no driver is allowed an exception.
 *
 */

const assert = require('node:assert');
const { ColumnValueAssert } = require('./column-value-assert');
const { ObservedValue } = require('./observed-value');
const { TableColumnsFixtures } = require('../fixtures/table-columns-fixtures');
const { sc } = require('@reldens/utils');

class WholeResultAssert
{

    static expectedRow(tableName, fixtureRow, overrides)
    {
        let tableSpec = TableColumnsFixtures[tableName];
        let expectedRow = {};
        for(let columnName of Object.keys(tableSpec.columns)){
            expectedRow[columnName] = this.expectedColumnValue(tableSpec, fixtureRow, columnName);
        }
        if(sc.isObject(overrides)){
            Object.assign(expectedRow, overrides);
        }
        return expectedRow;
    }

    static expectedColumnValue(tableSpec, fixtureRow, columnName)
    {
        if(sc.hasOwn(fixtureRow, columnName)){
            return fixtureRow[columnName];
        }
        if(sc.hasOwn(tableSpec.defaults, columnName)){
            return tableSpec.defaults[columnName];
        }
        return ColumnValueAssert.anyValue;
    }

    static expectedRows(tableName, fixtureRows)
    {
        let expectedRows = [];
        for(let fixtureRow of fixtureRows){
            expectedRows.push(this.expectedRow(tableName, fixtureRow, null));
        }
        return expectedRows;
    }

    static fixtureRecord(actualRecord, tableName, fixtureRow, label)
    {
        return this.record(actualRecord, {
            table: tableName,
            expected: this.expectedRow(tableName, fixtureRow, null),
            label: label
        });
    }

    static fixtureList(actualList, tableName, fixtureRows, label)
    {
        return this.list(actualList, {
            table: tableName,
            expected: this.expectedRows(tableName, fixtureRows),
            label: label
        });
    }

    static record(actualRecord, props)
    {
        let label = props.label;
        assert.ok(actualRecord, label+' was not returned, observed: '+ObservedValue.describe(actualRecord));
        assert.strictEqual(
            typeof actualRecord,
            'object',
            label+' is not a record object, observed: '+ObservedValue.describe(actualRecord)
        );
        let relations = sc.get(props, 'relations', {});
        this.assertKeySet(actualRecord, props.table, relations, label);
        ColumnValueAssert.assertColumns(actualRecord, props.table, props.expected, label);
        this.assertRelations(actualRecord, relations, label);
        return true;
    }

    static list(actualList, props)
    {
        let label = props.label;
        assert.ok(sc.isArray(actualList), label+' is not an array, observed: '+ObservedValue.describe(actualList));
        assert.strictEqual(
            actualList.length,
            props.expected.length,
            label+' length mismatch, expected '+props.expected.length+' records but observed '+actualList.length
            +' with ids: ['+this.listIds(actualList).join(', ')+']'
        );
        let orderedList = sc.isTrue(props, 'keepOrder') ? actualList : this.sortedById(actualList);
        for(let i = 0; i < props.expected.length; i++){
            this.recordAt(orderedList, props, i);
        }
        return true;
    }

    static recordAt(orderedList, props, index)
    {
        return this.record(orderedList[index], {
            table: props.table,
            expected: props.expected[index],
            relations: this.relationsAt(sc.get(props, 'relations', {}), index),
            label: props.label+'['+index+']'
        });
    }

    static relationsAt(relations, index)
    {
        if(sc.isArray(relations)){
            return relations[index];
        }
        return relations;
    }

    static count(actualCount, expectedCount, label)
    {
        assert.strictEqual(
            typeof actualCount,
            'number',
            label+' is not a number, observed: '+ObservedValue.describe(actualCount)
        );
        assert.strictEqual(
            actualCount,
            expectedCount,
            label+' expected '+expectedCount+' but observed: '+ObservedValue.describe(actualCount)
        );
        return true;
    }

    static failedOperation(actualError, label)
    {
        assert.ok(
            actualError,
            label+' must be rejected by the database but no error was thrown'
        );
        return true;
    }

    static assertKeySet(actualRecord, tableName, relations, label)
    {
        let expectedKeys = Object.keys(TableColumnsFixtures[tableName].columns);
        let allExpectedKeys = expectedKeys.concat(Object.keys(sc.isObject(relations) ? relations : {}));
        let observedKeys = Object.keys(actualRecord);
        let missingKeys = this.missingFrom(allExpectedKeys, observedKeys);
        let notExpectedKeys = this.missingFrom(observedKeys, allExpectedKeys);
        assert.strictEqual(
            missingKeys.join(',')+'|'+notExpectedKeys.join(','),
            '|',
            label+' key set mismatch, missing: ['+missingKeys.join(', ')+'], not expected: ['
            +notExpectedKeys.join(', ')+'], observed: ['+observedKeys.join(', ')+']'
        );
        return true;
    }

    static missingFrom(sourceKeys, targetKeys)
    {
        let missingKeys = [];
        for(let key of sourceKeys){
            if(-1 === targetKeys.indexOf(key)){
                missingKeys.push(key);
            }
        }
        return missingKeys;
    }

    static assertRelations(actualRecord, relations, label)
    {
        if(!sc.isObject(relations)){
            return true;
        }
        for(let relationKey of Object.keys(relations)){
            this.assertRelation(actualRecord[relationKey], relations[relationKey], label+'.'+relationKey);
        }
        return true;
    }

    static assertRelation(relationValue, relationProps, label)
    {
        if(null === relationProps.expected){
            assert.strictEqual(
                relationValue,
                null,
                label+' expected an explicit null relation, observed: '+ObservedValue.describe(relationValue)
            );
            return true;
        }
        if(sc.isArray(relationProps.expected)){
            assert.ok(
                sc.isArray(relationValue),
                label+' expected an array relation, observed: '+ObservedValue.describe(relationValue)
            );
            return this.list(relationValue, this.relationProps(relationProps, label));
        }
        assert.ok(
            !sc.isArray(relationValue),
            label+' expected a single record relation but observed an array: '
            +ObservedValue.describe(relationValue)
        );
        return this.record(relationValue, this.relationProps(relationProps, label));
    }

    static relationProps(relationProps, label)
    {
        return {
            table: relationProps.table,
            expected: relationProps.expected,
            relations: sc.get(relationProps, 'relations', {}),
            keepOrder: sc.get(relationProps, 'keepOrder', false),
            label: label
        };
    }

    static listIds(actualList)
    {
        let ids = [];
        for(let actualRecord of actualList){
            ids.push(sc.get(actualRecord, 'id', ObservedValue.describe(actualRecord)));
        }
        return ids;
    }

    static sortedById(actualList)
    {
        let orderedList = [];
        for(let actualRecord of actualList){
            orderedList.push(actualRecord);
        }
        orderedList.sort((firstRecord, secondRecord) => {
            return Number(sc.get(firstRecord, 'id', 0)) - Number(sc.get(secondRecord, 'id', 0));
        });
        return orderedList;
    }

}

module.exports.WholeResultAssert = WholeResultAssert;
