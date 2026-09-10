/**
 *
 * Reldens - Storage - ObjectionModulesLoader
 *
 */

const { ObjectionModulesValidator } = require('./objection-modules-validator');
const { PackageResolver } = require('../package-resolver');

class ObjectionModulesLoader
{

    static load(projectPath)
    {
        let objection = PackageResolver.loadPackage('objection', projectPath);
        if(!objection){
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
