/**
 *
 * Reldens - MikroOrmModulesValidator
 *
 */

const { Logger, sc } = require('@reldens/utils');

let requiredCoreClasses = ['MikroORM', 'EntityCaseNamingStrategy', 'Collection'];

class MikroOrmModulesValidator
{

    static validate(mikroOrmModules, client)
    {
        if(!sc.isObject(mikroOrmModules)){
            Logger.critical('Missing "mikroOrmModules" object.');
            return false;
        }
        let missingClasses = requiredCoreClasses.filter(coreClass => !sc.isFunction(mikroOrmModules[coreClass]));
        if(0 < missingClasses.length){
            Logger.critical('Invalid "mikroOrmModules", missing: '+missingClasses.join(', '));
            return false;
        }
        return MikroOrmModulesValidator.validateClientDriver(mikroOrmModules, client);
    }

    static validateClientDriver(mikroOrmModules, client)
    {
        if('mongodb' === client){
            if(!sc.isFunction(mikroOrmModules.MongoDriver)){
                Logger.critical('Missing "mikroOrmModules.MongoDriver" for the "mongodb" client.');
                return false;
            }
            return true;
        }
        if(!sc.isFunction(mikroOrmModules.MySqlDriver)){
            Logger.critical('Missing "mikroOrmModules.MySqlDriver" for the "'+client+'" client.');
            return false;
        }
        return true;
    }

}

module.exports.MikroOrmModulesValidator = MikroOrmModulesValidator;
