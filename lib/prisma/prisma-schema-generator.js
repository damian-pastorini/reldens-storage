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
        this.prismaSchemaPath = sc.get(props, 'prismaSchemaPath', FileHandler.joinPaths(process.cwd(), 'prisma'));
        this.schemaFilePath = FileHandler.joinPaths(this.prismaSchemaPath, 'schema.prisma');
    }

    async generate()
    {
        try {
            FileHandler.createFolder(this.prismaSchemaPath, { recursive: true });
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
        let generatedClientPath = FileHandler.joinPaths(this.prismaSchemaPath, '..', 'node_modules', '.prisma', 'client');
        let clientIndexPath = FileHandler.joinPaths(generatedClientPath, 'index.js');
        return new Promise((resolve) => {
            let interval = setInterval(() => {
                if(FileHandler.exists(clientIndexPath)){
                    clearInterval(interval);
                    resolve();
                }
            }, this.checkInterval);
        });
    }

    generateSchemaFile()
    {
        let datasourceProvider = 'mysql';
        if('postgresql' === this.client || 'postgres' === this.client){
            datasourceProvider = 'postgresql';
        }
        if('mongodb' === this.client){
            datasourceProvider = 'mongodb';
        }
        let connectionString = datasourceProvider + '://'
            + this.config.user + ':' + this.config.password
            + '@' + this.config.host + ':' + this.config.port + '/'
            + this.config.database;
        let schemaContent = `
generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/.prisma/client"
}

datasource db {
  provider = "${datasourceProvider}"
  url      = "${connectionString}"
}
`;
        FileHandler.writeFile(this.schemaFilePath, schemaContent);
        Logger.info('Generated Prisma schema file at: '+this.schemaFilePath);
    }

}

module.exports.PrismaSchemaGenerator = PrismaSchemaGenerator;
