/**
 *
 * Reldens - KnexModulesValidator
 *
 */

const { Logger, sc } = require('@reldens/utils');

class KnexModulesValidator
{

    static validate(knexModules)
    {
        if(!sc.isObject(knexModules)){
            Logger.critical('Missing "knexModules" object.');
            return false;
        }
        if(knexModules.knex){
            return KnexModulesValidator.validateKnexInstance(knexModules.knex);
        }
        if(!sc.isFunction(knexModules.Knex)){
            Logger.critical('Invalid "knexModules.Knex".');
            return false;
        }
        return true;
    }

    static validateKnexInstance(knexInstance)
    {
        if(!sc.isFunction(knexInstance)){
            Logger.critical('Invalid Knex instance, it must be callable.');
            return false;
        }
        let requiredMethods = ['raw', 'destroy'];
        let missingMethods = requiredMethods.filter(method => !sc.isFunction(knexInstance[method]));
        if(0 < missingMethods.length){
            Logger.critical('Invalid Knex instance, missing: '+missingMethods.join(', '));
            return false;
        }
        return true;
    }

}

module.exports.KnexModulesValidator = KnexModulesValidator;
