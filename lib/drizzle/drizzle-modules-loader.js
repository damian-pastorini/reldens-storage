/**
 *
 * Reldens - Storage - DrizzleModulesLoader
 *
 */

const { DrizzleModulesValidator } = require('./drizzle-modules-validator');
const { PackageResolver } = require('@reldens/server-utils');
const { Logger } = require('@reldens/utils');

class DrizzleModulesLoader
{

    static load(projectPath)
    {
        let orm = PackageResolver.loadPackage('drizzle-orm', projectPath);
        if(!orm){
            Logger.critical(PackageResolver.error.message, PackageResolver.error.error);
            return false;
        }
        let mysql2Driver = PackageResolver.loadPackage('drizzle-orm/mysql2', projectPath);
        if(!mysql2Driver){
            Logger.critical(PackageResolver.error.message, PackageResolver.error.error);
            return false;
        }
        let drizzleModules = {drizzle: mysql2Driver.drizzle, orm};
        if(!DrizzleModulesValidator.validate(drizzleModules)){
            return false;
        }
        return drizzleModules;
    }

}

module.exports.DrizzleModulesLoader = DrizzleModulesLoader;
