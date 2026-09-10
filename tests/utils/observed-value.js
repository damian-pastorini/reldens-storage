/**
 *
 * Reldens - Observed Value
 * Shared diagnostics helper: turns any runtime value into a readable shape description and logs it, so a
 * failing assertion message states what was actually observed instead of only what was expected.
 *
 */

const { Logger } = require('@reldens/utils');

class ObservedValue
{

    static describe(value)
    {
        if(null === value){
            return 'null';
        }
        let valueType = typeof value;
        if('object' !== valueType){
            return valueType+'('+String(value)+')';
        }
        if(Array.isArray(value)){
            return 'Array[length='+value.length+']('+value.join(',')+')';
        }
        if(!value.constructor){
            return 'NoConstructor{'+Object.keys(value).join(',')+'}';
        }
        return value.constructor.name+'{'+Object.keys(value).join(',')+'}';
    }

    static log(label, value)
    {
        let described = this.describe(value);
        Logger.debug('      OBSERVED '+label+' => '+described);
        return described;
    }

}

module.exports.ObservedValue = ObservedValue;
