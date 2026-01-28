/**
 *
 * Reldens - Storage Test Helpers
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { Model } = require('objection');

class TestHelpers
{
    static getTestDbConfig()
    {
        return {
            host: process.env.RELDENS_TEST_DB_HOST || 'localhost',
            port: parseInt(process.env.RELDENS_TEST_DB_PORT) || 3306,
            user: process.env.RELDENS_TEST_DB_USER || 'test_user',
            password: process.env.RELDENS_TEST_DB_PASSWORD || 'test_password',
            database: process.env.RELDENS_TEST_DB_NAME || 'reldens_storage_test',
            client: process.env.RELDENS_TEST_DB_CLIENT || 'mysql'
        };
    }

    static async createModelsFromDatabase(dataServer, driverName)
    {
        let tables = await dataServer.fetchEntitiesFromDatabase();
        if(!tables){
            return {};
        }
        let models = {};
        if('objection-js' === driverName){
            for(let tableName of Object.keys(tables)){
                let entityName = sc.camelCase(tableName.replace('test_', ''));
                let modelKey = 'test'+sc.capitalizedCamelCase(entityName);
                class DynamicModel extends Model {
                    static get tableName(){
                        return tableName;
                    }
                }
                if(dataServer.knex){
                    DynamicModel.knex(dataServer.knex);
                }
                models[modelKey] = DynamicModel;
            }
            let relationMappings = this.buildRelationMappings(tables, models);
            for(let tableName of Object.keys(tables)){
                let entityName = sc.camelCase(tableName.replace('test_', ''));
                let modelKey = 'test'+sc.capitalizedCamelCase(entityName);
                let tableRelations = relationMappings[tableName] || {};
                models[modelKey].relationMappings = tableRelations;
            }
            return models;
        }
        if('mikro-orm' === driverName){
            const { EntitySchema } = require('@mikro-orm/core');
            let tableData = {};
            let allFkRelations = [];

            // FIRST PASS: Build properties and collect FK relations
            for(let tableName of Object.keys(tables)){
                let entityName = sc.camelCase(tableName.replace('test_', ''));
                let className = sc.capitalizedCamelCase(entityName);
                let modelKey = 'test'+className;
                let tableColumns = tables[tableName].columns;
                let properties = {};
                let fkMappings = {};

                for(let columnName of Object.keys(tableColumns)){
                    let column = tableColumns[columnName];
                    if(column.referencedTable && column.referencedColumn){
                        let refTableClean = column.referencedTable.replace('test_', '');
                        let relationKey = 'related_'+refTableClean;
                        let refModelKey = 'test'+sc.capitalizedCamelCase(sc.camelCase(refTableClean));
                        fkMappings[columnName] = {
                            relationKey: relationKey,
                            entityName: refModelKey,
                            referencedColumn: column.referencedColumn,
                            nullable: column.nullable || (null !== column.default && undefined !== column.default)
                        };
                        allFkRelations.push({
                            fromTable: tableName,
                            fromEntity: modelKey,
                            toEntity: refModelKey,
                            toTableName: column.referencedTable,
                            relationKey: relationKey
                        });
                        continue;
                    }
                    properties[columnName] = {
                        type: column.type || 'string',
                        primary: 'PRI' === column.key,
                        nullable: column.nullable || (null !== column.default && undefined !== column.default)
                    };
                }

                // Add forward ManyToOne relations
                for(let fkColumn of Object.keys(fkMappings)){
                    let mapping = fkMappings[fkColumn];
                    properties[mapping.relationKey] = {
                        kind: 'm:1',
                        entity: mapping.entityName,
                        joinColumn: fkColumn,
                        nullable: mapping.nullable
                    };
                }

                tableData[modelKey] = {
                    tableName: tableName,
                    properties: properties,
                    fkMappings: fkMappings
                };
            }

            // SECOND PASS: Add reverse OneToMany relations to properties BEFORE EntitySchema creation
            for(let fkRel of allFkRelations){
                let reverseRelationKey = 'related_'+sc.camelCase(fkRel.fromTable.replace('test_', ''));
                let refTableData = tableData[fkRel.toEntity];
                if(refTableData && !refTableData.properties[reverseRelationKey]){
                    refTableData.properties[reverseRelationKey] = {
                        kind: '1:m',
                        entity: fkRel.fromEntity,
                        mappedBy: fkRel.relationKey
                    };
                }
            }

            // THIRD PASS: Create EntitySchemas with complete properties
            for(let modelKey of Object.keys(tableData)){
                let data = tableData[modelKey];
                let schema = new EntitySchema({
                    name: modelKey,
                    tableName: data.tableName,
                    properties: data.properties
                });
                schema._fkMappings = data.fkMappings;
                models[modelKey] = schema;
            }

            return models;
        }
        if('prisma' === driverName){
            // For Prisma, models are just metadata - actual models come from Prisma Client
            for(let tableName of Object.keys(tables)){
                let entityName = sc.camelCase(tableName.replace('test_', ''));
                let modelKey = 'test'+sc.capitalizedCamelCase(entityName);
                // Store table name - Prisma driver will look up actual model from client
                models[modelKey] = {tableName: tableName};
            }
            return models;
        }
        return {};
    }

    static async setupDriver(driverName, rawEntities)
    {
        try {
            Logger.info('Setting up driver: '+driverName);
            let config = this.getTestDbConfig();
            Logger.info('DB Config: '+JSON.stringify({host: config.host, port: config.port, database: config.database, user: config.user}));
            if('prisma' === driverName){
                let subprocessSuccess = await this.runPrismaSubprocess(process.cwd(), config);
                if(!subprocessSuccess){
                    throw new Error('Prisma subprocess generation failed');
                }
            }
            let serverConfig = {
                client: driverName === 'objection-js' ? 'mysql2' : 'mysql',
                config: config,
                rawEntities: rawEntities
            };
            if('prisma' === driverName){
                let prismaClient = await this.loadPrismaClient(process.cwd());
                if(!prismaClient){
                    throw new Error('Failed to load Prisma client');
                }
                serverConfig.prismaClient = prismaClient;
            }
            let DataServerClass = this.getDataServerClass(driverName);
            let dataServer = new DataServerClass(serverConfig);
            let connected = await dataServer.connect();
            if(!dataServer.initialized){
                throw new Error('DataServer failed to initialize!');
            }
            return dataServer;
        } catch(error) {
            Logger.critical('Failed to setup driver '+driverName+': '+error.message);
            Logger.critical(error.stack);
            throw error;
        }
    }

    static getDataServerClass(driverName)
    {
        if('objection-js' === driverName){
            let { ObjectionJsDataServer } = require('../../lib/objection-js/objection-js-data-server');
            return ObjectionJsDataServer;
        }
        if('mikro-orm' === driverName){
            let { MikroOrmDataServer } = require('../../lib/mikro-orm/mikro-orm-data-server');
            return MikroOrmDataServer;
        }
        if('prisma' === driverName){
            let { PrismaDataServer } = require('../../lib/prisma/prisma-data-server');
            return PrismaDataServer;
        }
        Logger.critical('Unknown driver: '+driverName);
        return false;
    }

    static async teardownDriver(dataServer)
    {
        if(!dataServer){
            return;
        }
        try {
            if(dataServer.knex){
                await dataServer.knex.destroy();
            }
            if(dataServer.orm){
                await dataServer.orm.close();
            }
            if(dataServer.prisma){
                await dataServer.prisma.$disconnect();
            }
            if(sc.hasOwn(dataServer, 'disconnect') && 'function' === typeof dataServer.disconnect){
                await dataServer.disconnect();
            }
        } catch(error) {
            Logger.warning('Error during teardown: '+error.message);
        }
    }

    static async executeRawSQL(dataServer, sql)
    {
        try {
            await dataServer.rawQuery('SET FOREIGN_KEY_CHECKS=0;');
            let statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
            for(let i = 0; i < statements.length; i++){
                let statement = statements[i].trim();
                if(!statement){
                    continue;
                }
                await dataServer.rawQuery(statement+';');
            }
            await dataServer.rawQuery('SET FOREIGN_KEY_CHECKS=1;');
            return true;
        } catch(error) {
            try {
                await dataServer.rawQuery('SET FOREIGN_KEY_CHECKS=1;');
            } catch(e) {}
            throw error;
        }
    }

    static getFixtures(driverName, entityName)
    {
        let fixturesPath = FileHandler.joinPaths(__dirname, '..', 'fixtures', entityName+'-fixtures.js');
        if(!FileHandler.exists(fixturesPath)){
            Logger.critical('Fixtures file not found: '+fixturesPath);
            return false;
        }
        let fixtures = require(fixturesPath);
        let capitalizedEntityName = sc.capitalizedCamelCase(entityName);
        let fixturesKey = capitalizedEntityName+'Fixtures';
        if(!sc.hasOwn(fixtures, fixturesKey)){
            Logger.critical('Fixtures key not found: '+fixturesKey);
            return false;
        }
        if(!sc.hasOwn(fixtures[fixturesKey], driverName)){
            Logger.critical('Driver fixtures not found: '+driverName);
            return false;
        }
        return fixtures[fixturesKey][driverName];
    }

    static async cleanDatabase(dataServer)
    {
        try {
            await dataServer.rawQuery('SET FOREIGN_KEY_CHECKS=0;');
            await dataServer.rawQuery('DELETE FROM test_reviews;');
            await dataServer.rawQuery('DELETE FROM test_products;');
            await dataServer.rawQuery('DELETE FROM test_categories;');
            await dataServer.rawQuery('SET FOREIGN_KEY_CHECKS=1;');
            if(dataServer.orm && dataServer.orm.em){
                await dataServer.orm.em.clear();
            }
            return true;
        } catch(error) {
            try {
                await dataServer.rawQuery('SET FOREIGN_KEY_CHECKS=1;');
            } catch(e) {}
            return false;
        }
    }

    static async insertFixturesViaRawSQL(dataServer, tableName, fixtures)
    {
        for(let fixture of fixtures){
            let sql = this.generateInsertSQL(tableName, fixture);
            await dataServer.rawQuery(sql);
        }
    }

    static generateInsertSQL(tableName, data)
    {
        let columns = Object.keys(data);
        let values = columns.map(col => this.formatSQLValue(data[col]));
        return 'INSERT INTO '+tableName+' ('+columns.join(', ')+') VALUES ('+values.join(', ')+')';
    }

    static formatSQLValue(value)
    {
        if(null === value || undefined === value){
            return 'NULL';
        }
        if('number' === typeof value){
            return value;
        }
        if('boolean' === typeof value){
            return value ? 1 : 0;
        }
        if('object' === typeof value){
            let json = JSON.stringify(value).replace(/'/g, "\\'");
            return '\''+json+'\'';
        }
        let escaped = value.toString().replace(/'/g, "\\'");
        return '\''+escaped+'\'';
    }

    static async dropTestTables(dataServer)
    {
        try {
            await dataServer.rawQuery('SET FOREIGN_KEY_CHECKS=0;');
            await dataServer.rawQuery('DROP TABLE IF EXISTS test_reviews;');
            await dataServer.rawQuery('DROP TABLE IF EXISTS test_products;');
            await dataServer.rawQuery('DROP TABLE IF EXISTS test_categories;');
            await dataServer.rawQuery('SET FOREIGN_KEY_CHECKS=1;');
            return true;
        } catch(error) {
            try {
                await dataServer.rawQuery('SET FOREIGN_KEY_CHECKS=1;');
            } catch(e) {}
            return false;
        }
    }

    static createMockEntity(data)
    {
        return Object.assign({}, data);
    }

    static async assertRecordExists(repo, id)
    {
        let record = await repo.loadById(id);
        if(!record){
            Logger.critical('Record not found: '+id);
            return false;
        }
        return true;
    }

    static async assertRecordNotExists(repo, id)
    {
        let record = await repo.loadById(id);
        if(record){
            Logger.critical('Record should not exist: '+id);
            return false;
        }
        return true;
    }

    static assertRelationLoaded(record, relationName)
    {
        if(!sc.hasOwn(record, relationName)){
            Logger.critical('Relation not loaded: '+relationName);
            return false;
        }
        return true;
    }

    static verifyPackageInstallation(packageName, version)
    {
        let packagePath = FileHandler.joinPaths(
            process.cwd(),
            'node_modules',
            packageName,
            'package.json'
        );
        if(!FileHandler.exists(packagePath)){
            Logger.critical('Required package not installed: '+packageName);
            return false;
        }
        let packageJson = JSON.parse(FileHandler.readFile(packagePath));
        if(version && packageJson.version !== version){
            Logger.warning('Package '+packageName+' version mismatch. Expected: '+version+', Found: '+packageJson.version);
        }
        Logger.info('Package '+packageName+' verified: '+packageJson.version);
        return true;
    }

    static verifyAllPackages()
    {
        let required = [
            {name: 'knex', version: '3.1.0'},
            {name: 'objection', version: '3.1.5'},
            {name: 'mysql2', version: '3.16.0'},
            {name: '@mikro-orm/core', version: '6.6.4'},
            {name: '@mikro-orm/mysql', version: '6.6.4'},
            {name: '@prisma/client', version: '6.19.2'},
            {name: 'prisma', version: '6.19.2'}
        ];
        let allVerified = true;
        for(let pkg of required){
            if(!this.verifyPackageInstallation(pkg.name, pkg.version)){
                allVerified = false;
            }
        }
        return allVerified;
    }

    static async prismaClientExists()
    {
        return FileHandler.exists(FileHandler.joinPaths(
            process.cwd(),
            'prisma',
            'client',
            'index.js'
        ));
    }

    static async runPrismaSubprocess(projectRoot, config)
    {
        let { fork } = require('child_process');
        Logger.info('Forking Prisma subprocess for client generation...');
        let workerPath = FileHandler.joinPaths(__dirname, 'prisma-subprocess-worker.js');
        if(!FileHandler.exists(workerPath)){
            Logger.critical('Prisma subprocess worker not found: '+workerPath);
            return false;
        }
        let worker = fork(workerPath, [], {
            cwd: projectRoot,
            stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
            env: {...process.env}
        });
        let message = {
            projectRoot: projectRoot,
            config: config
        };
        worker.stdout.on('data', (data) => {
            Logger.info('Subprocess stdout: '+data.toString().trim());
        });
        worker.stderr.on('data', (data) => {
            Logger.error('Subprocess stderr: '+data.toString().trim());
        });
        worker.send(message);
        let subprocessCompleted = false;
        let subprocessSuccess = false;
        let workerExited = false;
        worker.on('message', (msg) => {
            subprocessCompleted = true;
            subprocessSuccess = sc.get(msg, 'success', false);
            if(!subprocessSuccess){
                Logger.error('Subprocess failed: '+sc.get(msg, 'error', 'Unknown'));
            }
        });
        worker.on('error', (error) => {
            subprocessCompleted = true;
            subprocessSuccess = false;
            Logger.error('Subprocess error: '+error.message);
        });
        worker.on('exit', (code, signal) => {
            workerExited = true;
            if(!subprocessCompleted){
                subprocessCompleted = true;
                subprocessSuccess = false;
            }
        });
        let attempts = 0;
        let maxAttempts = 1800;
        while(!subprocessCompleted && attempts < maxAttempts){
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        if(!workerExited){
            worker.kill('SIGTERM');
            await new Promise(resolve => setTimeout(resolve, 1000));
            if(!workerExited){
                worker.kill('SIGKILL');
            }
        }
        Logger.info('Prisma subprocess ended. Success: '+subprocessSuccess);
        return subprocessSuccess;
    }

    static async loadPrismaClient(projectRoot)
    {
        try {
            let clientPath = FileHandler.joinPaths(projectRoot, 'prisma', 'client');
            if(!FileHandler.exists(clientPath)){
                Logger.critical('Prisma client path does not exist: '+clientPath);
                return false;
            }
            let { PrismaClient } = require(clientPath);
            if(!PrismaClient){
                Logger.critical('PrismaClient not found in module.');
                return false;
            }
            let client = new PrismaClient();
            await client.$connect();
            return client;
        } catch(error) {
            Logger.critical('Failed to load Prisma client: '+error.message);
            return false;
        }
    }

    static cleanupGeneratedFiles()
    {
        let prismaPath = FileHandler.joinPaths(process.cwd(), 'prisma');
        if(FileHandler.exists(prismaPath)){
            Logger.info('Cleaning up Prisma folder: '+prismaPath);
            FileHandler.remove(prismaPath);
        }
        let entitiesPath = FileHandler.joinPaths(process.cwd(), 'generated-entities');
        if(FileHandler.exists(entitiesPath)){
            Logger.info('Cleaning up generated entities folder: '+entitiesPath);
            FileHandler.remove(entitiesPath);
        }
    }

    static async generatePrismaSchema(config)
    {
        let cmd = 'npx reldens-storage-prisma'
            +' --host='+config.host
            +' --port='+config.port
            +' --user='+config.user
            +' --password='+config.password
            +' --database='+config.database
            +' --client='+config.client;
        Logger.info('Generating Prisma schema...');
        try {
            let { stdout, stderr } = await execAsync(cmd);
            if(stderr){
                Logger.warning('Prisma schema generation stderr: '+stderr);
            }
            Logger.info('Prisma schema generated successfully');
            return true;
        } catch(error) {
            Logger.critical('Failed to generate Prisma schema: '+error.message);
            return false;
        }
    }

    static async generatePrismaClient()
    {
        let schemaPath = FileHandler.joinPaths(process.cwd(), 'prisma', 'schema.prisma');
        if(!FileHandler.exists(schemaPath)){
            Logger.critical('Prisma schema not found at: '+schemaPath);
            return false;
        }
        let cmd = 'npx prisma generate --schema='+schemaPath;
        Logger.info('Generating Prisma client...');
        try {
            let { stdout, stderr } = await execAsync(cmd);
            if(stderr && !stderr.includes('Generated Prisma Client')){
                Logger.warning('Prisma client generation stderr: '+stderr);
            }
            Logger.info('Prisma client generated successfully');
            return true;
        } catch(error) {
            Logger.critical('Failed to generate Prisma client: '+error.message);
            return false;
        }
    }

    static async ensurePrismaClientGenerated(config)
    {
        if(await this.prismaClientExists()){
            Logger.info('Prisma client already exists');
            return true;
        }
        Logger.warning('Prisma client not found, generating...');
        let schemaPath = FileHandler.joinPaths(process.cwd(), 'prisma', 'schema.prisma');
        if(!FileHandler.exists(schemaPath)){
            Logger.info('Prisma schema not found, generating from database...');
            if(!await this.generatePrismaSchema(config)){
                return false;
            }
        }
        return await this.generatePrismaClient();
    }

    static async setupTestSchema(driver, schemaPath)
    {
        Logger.info('Setting up test schema from: '+schemaPath);
        if(!FileHandler.exists(schemaPath)){
            Logger.critical('Schema file not found: '+schemaPath);
            return false;
        }
        let schemaSql = FileHandler.readFile(schemaPath);
        let statements = schemaSql.split(';').filter(stmt => stmt.trim().length > 0);
        for(let statement of statements){
            try {
                await driver.rawQuery(statement+';');
            } catch(error) {
                Logger.critical('Failed to execute schema statement: '+error.message);
                return false;
            }
        }
        Logger.info('Test schema setup complete');
        return true;
    }

    static async generateTestEntities(dataServer, driverName)
    {
        // For MikroORM: Need to reconnect with entities
        if('mikro-orm' === driverName){
            let models = await this.createModelsFromDatabase(dataServer, driverName);
            if(!models || 0 === Object.keys(models).length){
                throw new Error('Failed to create models from database for '+driverName);
            }
            // Disconnect and reconnect with entities
            await dataServer.disconnect();
            dataServer.initialized = false;
            dataServer.rawEntities = models;
            await dataServer.connect();
            let result = await dataServer.generateEntities();
            if(0 === Object.keys(dataServer.entities).length){
                throw new Error('No entities were generated for '+driverName);
            }
            return true;
        }
        // For Prisma: Generate schema and client ONCE per test suite (not per test file)
        if('prisma' === driverName){
            let config = this.getTestDbConfig();
            config.client = 'mysql';
            // Only generate if schema doesn't exist or client isn't generated
            let schemaPath = FileHandler.joinPaths(process.cwd(), 'prisma', 'schema.prisma');
            if(!FileHandler.exists(schemaPath)){
                if(!await this.generatePrismaSchema(config)){
                    throw new Error('Failed to generate Prisma schema');
                }
                if(!await this.generatePrismaClient()){
                    throw new Error('Failed to generate Prisma client');
                }
                await dataServer.disconnect();
                delete require.cache[require.resolve('@prisma/client')];
                await dataServer.connect();
            }
            let models = await this.createModelsFromDatabase(dataServer, driverName);
            if(!models || 0 === Object.keys(models).length){
                throw new Error('Failed to create models from database for '+driverName);
            }
            dataServer.rawEntities = models;
            let result = await dataServer.generateEntities();
            if(0 === Object.keys(dataServer.entities).length){
                throw new Error('No entities were generated for '+driverName);
            }
            return true;
        }
        // For ObjectionJS: Standard flow
        let models = await this.createModelsFromDatabase(dataServer, driverName);
        if(!models || 0 === Object.keys(models).length){
            throw new Error('Failed to create models from database for '+driverName);
        }
        dataServer.rawEntities = models;
        let result = await dataServer.generateEntities();
        if(0 === Object.keys(dataServer.entities).length){
            throw new Error('No entities were generated for '+driverName);
        }
        return true;
    }

    static async setupIntegrationTest(driverName, schemaPath, repoEntities)
    {
        let rawEntities = {};
        let dataServer = await this.setupDriver(driverName, rawEntities);
        if(!dataServer){
            throw new Error('Failed to setup driver: '+driverName);
        }
        let schemaSql = FileHandler.readFile(schemaPath);
        await this.executeRawSQL(dataServer, schemaSql);
        let entitiesGenerated = await this.generateTestEntities(dataServer, driverName);
        if(!entitiesGenerated){
            throw new Error('Failed to generate test entities for '+driverName);
        }
        let repos = {};
        for(let entityName of repoEntities){
            repos[entityName] = dataServer.getEntity(entityName);
        }
        return {dataServer, repos};
    }

    static async teardownIntegrationTest(dataServer)
    {
        if(dataServer){
            await this.dropTestTables(dataServer);
            await this.teardownDriver(dataServer);
        }
    }

    static buildRelationMappings(tables, models)
    {
        let relations = {};
        for(let tableName of Object.keys(tables)){
            relations[tableName] = {};
            let columns = tables[tableName].columns;
            for(let columnName of Object.keys(columns)){
                let column = columns[columnName];
                if(column.referencedTable && column.referencedColumn){
                    let refTableClean = column.referencedTable.replace('test_', '');
                    let relationKey = 'related_'+refTableClean;
                    let refModelKey = 'test'+sc.capitalizedCamelCase(sc.camelCase(refTableClean));
                    relations[tableName][relationKey] = {
                        relation: Model.BelongsToOneRelation,
                        modelClass: models[refModelKey],
                        join: {
                            from: tableName+'.'+columnName,
                            to: column.referencedTable+'.'+column.referencedColumn
                        }
                    };
                }
            }
        }
        for(let tableName of Object.keys(tables)){
            let columns = tables[tableName].columns;
            for(let columnName of Object.keys(columns)){
                let column = columns[columnName];
                if(column.referencedTable && column.referencedColumn){
                    let refTable = column.referencedTable;
                    let tableClean = tableName.replace('test_', '');
                    let relationKey = 'related_'+tableClean;
                    let modelKey = 'test'+sc.capitalizedCamelCase(sc.camelCase(tableClean));
                    if(!relations[refTable]){
                        relations[refTable] = {};
                    }
                    relations[refTable][relationKey] = {
                        relation: Model.HasManyRelation,
                        modelClass: models[modelKey],
                        join: {
                            from: refTable+'.'+column.referencedColumn,
                            to: tableName+'.'+columnName
                        }
                    };
                }
            }
        }
        return relations;
    }

    static buildMikroOrmRelations(tables, models)
    {
        let relations = {};
        for(let tableName of Object.keys(tables)){
            relations[tableName] = {};
            let columns = tables[tableName].columns;
            for(let columnName of Object.keys(columns)){
                let column = columns[columnName];
                if(column.referencedTable && column.referencedColumn){
                    let refTableClean = column.referencedTable.replace('test_', '');
                    let relationKey = 'related_'+refTableClean;
                    let refModelKey = 'test'+sc.capitalizedCamelCase(sc.camelCase(refTableClean));
                    relations[tableName][relationKey] = {
                        kind: 'm:1',
                        entity: refModelKey,
                        nullable: true,
                        joinColumn: columnName
                    };
                }
            }
        }
        for(let tableName of Object.keys(tables)){
            let columns = tables[tableName].columns;
            for(let columnName of Object.keys(columns)){
                let column = columns[columnName];
                if(column.referencedTable && column.referencedColumn){
                    let refTable = column.referencedTable;
                    let tableClean = tableName.replace('test_', '');
                    let relationKey = 'related_'+tableClean;
                    let modelKey = 'test'+sc.capitalizedCamelCase(sc.camelCase(tableClean));
                    if(!relations[refTable]){
                        relations[refTable] = {};
                    }
                    let refTableClean = refTable.replace('test_', '');
                    let mappedByKey = 'related_'+refTableClean;
                    relations[refTable][relationKey] = {
                        kind: '1:m',
                        entity: modelKey,
                        mappedBy: mappedByKey
                    };
                }
            }
        }
        return relations;
    }
}

module.exports.TestHelpers = TestHelpers;
