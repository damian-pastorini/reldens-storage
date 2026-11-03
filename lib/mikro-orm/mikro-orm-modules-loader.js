/**
 *
 * Reldens - Storage - MikroOrmModulesLoader
 *
 */

const { MikroOrmModulesValidator } = require('./mikro-orm-modules-validator');
const { PackageResolver } = require('@reldens/server-utils');
const { Logger } = require('@reldens/utils');

class MikroOrmModulesLoader
{

    static load(projectPath, client)
    {
        let mikroOrmCore = PackageResolver.loadPackage('@mikro-orm/core', projectPath);
        if(!mikroOrmCore){
            Logger.critical(PackageResolver.error.message, PackageResolver.error.error);
            return false;
        }
        let mikroOrmModules = {
            MikroORM: mikroOrmCore.MikroORM,
            EntityCaseNamingStrategy: mikroOrmCore.EntityCaseNamingStrategy,
            Collection: mikroOrmCore.Collection,
            EntitySchema: mikroOrmCore.EntitySchema
        };
        MikroOrmModulesLoader.appendClientDriver(mikroOrmModules, projectPath, client);
        if(!MikroOrmModulesValidator.validate(mikroOrmModules, client)){
            return false;
        }
        return mikroOrmModules;
    }

    static appendClientDriver(mikroOrmModules, projectPath, client)
    {
        if('mongodb' === client){
            let mongoPackage = PackageResolver.loadPackage('@mikro-orm/mongodb', projectPath);
            if(mongoPackage){
                mikroOrmModules.MongoDriver = mongoPackage.MongoDriver;
                return mikroOrmModules;
            }
            Logger.critical(PackageResolver.error.message, PackageResolver.error.error);
            return mikroOrmModules;
        }
        let mysqlPackage = PackageResolver.loadPackage('@mikro-orm/mysql', projectPath);
        if(mysqlPackage){
            mikroOrmModules.MySqlDriver = mysqlPackage.MySqlDriver;
            return mikroOrmModules;
        }
        Logger.critical(PackageResolver.error.message, PackageResolver.error.error);
        return mikroOrmModules;
    }

}

module.exports.MikroOrmModulesLoader = MikroOrmModulesLoader;
