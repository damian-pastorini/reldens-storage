/**
 *
 * Reldens - PrismaDataServer
 *
 */

const { BaseDataServer } = require('../base-data-server');
const { PrismaDriver } = require('./prisma-driver');
const { MySQLTablesProvider } = require('../mysql-tables-provider');
const { ErrorManager, Logger, sc } = require('@reldens/utils');

class PrismaDataServer extends BaseDataServer
{

    constructor(props)
    {
        super(props);
        this.prisma = false;
    }

    async connect()
    {
        if(this.initialized){
            return this.initialized;
        }
        try {
            let { PrismaClient } = require('@prisma/client');
            this.prisma = new PrismaClient({
                log: this.debug ? ['query', 'info', 'warn', 'error'] : ['error']
            });
            await this.prisma.$connect();
            this.initialized = Date.now();
            return this.initialized;
        } catch(error) {
            Logger.critical('Connection failed, Prisma error: '+error.message);
        }
        return false;
    }

    generateEntities()
    {
        if(!this.initialized){
            Logger.warning('Connection was not initialized, please use the connect method first.');
            return {};
        }
        if(!this.rawEntities){
            Logger.warning('Empty raw entities array, none entities generated.');
            return {};
        }
        this.entities = {};
        for(let i of Object.keys(this.rawEntities)){
            let rawEntity = this.rawEntities[i];
            let modelName = i.toLowerCase();
            if(!this.prisma[modelName]){
                Logger.critical('Invalid raw entity "'+i+'". No matching Prisma model found.');
                continue;
            }
            this.entities[i] = new PrismaDriver({
                rawModel: rawEntity,
                id: i,
                name: i,
                config: this.config,
                prisma: this.prisma,
                model: this.prisma[modelName],
                server: this
            });
        }
        this.entityManager.setEntities(this.entities);
        return this.entities;
    }

    name()
    {
        return this.name || 'Prisma Data Server Driver';
    }

    async rawQuery(content)
    {
        try {
            let queryResult = await this.prisma.$queryRawUnsafe(content);
            if(!sc.isArray(queryResult) || 0 === queryResult.length){
                return false;
            }
            return queryResult;
        } catch(error) {
            Logger.error('Raw query failed: '+error.message);
            return false;
        }
    }

    async fetchEntitiesFromDatabase()
    {
        if(!this.initialized){
            Logger.error('Connection was not initialized, please use the connect method first.');
            return false;
        }
        try {
            return await MySQLTablesProvider.fetchTables(this);
        } catch(error) {
            ErrorManager.error('Failed to fetch tables from database: '+error.message);
        }
    }

    async disconnect()
    {
        if(this.prisma){
            await this.prisma.$disconnect();
        }
        this.initialized = false;
    }

}

module.exports.PrismaDataServer = PrismaDataServer;
