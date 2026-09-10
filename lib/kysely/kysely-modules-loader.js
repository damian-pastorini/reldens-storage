/**
 *
 * Reldens - Storage - KyselyModulesLoader
 *
 */

const { KyselyModulesValidator } = require('./kysely-modules-validator');
const { PackageResolver } = require('../package-resolver');

class KyselyModulesLoader
{

    static load(projectPath)
    {
        let kysely = PackageResolver.loadPackage('kysely', projectPath);
        if(!kysely){
            return false;
        }
        let kyselyModules = {Kysely: kysely.Kysely, MysqlDialect: kysely.MysqlDialect, sql: kysely.sql};
        if(!KyselyModulesValidator.validate(kyselyModules)){
            return false;
        }
        return kyselyModules;
    }

}

module.exports.KyselyModulesLoader = KyselyModulesLoader;
