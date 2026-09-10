/**
 *
 * Reldens - Column Value Assert
 * Value and type assertion of a single database column against the value the fixture row was inserted with.
 * Both sides are reduced to the same canonical form, identical for every driver, so a driver returning
 * another representation of the stored value fails stating what it actually returned.
 *
 */

const assert = require('node:assert');
const { ObservedValue } = require('./observed-value');
const { TableColumnsFixtures } = require('../fixtures/table-columns-fixtures');
const { sc } = require('@reldens/utils');

class ColumnValueAssert
{

    static anyValue = {reldensAnyColumnValue: true};

    static assertColumns(actualRecord, tableName, expectedRow, label)
    {
        let columns = TableColumnsFixtures[tableName].columns;
        for(let columnName of Object.keys(columns)){
            this.assertColumn(
                actualRecord[columnName],
                expectedRow[columnName],
                columns[columnName],
                label+'.'+columnName
            );
        }
        return true;
    }

    static assertColumn(actualValue, expectedValue, columnType, label)
    {
        if(ColumnValueAssert.anyValue === expectedValue){
            this.assertColumnType(actualValue, columnType, label);
            return true;
        }
        if(null === expectedValue){
            assert.strictEqual(
                actualValue,
                null,
                label+' expected null, observed: '+ObservedValue.describe(actualValue)
            );
            return true;
        }
        assert.strictEqual(
            this.canonicalValue(actualValue, columnType),
            this.canonicalValue(expectedValue, columnType),
            label+' expected '+ObservedValue.describe(expectedValue)
            +' but observed: '+ObservedValue.describe(actualValue)
        );
        this.assertColumnType(actualValue, columnType, label);
        return true;
    }

    static assertColumnType(actualValue, columnType, label)
    {
        assert.ok(
            null !== actualValue,
            label+' is null but the column holds a value, observed: '+ObservedValue.describe(actualValue)
        );
        if('date' === columnType){
            assert.ok(
                actualValue instanceof Date,
                label+' is not a Date instance, observed: '+ObservedValue.describe(actualValue)
            );
            return true;
        }
        if('json' === columnType){
            assert.strictEqual(
                typeof actualValue,
                'object',
                label+' is not a parsed json value, observed: '+ObservedValue.describe(actualValue)
            );
            return true;
        }
        assert.strictEqual(
            typeof actualValue,
            columnType,
            label+' must be a '+columnType+', observed: '+ObservedValue.describe(actualValue)
        );
        return true;
    }

    static canonicalValue(value, columnType)
    {
        if('json' === columnType){
            return this.canonicalJson(value);
        }
        if(value instanceof Date){
            return value.toISOString();
        }
        if(sc.isObject(value) || sc.isArray(value)){
            return sc.toJsonString(this.sortedJsonValue(value));
        }
        if('number' === columnType && null !== value){
            return String(Number(value));
        }
        return String(value);
    }

    static canonicalJson(value)
    {
        let parsedValue = value;
        if(sc.isString(value)){
            parsedValue = sc.parseJson(value, value);
        }
        return sc.toJsonString(this.sortedJsonValue(parsedValue));
    }

    static sortedJsonValue(value)
    {
        if(sc.isArray(value)){
            return this.sortedJsonList(value);
        }
        if(!sc.isObject(value)){
            return value;
        }
        let sortedObject = {};
        for(let key of Object.keys(value).sort()){
            sortedObject[key] = this.sortedJsonValue(value[key]);
        }
        return sortedObject;
    }

    static sortedJsonList(value)
    {
        let sortedList = [];
        for(let item of value){
            sortedList.push(this.sortedJsonValue(item));
        }
        return sortedList;
    }

}

module.exports.ColumnValueAssert = ColumnValueAssert;
