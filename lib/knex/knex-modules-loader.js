/**
 *
 * Reldens - Storage - KnexModulesLoader
 *
 */

const { KnexModulesValidator } = require('./knex-modules-validator');
const { PackageResolver } = require('../package-resolver');

class KnexModulesLoader
{

    static load(projectPath)
    {
        let knex = PackageResolver.loadPackage('knex', projectPath);
        if(!knex){
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
