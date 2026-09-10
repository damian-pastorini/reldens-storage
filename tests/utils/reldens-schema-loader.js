/**
 *
 * Reldens - ReldensSchemaLoader
 *
 */

const { TestHelpers } = require('./test-helpers');
const { Logger, sc } = require('@reldens/utils');
const { FileHandler } = require('@reldens/server-utils');

class ReldensSchemaLoader
{

    static migrationsPath()
    {
        return process.env.RELDENS_TEST_MIGRATIONS_PATH || '';
    }

    static sqlFileNames()
    {
        return ['reldens-install-v4.0.0.sql', 'reldens-basic-config-v4.0.0.sql', 'reldens-sample-data-v4.0.0.sql'];
    }

    static isAvailable()
    {
        let migrationsPath = this.migrationsPath();
        if('' === migrationsPath){
            return false;
        }
        for(let fileName of this.sqlFileNames()){
            if(!FileHandler.exists(FileHandler.joinPaths(migrationsPath, fileName))){
                Logger.warning('Reldens schema file not found: '+fileName);
                return false;
            }
        }
        return true;
    }

    static databaseName()
    {
        return process.env.RELDENS_TEST_RELDENS_DB_NAME || 'reldens_storage_test_full';
    }

    static generationPath()
    {
        return FileHandler.joinPaths(process.cwd(), 'tests', 'generated-reldens-schema');
    }

    static async ensureDatabase()
    {
        let BootstrapServerClass = TestHelpers.getDataServerClass('knex');
        if(!BootstrapServerClass){
            Logger.critical('Reldens schema bootstrap data server class not found.');
            return false;
        }
        let bootstrapServer = new BootstrapServerClass({
            client: TestHelpers.driverClient('knex'),
            config: {...TestHelpers.getTestDbConfig(), multipleStatements: true},
            rawEntities: {},
            multipleStatements: true,
            poolConfig: {min: 0, max: 2}
        });
        await bootstrapServer.connect();
        if(!bootstrapServer.initialized){
            Logger.critical('Reldens schema bootstrap connection failed.');
            return false;
        }
        await TestHelpers.executeRawSQL(bootstrapServer, 'DROP DATABASE IF EXISTS '+this.databaseName()+';');
        await TestHelpers.executeRawSQL(bootstrapServer, 'CREATE DATABASE '+this.databaseName()+';');
        await bootstrapServer.disconnect();
        Logger.info('Reldens schema database is ready: '+this.databaseName());
        return true;
    }

    static async regeneratedPrismaModules(config)
    {
        let prismaConfig = Object.assign({}, config, {client: 'mysql'});
        if(!await TestHelpers.generatePrismaSchema(prismaConfig)){
            Logger.critical('Reldens schema Prisma schema generation failed.');
            return false;
        }
        if(!await TestHelpers.generatePrismaClient()){
            Logger.critical('Reldens schema Prisma client generation failed.');
            return false;
        }
        delete require.cache[require.resolve(FileHandler.joinPaths(process.cwd(), 'prisma', 'client'))];
        return await TestHelpers.loadPrismaModules(process.cwd(), config);
    }

    static async refreshPrismaClient(dataServer, driverName)
    {
        if('prisma' !== driverName){
            return true;
        }
        let config = TestHelpers.getTestDbConfig();
        config.database = this.databaseName();
        let prismaModules = await this.regeneratedPrismaModules(config);
        if(!prismaModules){
            return false;
        }
        await dataServer.disconnect();
        dataServer.prismaModules = prismaModules;
        dataServer.prisma = prismaModules.client;
        dataServer.initialized = Date.now();
        return true;
    }

    static async setupDataServer(driverName)
    {
        let DataServerClass = TestHelpers.getDataServerClass(driverName);
        if(!DataServerClass){
            Logger.critical('Reldens schema data server class not found for '+driverName);
            return false;
        }
        let config = TestHelpers.getTestDbConfig();
        config.database = this.databaseName();
        let serverConfig = {
            client: TestHelpers.driverClient(driverName),
            config: {...config, multipleStatements: true},
            rawEntities: {},
            multipleStatements: true,
            poolConfig: {min: 0, max: 2}
        };
        TestHelpers.appendDriverModules(serverConfig, driverName);
        if('prisma' === driverName){
            serverConfig.prismaModules = await TestHelpers.loadPrismaModules(process.cwd(), config);
            if(!serverConfig.prismaModules){
                return false;
            }
        }
        let dataServer = new DataServerClass(serverConfig);
        await dataServer.connect();
        if(!dataServer.initialized){
            Logger.critical('Reldens schema data server failed to initialize for '+driverName);
            return false;
        }
        return dataServer;
    }

    static async loadSchemaAndData(dataServer)
    {
        for(let fileName of this.sqlFileNames()){
            let sql = FileHandler.readFile(FileHandler.joinPaths(this.migrationsPath(), fileName));
            if(!sql){
                Logger.critical('Could not read reldens schema file: '+fileName);
                return false;
            }
            await TestHelpers.executeRawSQL(dataServer, sql);
            Logger.info('Loaded reldens schema file: '+fileName);
        }
        return true;
    }

    static async generateEntities(dataServer, driverName)
    {
        let { EntitiesGenerator } = require('../../lib/entities-generator');
        let config = TestHelpers.getTestDbConfig();
        let generator = new EntitiesGenerator({
            connectionData: {
                driver: driverName,
                client: TestHelpers.driverClient(driverName),
                user: config.user,
                password: config.password,
                host: config.host,
                database: this.databaseName(),
                port: config.port
            },
            projectPath: this.generationPath(),
            isOverride: true,
            server: dataServer
        });
        if(!await generator.generate()){
            Logger.critical('Reldens schema entities generation failed for '+driverName);
            return false;
        }
        return this.fixGeneratedRequirePaths(driverName);
    }

    static modelsFolderDepth = 5;

    static entitiesFolderDepth = 4;

    static packageRequirePath(folderDepth)
    {
        return '..'+'/..'.repeat(folderDepth - 1)+'/index';
    }

    static fixGeneratedRequirePaths(driverName)
    {
        let modelsFolder = FileHandler.joinPaths(this.generationPath(), 'generated-entities', 'models', driverName);
        if(!this.replacePackageRequire(modelsFolder, this.packageRequirePath(this.modelsFolderDepth))){
            return false;
        }
        return this.replacePackageRequire(
            FileHandler.joinPaths(this.generationPath(), 'generated-entities', 'entities'),
            this.packageRequirePath(this.entitiesFolderDepth)
        );
    }

    static replacePackageRequire(folderPath, packagePath)
    {
        let fileNames = FileHandler.getFilesInFolder(folderPath, ['.js']);
        if(!sc.isArray(fileNames) || 0 === fileNames.length){
            Logger.critical('No reldens schema files were generated at: '+folderPath);
            return false;
        }
        for(let fileName of fileNames){
            let filePath = FileHandler.joinPaths(folderPath, fileName);
            let content = FileHandler.readFile(filePath);
            FileHandler.writeFile(
                filePath,
                content.replace("require('@reldens/storage')", "require('"+packagePath+"')")
            );
        }
        Logger.info('Fixed the require paths on '+fileNames.length+' reldens schema files at: '+folderPath);
        return true;
    }

    static async loadEntities(dataServer, driverName)
    {
        let modelsFolder = FileHandler.joinPaths(this.generationPath(), 'generated-entities', 'models', driverName);
        let modelsPath = FileHandler.joinPaths(modelsFolder, 'registered-models-'+driverName+'.js');
        if(!FileHandler.exists(modelsPath)){
            Logger.critical('Reldens schema registered models not found: '+modelsPath);
            return false;
        }
        dataServer.rawEntities = require(modelsPath).rawRegisteredEntities;
        if('mikro-orm' === driverName){
            await dataServer.disconnect();
            await dataServer.connect();
        }
        dataServer.generateEntities();
        if(0 === Object.keys(dataServer.entities).length){
            Logger.critical('No reldens schema entities generated for '+driverName);
            return false;
        }
        Logger.info('Loaded '+Object.keys(dataServer.entities).length+' reldens schema entities for '+driverName);
        return true;
    }

    static async setup(driverName)
    {
        if(!await this.ensureDatabase()){
            return false;
        }
        let dataServer = await this.setupDataServer(driverName);
        if(!dataServer){
            return false;
        }
        if(!await this.loadSchemaAndData(dataServer)){
            return false;
        }
        if(!await this.refreshPrismaClient(dataServer, driverName)){
            return false;
        }
        if(!await this.generateEntities(dataServer, driverName)){
            return false;
        }
        if(!await this.loadEntities(dataServer, driverName)){
            return false;
        }
        return dataServer;
    }

    static async teardown(dataServer)
    {
        await TestHelpers.teardownDriver(dataServer);
        FileHandler.remove(this.generationPath());
        return true;
    }

}

module.exports.ReldensSchemaLoader = ReldensSchemaLoader;
