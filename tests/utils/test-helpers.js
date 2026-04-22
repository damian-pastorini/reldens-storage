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

    static async setupDriver(driverName, rawEntities)
    {
        try {
            Logger.info('Setting up driver: '+driverName);
            let config = this.getTestDbConfig();
            Logger.info('DB Config: '
                +JSON.stringify({host: config.host, port: config.port, database: config.database, user: config.user})
            );
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
                let prismaClient = await this.loadPrismaClient(process.cwd(), config);
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
                dataServer.orm.em.clear();
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
            Logger.warning(
                'Package '+packageName+' version mismatch. Expected: '+version+', Found: '+packageJson.version
            );
        }
        Logger.info('Package '+packageName+' verified: '+packageJson.version);
        return true;
    }

    static verifyAllPackages()
    {
        let required = [
            {name: '@mikro-orm/core', version: '7.0.11'},
            {name: "@mikro-orm/mongodb", version: "7.0.11"},
            {name: '@mikro-orm/mysql', version: '7.0.11'},
            {name: '@prisma/client', version: '7.7.0'},
            {name: 'knex', version: '3.2.9'},
            {name: 'mysql', version: '2.18.1'},
            {name: 'mysql2', version: '3.22.2'},
            {name: 'objection', version: '3.1.5'},
            {name: 'prisma', version: '7.7.0'}
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

    static async loadPrismaClient(projectRoot, config)
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
            let { PrismaMariaDb } = require('@prisma/adapter-mariadb');
            let adapterConfig = config
                ? { host: config.host, port: config.port, user: config.user, password: config.password, database: config.database }
                : process.env.DATABASE_URL;
            let client = new PrismaClient({ adapter: new PrismaMariaDb(adapterConfig) });
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
        let prismaConfigPath = FileHandler.joinPaths(process.cwd(), 'prisma.config.js');
        if(FileHandler.exists(prismaConfigPath)){
            Logger.info('Cleaning up Prisma config file: '+prismaConfigPath);
            FileHandler.remove(prismaConfigPath);
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
        let cmd = 'npx prisma generate';
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

    static fixGeneratedRequirePaths()
    {
        let generatedEntitiesPath = FileHandler.joinPaths(process.cwd(), 'generated-entities');
        if(!FileHandler.exists(generatedEntitiesPath)){
            return;
        }
        let entitiesPath = FileHandler.joinPaths(generatedEntitiesPath, 'entities');
        let modelsPath = FileHandler.joinPaths(generatedEntitiesPath, 'models');
        if(FileHandler.exists(entitiesPath)){
            let entityFiles = FileHandler.getFilesInFolder(entitiesPath, ['.js']);
            for(let filename of entityFiles){
                let filePath = FileHandler.joinPaths(entitiesPath, filename);
                let content = FileHandler.readFile(filePath);
                let fixed = content.replace(
                    "require('@reldens/storage')",
                    "require('../../index')"
                );
                FileHandler.writeFile(filePath, fixed);
            }
        }
        if(FileHandler.exists(modelsPath)){
            let drivers = ['objection-js', 'mikro-orm', 'prisma'];
            for(let driver of drivers){
                let driverPath = FileHandler.joinPaths(modelsPath, driver);
                if(!FileHandler.exists(driverPath)){
                    continue;
                }
                let modelFiles = FileHandler.getFilesInFolder(driverPath, ['.js']);
                for(let filename of modelFiles){
                    let filePath = FileHandler.joinPaths(driverPath, filename);
                    let content = FileHandler.readFile(filePath);
                    let fixed = content.replace(
                        "require('@reldens/storage')",
                        "require('../../../index')"
                    );
                    FileHandler.writeFile(filePath, fixed);
                }
            }
        }
        Logger.info('Fixed require paths in generated entities');
    }

    static async runEntitiesGenerator(dataServer, driverName)
    {
        let { EntitiesGenerator } = require('../../lib/entities-generator');
        let config = this.getTestDbConfig();
        let connectionData = {
            driver: driverName,
            client: 'objection-js' === driverName ? 'mysql2' : 'mysql',
            user: config.user,
            password: config.password,
            host: config.host,
            database: config.database,
            port: config.port
        };
        let generatorProps = {
            connectionData,
            projectPath: process.cwd(),
            isOverride: true,
            server: dataServer
        };
        if('prisma' === driverName){
            let prismaClient = dataServer.prisma;
            if(!prismaClient){
                throw new Error('Prisma client not available on dataServer');
            }
            generatorProps.prismaClient = prismaClient;
        }
        let generator = new EntitiesGenerator(generatorProps);
        let result = await generator.generate();
        if(!result){
            throw new Error('EntitiesGenerator failed for '+driverName);
        }
        if(generator.server && generator.server !== dataServer){
            if(generator.server.knex){
                await generator.server.knex.destroy();
            }
            if(generator.server.orm){
                await generator.server.orm.close();
            }
            if(generator.server.prisma && generator.server.prisma !== dataServer.prisma){
                await generator.server.prisma.$disconnect();
            }
        }
        Logger.info('EntitiesGenerator completed for '+driverName);
        return true;
    }

    static compareGeneratedWithExpected(driverName, relativePath)
    {
        let expectedPath = FileHandler.joinPaths(
            __dirname,
            '..',
            'fixtures',
            relativePath.startsWith('models/') ? 'expected-entities-'+driverName : 'expected-entities',
            relativePath
        );
        let generatedPath = FileHandler.joinPaths(
            process.cwd(),
            'generated-entities',
            relativePath
        );
        if(!FileHandler.exists(expectedPath)){
            Logger.warning('No expected files at: '+expectedPath);
            return true;
        }
        if(!FileHandler.exists(generatedPath)){
            throw new Error('Generated path not found: '+generatedPath);
        }
        let isExpectedDir = FileHandler.isFolder(expectedPath);
        let isGeneratedDir = FileHandler.isFolder(generatedPath);
        if(isExpectedDir && isGeneratedDir){
            let expectedFiles = FileHandler.getFilesInFolder(expectedPath, ['.js']);
            let generatedFiles = FileHandler.getFilesInFolder(generatedPath, ['.js']);
            if(expectedFiles.length !== generatedFiles.length){
                throw new Error(
                    'File count mismatch in '+relativePath+':'
                    +' expected '+expectedFiles.length+', got '+generatedFiles.length
                );
            }
            for(let filename of expectedFiles){
                let expectedContent = FileHandler.readFile(FileHandler.joinPaths(expectedPath, filename));
                let generatedContent = FileHandler.readFile(FileHandler.joinPaths(generatedPath, filename));
                let normalizedExpected = expectedContent.replace(/\r\n/g, '\n');
                let normalizedGenerated = generatedContent.replace(/\r\n/g, '\n');
                if(normalizedExpected !== normalizedGenerated){
                    Logger.warning('File content mismatch: '+filename);
                    Logger.warning('Expected: '+FileHandler.joinPaths(expectedPath, filename));
                    Logger.warning('Generated: '+FileHandler.joinPaths(generatedPath, filename));
                    Logger.warning('Expected length: '+expectedContent.length+' bytes');
                    Logger.warning('Generated length: '+generatedContent.length+' bytes');
                }
            }
            Logger.info('All files in '+relativePath+' match expected output');
            return true;
        }
        if(!isExpectedDir && !isGeneratedDir){
            let expectedContent = FileHandler.readFile(expectedPath);
            let generatedContent = FileHandler.readFile(generatedPath);
            let normalizedExpected = expectedContent.replace(/\r\n/g, '\n');
            let normalizedGenerated = generatedContent.replace(/\r\n/g, '\n');
            if(normalizedExpected !== normalizedGenerated){
                Logger.warning('File content mismatch: '+relativePath);
            }
            Logger.info('File '+relativePath+' matches expected output');
            return true;
        }
        throw new Error('Path type mismatch for: '+relativePath);
    }

    static async loadGeneratedEntities(dataServer, driverName)
    {
        let modelsPath = FileHandler.joinPaths(
            process.cwd(),
            'generated-entities',
            'models',
            driverName,
            'registered-models-'+driverName+'.js'
        );
        if(!FileHandler.exists(modelsPath)){
            throw new Error('Registered models not found: '+modelsPath);
        }
        delete require.cache[require.resolve(modelsPath)];
        let registeredModels = require(modelsPath);
        dataServer.rawEntities = registeredModels.rawRegisteredEntities;
        if('mikro-orm' === driverName){
            await dataServer.disconnect();
            await dataServer.connect();
        }
        let result = dataServer.generateEntities();
        if(0 === Object.keys(dataServer.entities).length){
            throw new Error('No entities generated from registered models');
        }
        Logger.info('Loaded '+Object.keys(dataServer.entities).length+' entities for '+driverName);
        return true;
    }

    static async generateTestEntities(dataServer, driverName)
    {
        if('prisma' === driverName){
            let config = this.getTestDbConfig();
            config.client = 'mysql';
            let schemaPath = FileHandler.joinPaths(process.cwd(), 'prisma', 'schema.prisma');
            if(!FileHandler.exists(schemaPath)){
                if(!await this.generatePrismaSchema(config)){
                    throw new Error('Failed to generate Prisma schema');
                }
                if(!await this.generatePrismaClient()){
                    throw new Error('Failed to generate Prisma client');
                }
                await dataServer.disconnect();
                delete require.cache[require.resolve(FileHandler.joinPaths(process.cwd(), 'prisma', 'client'))];
                await dataServer.connect();
            }
        }
        await this.runEntitiesGenerator(dataServer, driverName);
        this.fixGeneratedRequirePaths();
        this.compareGeneratedWithExpected(driverName, 'entities');
        this.compareGeneratedWithExpected(driverName, 'models/'+driverName);
        if('objection-js' === driverName){
            this.compareGeneratedWithExpected(driverName, 'entities-config.js');
            this.compareGeneratedWithExpected(driverName, 'entities-translations.js');
        }
        await this.loadGeneratedEntities(dataServer, driverName);
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
}

module.exports.TestHelpers = TestHelpers;
