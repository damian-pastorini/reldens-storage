/**
 *
 * Reldens - Storage - KyselyModulesLoader
 *
 */

const { KyselyModulesValidator } = require('./kysely-modules-validator');
const { PackageResolver } = require('@reldens/server-utils');
const { Logger } = require('@reldens/utils');

class KyselyModulesLoader
{

    static load(projectPath)
    {
        let kysely = PackageResolver.loadPackage('kysely', projectPath);
        if(!kysely){
            Logger.critical(PackageResolver.error.message, PackageResolver.error.error);
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
