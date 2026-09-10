/**
 *
 * Reldens - Storage - DrizzleModulesLoader
 *
 */

const { DrizzleModulesValidator } = require('./drizzle-modules-validator');
const { PackageResolver } = require('../package-resolver');

class DrizzleModulesLoader
{

    static load(projectPath)
    {
        let orm = PackageResolver.loadPackage('drizzle-orm', projectPath);
        if(!orm){
            return false;
        }
        let mysql2Driver = PackageResolver.loadPackage('drizzle-orm/mysql2', projectPath);
        if(!mysql2Driver){
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
