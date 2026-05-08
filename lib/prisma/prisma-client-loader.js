/**
 *
 * Reldens - Storage - PrismaClientLoader
 *
 */

const { Logger } = require('@reldens/utils');
const { FileHandler } = require('@reldens/server-utils');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');

class PrismaClientLoader
{

    static load(projectPath, customPath, connectionData)
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
        if(!connectionData){
            Logger.info('Creating PrismaClient with default connection from schema');
            return PrismaClientLoader.createWithAdapter(prismaModule.PrismaClient, process.env.DATABASE_URL);
        }
        let connectionString = connectionData.client+'://'
            +connectionData.user
            +(connectionData.password ? ':'+connectionData.password : '')
            +'@'+connectionData.host
            +':'+connectionData.port
            +'/'+connectionData.database;
        Logger.info('Creating PrismaClient with connection to: '+connectionData.database);
        return PrismaClientLoader.createWithAdapter(prismaModule.PrismaClient, connectionString);
    }

    /**
     * @param {Function} PrismaClientClass
     * @param {string} connectionUrl
     * @returns {Object}
     */
    static createWithAdapter(PrismaClientClass, connectionUrl)
    {
        return new PrismaClientClass({adapter: new PrismaMariaDb(connectionUrl), log: ['error']});
    }

}

module.exports.PrismaClientLoader = PrismaClientLoader;
