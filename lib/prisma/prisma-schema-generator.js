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
        this.clientOutputPath = sc.get(props, 'clientOutputPath', './prisma/client');
        this.generateBinaryTargets = sc.get(props, 'generateBinaryTargets', ['native']);
    }

    async generate()
    {
        try {
            FileHandler.createFolder(this.prismaSchemaPath);
            this.generateSchemaFile();
            Logger.info('Running prisma introspect "npx prisma db pull"...');
            execSync('npx prisma db pull', { stdio: 'inherit' });
            let generateCommand = 'npx prisma generate';
            if(this.dataProxy){
                generateCommand += ' --data-proxy';
            }
            Logger.info('Running prisma generate "'+generateCommand+'"...');
            execSync(generateCommand, { stdio: 'inherit' });
            await this.waitForSchemaGeneration();
            return true;
        } catch(error) {
            Logger.critical('Failed to generate Prisma schema. '+error.message);
        }
        return false;
    }

    async waitForSchemaGeneration()
    {
        let generatedClientPath = FileHandler.joinPaths(this.prismaSchemaPath, this.clientOutputPath);
        let clientIndexPath = FileHandler.joinPaths(generatedClientPath, 'index.js');
        let startTime = Date.now();
        return new Promise((resolve) => {
            let interval = setInterval(() => {
                if(FileHandler.exists(clientIndexPath)){
                    clearInterval(interval);
                    resolve();
                    return;
                }
                if(Date.now() - startTime > this.maxWaitTime){
                    clearInterval(interval);
                    Logger.warning('Schema generation wait timeout reached.');
                    resolve();
                }
            }, this.checkInterval);
        });
    }

    generateSchemaFile()
    {
        let datasourceProvider = this.getDatasourceProvider();
        let schemaContent = this.buildSchemaContent(
            datasourceProvider,
            this.buildConnectionString(datasourceProvider),
            this.buildDirectConnectionString(datasourceProvider)
        );
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
        return datasourceProvider + this.buildConnectionDataString();
    }

    buildDirectConnectionString(datasourceProvider)
    {
        if(!this.dataProxy){
            return '';
        }
        return datasourceProvider + this.buildConnectionDataString();
    }

    buildConnectionDataString()
    {
        return '://' + this.config.user + ':' + this.config.password
            + '@' + this.config.host+':' + this.config.port
            + '/' + this.config.database;
    }

    buildSchemaContent(datasourceProvider, connectionString, directConnectionString)
    {
        return this.buildGeneratorBlock() + '\n\n'
            + this.buildDatasourceBlock(datasourceProvider, connectionString, directConnectionString) + '\n';
    }

    buildGeneratorBlock()
    {
        let generatorContent = 'generator client {\n';
        generatorContent += '  provider = "prisma-client-js"\n';
        generatorContent += '  output   = "' + this.clientOutputPath + '"\n';
        if(0 < this.generateBinaryTargets.length){
            generatorContent += '  binaryTargets = [' +
                this.generateBinaryTargets.map(target => '"' + target + '"').join(', ')
                + ']\n';
        }
        generatorContent += '}';
        return generatorContent;
    }

    buildDatasourceBlock(datasourceProvider, connectionString, directConnectionString)
    {
        let datasourceContent = 'datasource db {\n';
        datasourceContent += '  provider = "' + datasourceProvider + '"\n';
        datasourceContent += '  url      = "' + connectionString + '"\n';
        if('' !== directConnectionString){
            datasourceContent += '  directUrl = "' + directConnectionString + '"\n';
        }
        datasourceContent += '}';
        return datasourceContent;
    }

}

module.exports.PrismaSchemaGenerator = PrismaSchemaGenerator;
