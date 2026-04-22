/**
 *
 * Reldens - PrismaDataServer
 *
 */

const { BaseDataServer } = require('../base-data-server');
const { PrismaDriver } = require('./prisma-driver');
const { MySQLTablesProvider } = require('../mysql-tables-provider');
const { PrismaClient, Prisma } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class PrismaDataServer extends BaseDataServer
{

    constructor(props)
    {
        super(props);
        this.prisma = sc.get(props, 'prismaClient', false);
        this.projectRoot = sc.get(props, 'projectRoot', false);
        this.allRelationMappings = {};
    }

    async connect()
    {
        if(this.initialized){
            return this.initialized;
        }
        try {
            if(!this.prisma && this.defaultClientIsGenerated()){
                this.prisma = new PrismaClient({
                    adapter: new PrismaMariaDb(this.connectString),
                    log: this.debug ? ['query', 'info', 'warn', 'error'] : ['error']
                });
            }
            if(!this.prisma){
                Logger.error('Prisma client could not be initialized.');
                return false;
            }
            await this.prisma.$connect();
            let dbTest = await this.prisma.$queryRaw`SELECT DATABASE() as current_db`;
            Logger.info('Connected to database: ' + dbTest[0].current_db);
            this.initialized = Date.now();
            return this.initialized;
        } catch(error) {
            Logger.critical('Connection failed, Prisma error: '+error.message);
        }
        return false;
    }

    defaultClientIsGenerated()
    {
        let existsFromProjectRoot = false;
        if(this.projectRoot){
            existsFromProjectRoot = FileHandler.exists(FileHandler.joinPaths(
                this.projectRoot, 'node_modules', '@prisma', 'client', 'index.js'
            ));
        }
        let existsFromRelativePath = FileHandler.exists(FileHandler.joinPaths(
            __dirname, '..', '..', '..', '@prisma', 'client', 'index.js'
        ));
        return existsFromProjectRoot || existsFromRelativePath;
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
        this.collectAllRelationMappings();
        this.entities = {};
        for(let i of Object.keys(this.rawEntities)){
            let rawEntity = this.rawEntities[i];
            let tableName = rawEntity.tableName;
            let prismaModel = this.prisma[tableName];
            if(!prismaModel){
                Logger.critical('Invalid raw entity "'+i+'". No matching Prisma model found for "'+tableName+'".');
                continue;
            }
            this.entities[i] = new PrismaDriver({
                rawModel: rawEntity,
                id: i,
                name: i,
                config: this.config,
                prisma: this.prisma,
                model: prismaModel,
                server: this,
                allRelationMappings: this.allRelationMappings,
                prismaDbNull: Prisma.DbNull
            });
        }
        this.entityManager.setEntities(this.entities);
        return this.entities;
    }

    collectAllRelationMappings()
    {
        for(let i of Object.keys(this.rawEntities)){
            let rawEntity = this.rawEntities[i];
            let tableName = rawEntity.tableName;
            if(rawEntity.relationMappings){
                this.allRelationMappings[tableName] = rawEntity.relationMappings;
            }
        }
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
                    let result = await this.executeStatement(cleanStatement);
                    results.push(result);
                    //Logger.debug('Statement executed, result: ' + JSON.stringify(result));
                } catch(stmtError) {
                    Logger.error('Statement "'+cleanStatement+'" execution failed: '+stmtError.message);
                    return false;
                }
            }
            if(0 === results.length){
                //Logger.error('Statement results length is zero.', results);
                return false;
            }
            return 1 === results.length ? [...results].shift() : results;
        } catch(error) {
            Logger.error('Raw query failed: '+error.message);
            return false;
        }
    }

    async executeStatement(statement)
    {
        let trimmedStatement = statement.trim().toUpperCase();
        if(trimmedStatement.startsWith('SELECT')){
            return await this.prisma.$queryRawUnsafe(statement);
        }
        if(trimmedStatement.startsWith('SHOW')){
            return await this.prisma.$queryRawUnsafe(statement);
        }
        let result = await this.prisma.$executeRawUnsafe(statement);
        //Logger.debug('Raw result from Prisma: ' + result);
        if(
            trimmedStatement.startsWith('CREATE')
            || trimmedStatement.startsWith('ALTER')
            || trimmedStatement.startsWith('DROP')
        ){
            return {affectedRows: result};
        }
        return result;
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
