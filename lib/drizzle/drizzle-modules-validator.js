/**
 *
 * Reldens - DrizzleModulesValidator
 *
 */

const { Logger, sc } = require('@reldens/utils');

let requiredOrmFunctions = [
    'eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'inArray', 'like', 'isNull', 'and', 'or', 'not', 'asc', 'desc', 'count'
];

class DrizzleModulesValidator
{

    static validate(drizzleModules)
    {
        if(!sc.isObject(drizzleModules)){
            Logger.critical('Missing "drizzleModules" object.');
            return false;
        }
        if(!DrizzleModulesValidator.validateOrm(drizzleModules.orm)){
            return false;
        }
        if(drizzleModules.db){
            return DrizzleModulesValidator.validateDbInstance(drizzleModules.db);
        }
        if(!sc.isFunction(drizzleModules.drizzle)){
            Logger.critical('Invalid "drizzleModules.drizzle".');
            return false;
        }
        return true;
    }

    static validateOrm(orm)
    {
        if(!sc.isObject(orm)){
            Logger.critical('Missing "drizzleModules.orm" namespace.');
            return false;
        }
        let missingFunctions = requiredOrmFunctions.filter(ormFunction => !sc.isFunction(orm[ormFunction]));
        if(0 < missingFunctions.length){
            Logger.critical('Invalid "drizzleModules.orm", missing: '+missingFunctions.join(', '));
            return false;
        }
        if(!sc.isFunction(orm.sql)){
            Logger.critical('Invalid "drizzleModules.orm", "sql" not found.');
            return false;
        }
        if(!sc.isFunction(orm.sql.raw)){
            Logger.critical('Invalid "drizzleModules.orm", "sql.raw" not found.');
            return false;
        }
        return true;
    }

    static validateDbInstance(db)
    {
        let requiredMethods = ['select', 'insert', 'update', 'delete', 'execute'];
        let missingMethods = requiredMethods.filter(method => !sc.isFunction(db[method]));
        if(0 < missingMethods.length){
            Logger.critical('Invalid Drizzle instance, missing: '+missingMethods.join(', '));
            return false;
        }
        if(!sc.isObjectFunction(db.$client, 'end')){
            Logger.critical('Invalid Drizzle instance, "$client.end" not found.');
            return false;
        }
        return true;
    }

}

module.exports.DrizzleModulesValidator = DrizzleModulesValidator;
