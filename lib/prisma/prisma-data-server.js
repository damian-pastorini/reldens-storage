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
            let statements = this.splitSqlStatements(content);
            let results = [];
            for(let statement of statements){
                let cleanStatement = statement.trim();
                if('' === cleanStatement){
                    continue;
                }
                try {
                    let queryResult = await this.prisma.$executeRawUnsafe(cleanStatement);
                    results.push(queryResult);
                } catch(stmtError) {
                    Logger.error('Statement "'+cleanStatement+'" execution failed: '+stmtError.message);
                    return false;
                }
            }
            if(0 === results.length){
                return false;
            }
            return 1 === results.length ? results[0] : results;
        } catch(error) {
            Logger.error('Raw query failed: '+error.message);
            return false;
        }
    }

    splitSqlStatements(sqlContent)
    {
        let statements = [];
        let currentStatement = '';
        let inQuote = false;
        let quoteChar = '';
        let inComment = false;
        let commentType = '';
        for(let i = 0; i < sqlContent.length; i++){
            let char = sqlContent.charAt(i);
            let nextChar = i < sqlContent.length - 1 ? sqlContent.charAt(i + 1) : '';
            if(inComment){
                let shouldEndComment = false;
                if('*' === commentType && '*' === char && '/' === nextChar){
                    shouldEndComment = true;
                    i++;
                }
                if('-' === commentType && '\n' === char){
                    shouldEndComment = true;
                }
                if(shouldEndComment){
                    inComment = false;
                }
                continue;
            }
            let shouldStartComment = this.shouldStartComment(char, nextChar, inQuote);
            if(shouldStartComment){
                inComment = true;
                commentType = '/' === char ? '*' : '-';
                continue;
            }
            let isQuoteChar = ('"' === char || '\'' === char || '`' === char);
            let isEscaped = (i > 0 && '\\' === sqlContent.charAt(i-1));
            if(isQuoteChar && !isEscaped){
                if(!inQuote){
                    inQuote = true;
                    quoteChar = char;
                    currentStatement += char;
                    continue;
                }
                let shouldEndQuote = quoteChar === char;
                if(shouldEndQuote){
                    inQuote = false;
                }
                currentStatement += char;
                continue;
            }
            let shouldEndStatement = (';' === char && !inQuote);
            if(shouldEndStatement){
                statements.push(currentStatement);
                currentStatement = '';
                continue;
            }
            currentStatement += char;
        }
        let hasRemainingStatement = '' !== currentStatement.trim();
        if(hasRemainingStatement){
            statements.push(currentStatement);
        }
        return statements;
    }

    shouldStartComment(char, nextChar, inQuote)
    {
        if(inQuote){
            return false;
        }
        let isBlockComment = ('/' === char && '*' === nextChar);
        let isLineComment = ('-' === char && '-' === nextChar);
        return isBlockComment || isLineComment;
    }

    async fetchEntitiesFromDatabase()
    {
        if(!this.initialized){
            Logger.critical('Connection was not initialized, please use the connect method first.');
            return false;
        }
        try {
            return await MySQLTablesProvider.fetchTables(this);
        } catch(error) {
            Logger.critical('Prisma Data Server tables fetch failed. '+error.message);
            return false;
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
