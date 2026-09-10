/**
 *
 * Reldens - Storage - MikroOrmModulesLoader
 *
 */

const { MikroOrmModulesValidator } = require('./mikro-orm-modules-validator');
const { PackageResolver } = require('../package-resolver');

class MikroOrmModulesLoader
{

    static load(projectPath, client)
    {
        let mikroOrmCore = PackageResolver.loadPackage('@mikro-orm/core', projectPath);
        if(!mikroOrmCore){
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
            }
            return mikroOrmModules;
        }
        let mysqlPackage = PackageResolver.loadPackage('@mikro-orm/mysql', projectPath);
        if(mysqlPackage){
            mikroOrmModules.MySqlDriver = mysqlPackage.MySqlDriver;
        }
        return mikroOrmModules;
    }

}

module.exports.MikroOrmModulesLoader = MikroOrmModulesLoader;
