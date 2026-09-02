/**
 *
 * Reldens - PrismaDataServer
 *
 */

const { BaseDataServer } = require('../base-data-server');
const { PrismaDriver } = require('./prisma-driver');
const { MySQLTablesProvider } = require('../mysql-tables-provider');
const { PrismaModulesValidator } = require('./prisma-modules-validator');
const { PrismaClientLoader } = require('./prisma-client-loader');
const { Logger, sc } = require('@reldens/utils');

class PrismaDataServer extends BaseDataServer
{

    constructor(props)
    {
        super(props);
        this.prismaModules = sc.get(props, 'prismaModules', false);
        this.prisma = sc.get(this.prismaModules, 'client', false);
        this.projectRoot = sc.get(props, 'projectRoot', false);
        this.allRelationMappings = {};
    }

    async connect()
    {
        if(this.initialized){
            return this.initialized;
        }
        if(!PrismaModulesValidator.validate(this.prismaModules)){
            return false;
        }
        try {
            if(!this.prisma){
                this.prisma = new this.prismaModules.PrismaClient({
                    adapter: PrismaClientLoader.resolveAdapter(this.prismaModules, this.connectString),
                    log: this.debug ? ['query', 'info', 'warn', 'error'] : ['error']
                });
                this.prismaModules.client = this.prisma;
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
                prismaDbNull: this.prismaModules.Prisma.DbNull
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
            let statements = this.splitSqlStatements(content)
                .map(s => s.trim())
                .filter(s => '' !== s);
            if(0 === statements.length){
                return false;
            }
            let results = [];
            await this.prisma.$transaction(
                async (tx) => { results = await this.executeStatements(statements, tx); },
                {timeout: 60000}
            );
            return 1 === results.length ? results[0] : results;
        } catch(error) {
            Logger.error('Raw query failed: '+error.message);
            return false;
        }
    }

    async executeStatements(statements, tx)
    {
        let results = [];
        for(let statement of statements){
            let result = await this.executeStatement(statement, tx);
            //Logger.debug('Statement executed, result: ' + JSON.stringify(result));
            results.push(result);
        }
        return results;
    }

    async executeStatement(statement, prismaClient)
    {
        let client = prismaClient || this.prisma;
        let trimmedStatement = statement.trim().toUpperCase();
        if(trimmedStatement.startsWith('SELECT') || trimmedStatement.startsWith('SHOW')){
            return await client.$queryRawUnsafe(statement);
        }
        let result = await client.$executeRawUnsafe(statement);
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
