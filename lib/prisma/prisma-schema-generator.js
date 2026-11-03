/**
 *
 * Reldens - PrismaSchemaGenerator
 *
 */

const { execSync } = require('child_process');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class PrismaSchemaGenerator
{

    constructor(props)
    {
        this.config = sc.get(props, 'config', {});
        this.client = sc.get(props, 'client', 'mysql');
        this.debug = sc.get(props, 'debug', false);
        this.dataProxy = sc.get(props, 'dataProxy', false);
        this.checkInterval = sc.get(props, 'checkInterval', 1000);
        this.maxWaitTime = sc.get(props, 'maxWaitTime', 30000);
        this.prismaSchemaPath = sc.get(props, 'prismaSchemaPath', FileHandler.joinPaths(process.cwd(), 'prisma'));
        this.schemaFilePath = FileHandler.joinPaths(this.prismaSchemaPath, 'schema.prisma');
        this.clientOutputPath = sc.get(props, 'clientOutputPath', './client');
        this.generateBinaryTargets = sc.get(props, 'generateBinaryTargets', ['native', 'debian-openssl-1.1.x']);
        this.dbParams = sc.get(props, 'dbParams', process.env.RELDENS_DB_PARAMS || '');
    }

    static ensureStubFiles(projectRoot)
    {
        let stubPath = FileHandler.joinPaths(projectRoot, 'node_modules', '.prisma', 'client', 'default.js');
        if(FileHandler.exists(stubPath)){
            Logger.info('Prisma stub files already exist.');
            return true;
        }
        Logger.info('Creating Prisma stub files...');
        try {
            let defaultIndexPath = FileHandler.joinPaths(
                projectRoot, 'node_modules', '@prisma', 'client', 'scripts', 'default-index.js'
            );
            if(!FileHandler.exists(defaultIndexPath)){
                Logger.warning('Prisma default-index script not found at: '+defaultIndexPath);
                return false;
            }
            let stubDir = FileHandler.joinPaths(projectRoot, 'node_modules', '.prisma', 'client');
            FileHandler.createFolder(stubDir);
            FileHandler.copyFile(defaultIndexPath, stubPath);
            Logger.info('Prisma stub files created successfully.');
            return true;
        } catch(error) {
            Logger.error('Failed to create stub files: '+error.message);
            return false;
        }
    }

    async generate()
    {
        FileHandler.createFolder(this.prismaSchemaPath);
        this.generateSchemaFile();
        this.setDatabaseEnvironmentVariables();
        this.generateConfigFile();
        Logger.info('Running prisma introspect "npx prisma db pull"...');
        try {
            execSync('npx prisma db pull', {stdio: 'inherit'});
        } catch(error) {
            Logger.critical('Failed to pull database schema: '+error.message);
            return false;
        }
        return this.generateClient();
    }

    generateClient()
    {
        let generateCommand = 'npx prisma generate';
        if(this.dataProxy){
            generateCommand += ' --data-proxy';
        }
        Logger.info('Running prisma generate "'+generateCommand+'"...');
        try {
            execSync(generateCommand, {stdio: 'inherit'});
        } catch(error) {
            let errorString = error.toString();
            if(errorString.includes('EPERM') && errorString.includes('query_engine-windows.dll.node')){
                Logger.warning('Windows permission error detected with query engine file.');
                Logger.warning('This is a known Prisma issue on Windows.');
                Logger.warning('Please manually run: '+generateCommand);
                Logger.warning('You may need to close any processes using the Prisma client first.');
                return false;
            }
            Logger.critical('Generate command failed: '+error.message);
            return false;
        }
        return true;
    }

    setDatabaseEnvironmentVariables()
    {
        let datasourceProvider = this.getDatasourceProvider();
        process.env.RELDENS_DB_URL = this.buildConnectionString(datasourceProvider);
        if(this.dataProxy){
            process.env.DATABASE_DIRECT_URL = this.buildDirectConnectionString(datasourceProvider);
        }
    }

    async waitForSchemaGeneration()
    {
        let clientPath = this.clientOutputPath || './client';
        let generatedClientPath = this.resolveClientPath(clientPath);
        let clientIndexPath = FileHandler.joinPaths(generatedClientPath, 'index.js');
        let startTime = Date.now();
        return new Promise((resolve) => {
            let interval = setInterval(() => {
                let awaitTime = Date.now() - startTime;
                Logger.info('Awaiting on schema generation: '+clientIndexPath, (awaitTime/1000).toFixed(0));
                if(FileHandler.exists(clientIndexPath)){
                    clearInterval(interval);
                    resolve();
                    return;
                }
                if(awaitTime > this.maxWaitTime){
                    clearInterval(interval);
                    Logger.warning('Schema generation wait timeout reached.');
                    resolve();
                }
            }, this.checkInterval);
        });
    }

    resolveClientPath(clientPath)
    {
        if(clientPath.match(/^[a-zA-Z]:/) || clientPath.startsWith('/')){
            return clientPath;
        }
        if(clientPath.startsWith('node_modules')){
            return FileHandler.joinPaths(process.cwd(), clientPath);
        }
        return FileHandler.joinPaths(this.prismaSchemaPath, clientPath);
    }

    generateConfigFile()
    {
        let configContent = 'try {\n'
            +'    process.loadEnvFile(\'.env\');\n'
            +'} catch(error) {\n'
            +'    process.env.RELDENS_PRISMA_ENV_ERROR = error.message;\n'
            +'}\n'
            +'module.exports = { datasource: { url: process.env.RELDENS_DB_URL } };\n';
        let configPath = FileHandler.joinPaths(process.cwd(), 'prisma.config.js');
        FileHandler.writeFile(configPath, configContent);
        Logger.info('Generated Prisma config file at: '+configPath);
    }

    generateSchemaFile()
    {
        let datasourceProvider = this.getDatasourceProvider();
        let schemaContent = this.buildSchemaContent(datasourceProvider);
        FileHandler.writeFile(this.schemaFilePath, schemaContent);
        Logger.info('Generated Prisma schema file at: '+this.schemaFilePath);
    }

    getDatasourceProvider()
    {
        if('postgresql' === this.client || 'postgres' === this.client){
            return 'postgresql';
        }
        if('mongodb' === this.client){
            return 'mongodb';
        }
        return 'mysql';
    }

    buildConnectionString(datasourceProvider)
    {
        if(this.dataProxy){
            datasourceProvider = 'prisma';
        }
        return datasourceProvider+this.buildConnectionDataString();
    }

    buildDirectConnectionString(datasourceProvider)
    {
        if(!this.dataProxy){
            return '';
        }
        return datasourceProvider+this.buildConnectionDataString();
    }

    buildConnectionDataString()
    {
        return '://'+this.config.user+':'+this.config.password
            +'@'+this.config.host+':'+this.config.port
            +'/'+this.config.database
            +(this.dbParams ? '?'+this.dbParams : '');
    }

    buildSchemaContent(datasourceProvider)
    {
        return this.buildGeneratorBlock()+'\n\n'
            +this.buildDatasourceBlock(datasourceProvider)+'\n';
    }

    buildGeneratorBlock()
    {
        let generatorContent = 'generator client {\n';
        generatorContent += '  provider = "prisma-client-js"\n';
        let outputPath = this.clientOutputPath || './client';
        if(!outputPath.startsWith('./')){
            outputPath = './client';
        }
        generatorContent += '  output = "'+outputPath+'"\n';
        if(0 < this.generateBinaryTargets.length){
            generatorContent += '  binaryTargets = ['
                +this.generateBinaryTargets.map(target => '"'+target+'"').join(', ')
                +']\n';
        }
        generatorContent += '}';
        return generatorContent;
    }

    buildDatasourceBlock(datasourceProvider)
    {
        let datasourceContent = 'datasource db {\n';
        datasourceContent += '  provider = "'+datasourceProvider+'"\n';
        datasourceContent += '}';
        return datasourceContent;
    }

}

module.exports.PrismaSchemaGenerator = PrismaSchemaGenerator;
