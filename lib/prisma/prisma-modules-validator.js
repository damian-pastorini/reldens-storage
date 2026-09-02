/**
 *
 * Reldens - PrismaModulesValidator
 *
 */

const { Logger, sc } = require('@reldens/utils');

class PrismaModulesValidator
{

    static validate(prismaModules)
    {
        if(!sc.isObject(prismaModules)){
            Logger.critical('Missing "prismaModules" object.');
            return false;
        }
        if(!sc.isObject(prismaModules.Prisma) || !sc.hasOwn(prismaModules.Prisma, 'DbNull')){
            Logger.critical('Invalid "prismaModules.Prisma", "DbNull" not found.');
            return false;
        }
        if(prismaModules.client){
            return PrismaModulesValidator.validateClientInstance(prismaModules.client);
        }
        if(!sc.isFunction(prismaModules.PrismaClient)){
            Logger.critical('Invalid "prismaModules.PrismaClient".');
            return false;
        }
        if(sc.isObject(prismaModules.adapter)){
            return true;
        }
        if(!sc.isFunction(prismaModules.PrismaAdapter)){
            Logger.critical('Missing "prismaModules.adapter" instance or "prismaModules.PrismaAdapter" class.');
            return false;
        }
        return true;
    }

    static validateClientInstance(client)
    {
        let requiredMethods = [
            '$connect',
            '$disconnect',
            '$queryRaw',
            '$queryRawUnsafe',
            '$executeRawUnsafe',
            '$transaction'
        ];
        let missingMethods = requiredMethods.filter(method => !sc.isFunction(client[method]));
        if(0 < missingMethods.length){
            Logger.critical('Invalid Prisma client instance, missing: '+missingMethods.join(', '));
            return false;
        }
        if(!sc.isObject(sc.get(client, '_runtimeDataModel', false))){
            Logger.critical('Invalid Prisma client instance, "_runtimeDataModel" not found.');
            return false;
        }
        return true;
    }

}

module.exports.PrismaModulesValidator = PrismaModulesValidator;
