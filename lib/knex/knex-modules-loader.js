/**
 *
 * Reldens - Storage - KnexModulesLoader
 *
 */

const { KnexModulesValidator } = require('./knex-modules-validator');
const { PackageResolver } = require('@reldens/server-utils');
const { Logger } = require('@reldens/utils');

class KnexModulesLoader
{

    static load(projectPath)
    {
        let knex = PackageResolver.loadPackage('knex', projectPath);
        if(!knex){
            Logger.critical(PackageResolver.error.message, PackageResolver.error.error);
            return false;
        }
        let knexModules = {Knex: knex};
        if(!KnexModulesValidator.validate(knexModules)){
            return false;
        }
        return knexModules;
    }

}

module.exports.KnexModulesLoader = KnexModulesLoader;
