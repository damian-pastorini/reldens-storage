/**
 *
 * Reldens - PackageResolver
 *
 */

const { Logger } = require('@reldens/utils');

class PackageResolver
{

    static loadPackage(packageName, projectPath)
    {
        try {
            return require(PackageResolver.resolvePath(packageName, projectPath));
        } catch(error) {
            Logger.critical(
                'Package "'+packageName+'" not found, install it in the project: npm install '+packageName,
                error.message
            );
            return false;
        }
    }

    static optionalPackage(packageName, projectPath)
    {
        try {
            return require(PackageResolver.resolvePath(packageName, projectPath));
        } catch(error) {
            Logger.debug('Optional package "'+packageName+'" is not available.', error.message);
            return false;
        }
    }

    static resolvePath(packageName, projectPath)
    {
        if(!projectPath){
            return packageName;
        }
        return require.resolve(packageName, {paths: [projectPath]});
    }

}

module.exports.PackageResolver = PackageResolver;
