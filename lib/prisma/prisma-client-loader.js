/**
 *
 * Reldens - Storage - PrismaClientLoader
 *
 */

const { PrismaModulesValidator } = require('./prisma-modules-validator');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class PrismaClientLoader
{

    static load(projectPath, customPath, connectionData, prismaModules)
    {
        let prismaClientPath = customPath;
        if(!prismaClientPath){
            prismaClientPath = FileHandler.joinPaths(projectPath, 'prisma', 'client');
        }
        if(!FileHandler.exists(prismaClientPath)){
            Logger.critical('PrismaClient path does not exist: '+prismaClientPath);
            return null;
        }
        Logger.info('Loading PrismaClient from: '+prismaClientPath);
        let prismaModule = require(prismaClientPath);
        if(!prismaModule.PrismaClient){
            Logger.critical('PrismaClient class not found at: '+prismaClientPath);
            return null;
        }
        let completedModules = Object.assign({}, prismaModules, {
            PrismaClient: prismaModule.PrismaClient,
            Prisma: prismaModule.Prisma
        });
        if(!connectionData){
            Logger.info('Creating PrismaClient with default connection from schema');
            return PrismaClientLoader.createWithAdapter(completedModules, process.env.RELDENS_DB_URL);
        }
        let connectionString = connectionData.client+'://'
            +connectionData.user
            +(connectionData.password ? ':'+connectionData.password : '')
            +'@'+connectionData.host
            +':'+connectionData.port
            +'/'+connectionData.database
            +PrismaClientLoader.connectionLimitParameter(connectionData);
        Logger.info('Creating PrismaClient with connection to: '+connectionData.database);
        return PrismaClientLoader.createWithAdapter(completedModules, connectionString);
    }

    /**
     * @param {Object} prismaModules
     * @param {string} connectionUrl
     * @returns {Object|null}
     */
    static connectionLimitParameter(connectionData)
    {
        let connectionLimit = sc.get(connectionData, 'connectionLimit', false);
        if(!connectionLimit){
            return '';
        }
        return '?connectionLimit='+connectionLimit;
    }

    static createWithAdapter(prismaModules, connectionUrl)
    {
        if(!PrismaModulesValidator.validate(prismaModules)){
            return null;
        }
        prismaModules.client = new prismaModules.PrismaClient({
            adapter: PrismaClientLoader.resolveAdapter(prismaModules, connectionUrl),
            log: ['error']
        });
        return prismaModules;
    }

    /**
     * @param {Object} prismaModules
     * @param {string} connectionUrl
     * @returns {Object}
     */
    static resolveAdapter(prismaModules, connectionUrl)
    {
        if(sc.isObject(prismaModules.adapter)){
            return prismaModules.adapter;
        }
        return new prismaModules.PrismaAdapter(connectionUrl);
    }

}

module.exports.PrismaClientLoader = PrismaClientLoader;
