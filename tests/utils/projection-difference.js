/**
 *
 * Reldens - Projection Difference
 * Compares two normalised entity projections and returns every path where they diverge, so a cross driver
 * assertion can name the exact key that broke the contract instead of only stating that the results differ.
 * Keys listed as volatile (database generated timestamps) are compared by type only, since every driver
 * writes them at a different moment.
 *
 */

const { sc } = require('@reldens/utils');

class ProjectionDifference
{

    static missingKeyLabel = 'key-not-present';

    static collect(expected, actual, volatileKeys)
    {
        let differences = [];
        this.compareValues(expected, actual, 'result', differences, volatileKeys);
        return differences;
    }

    static compareValues(expected, actual, path, differences, volatileKeys)
    {
        if(this.isVolatilePath(path, volatileKeys)){
            this.compareTypes(expected, actual, path, differences);
            return;
        }
        if(this.typeName(expected) !== this.typeName(actual)){
            differences.push({path, expected: this.render(expected), actual: this.render(actual)});
            return;
        }
        if(sc.isArray(expected)){
            this.compareArrays(expected, actual, path, differences, volatileKeys);
            return;
        }
        if(sc.isObject(expected)){
            this.compareObjects(expected, actual, path, differences, volatileKeys);
            return;
        }
        if(expected === actual){
            return;
        }
        differences.push({path, expected: this.render(expected), actual: this.render(actual)});
    }

    static compareArrays(expected, actual, path, differences, volatileKeys)
    {
        if(expected.length !== actual.length){
            differences.push({
                path: path+'.length',
                expected: this.render(expected.length),
                actual: this.render(actual.length)
            });
            return;
        }
        for(let index = 0; index < expected.length; index++){
            this.compareValues(expected[index], actual[index], path+'['+index+']', differences, volatileKeys);
        }
    }

    static compareObjects(expected, actual, path, differences, volatileKeys)
    {
        for(let key of Object.keys(expected)){
            if(!sc.hasOwn(actual, key)){
                differences.push({
                    path: path+'.'+key,
                    expected: this.render(expected[key]),
                    actual: ProjectionDifference.missingKeyLabel
                });
                continue;
            }
            this.compareValues(expected[key], actual[key], path+'.'+key, differences, volatileKeys);
        }
        for(let key of Object.keys(actual)){
            if(sc.hasOwn(expected, key)){
                continue;
            }
            differences.push({
                path: path+'.'+key,
                expected: ProjectionDifference.missingKeyLabel,
                actual: this.render(actual[key])
            });
        }
    }

    static compareTypes(expected, actual, path, differences)
    {
        if(this.typeName(expected) === this.typeName(actual)){
            return;
        }
        differences.push({path, expected: this.render(expected), actual: this.render(actual)});
    }

    static isVolatilePath(path, volatileKeys)
    {
        if(!sc.isArray(volatileKeys)){
            return false;
        }
        return -1 !== volatileKeys.indexOf(path.split('.').pop());
    }

    static typeName(value)
    {
        if(null === value){
            return 'null';
        }
        if(sc.isArray(value)){
            return 'array';
        }
        if(sc.isObject(value)){
            return 'object';
        }
        return typeof value;
    }

    static render(value)
    {
        if(null === value){
            return 'null';
        }
        if(sc.isArray(value)){
            return 'array(length='+value.length+')';
        }
        if(sc.isObject(value)){
            return 'object(keys='+Object.keys(value).join('|')+')';
        }
        return typeof value+'('+String(value)+')';
    }

    static describe(driverName, referenceDriverName, entityName, methodLabel, differences)
    {
        let lines = [];
        for(let difference of differences){
            lines.push(
                'driver: '+driverName
                +' | method: '+methodLabel
                +' | entity: '+entityName
                +' | key: '+difference.path
                +' | '+referenceDriverName+' returned: '+difference.expected
                +' | '+driverName+' returned: '+difference.actual
            );
        }
        return lines;
    }

}

module.exports.ProjectionDifference = ProjectionDifference;
