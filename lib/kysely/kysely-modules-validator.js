/**
 *
 * Reldens - KyselyModulesValidator
 *
 */

const { Logger, sc } = require('@reldens/utils');

class KyselyModulesValidator
{

    static validate(kyselyModules)
    {
        if(!sc.isObject(kyselyModules)){
            Logger.critical('Missing "kyselyModules" object.');
            return false;
        }
        if(!sc.isFunction(kyselyModules.sql)){
            Logger.critical('Invalid "kyselyModules.sql".');
            return false;
        }
        if(!sc.isFunction(kyselyModules.sql.raw)){
            Logger.critical('Invalid "kyselyModules.sql", "raw" not found.');
            return false;
        }
        if(kyselyModules.db){
            return KyselyModulesValidator.validateDbInstance(kyselyModules.db);
        }
        if(!sc.isFunction(kyselyModules.Kysely)){
            Logger.critical('Invalid "kyselyModules.Kysely".');
            return false;
        }
        if(!sc.isFunction(kyselyModules.MysqlDialect)){
            Logger.critical('Invalid "kyselyModules.MysqlDialect".');
            return false;
        }
        return true;
    }

    static validateDbInstance(db)
    {
        let requiredMethods = ['selectFrom', 'insertInto', 'updateTable', 'deleteFrom', 'destroy'];
        let missingMethods = requiredMethods.filter(method => !sc.isFunction(db[method]));
        if(0 < missingMethods.length){
            Logger.critical('Invalid Kysely instance, missing: '+missingMethods.join(', '));
            return false;
        }
        return true;
    }

}

module.exports.KyselyModulesValidator = KyselyModulesValidator;
