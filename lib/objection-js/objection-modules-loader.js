/**
 *
 * Reldens - Storage - ObjectionModulesLoader
 *
 */

const { ObjectionModulesValidator } = require('./objection-modules-validator');
const { PackageResolver } = require('@reldens/server-utils');
const { Logger } = require('@reldens/utils');

class ObjectionModulesLoader
{

    static load(projectPath)
    {
        let objection = PackageResolver.loadPackage('objection', projectPath);
        if(!objection){
            Logger.critical(PackageResolver.error.message, PackageResolver.error.error);
            return false;
        }
        let objectionModules = {Model: objection.Model};
        if(!ObjectionModulesValidator.validate(objectionModules)){
            return false;
        }
        return objectionModules;
    }

}

module.exports.ObjectionModulesLoader = ObjectionModulesLoader;
