/**
 *
 * Reldens - ObjectionModulesValidator
 *
 */

const { Logger, sc } = require('@reldens/utils');

class ObjectionModulesValidator
{

    static validate(objectionModules)
    {
        if(!sc.isObject(objectionModules)){
            Logger.critical('Missing "objectionModules" object.');
            return false;
        }
        if(!sc.isFunction(objectionModules.Model)){
            Logger.critical('Invalid "objectionModules.Model".');
            return false;
        }
        if(!sc.isFunction(objectionModules.Model.knex)){
            Logger.critical('Invalid "objectionModules.Model", "knex" not found.');
            return false;
        }
        return true;
    }

}

module.exports.ObjectionModulesValidator = ObjectionModulesValidator;
