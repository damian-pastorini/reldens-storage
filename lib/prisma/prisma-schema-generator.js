/**
 *
 * Reldens - PrismaSchemaGenerator
 *
 */

const { ErrorManager, Logger, sc } = require('@reldens/utils');
const { FileHandler } = require('@reldens/server-utils');
const { execSync } = require('child_process');

class PrismaSchemaGenerator
{

    constructor(props)
    {
        this.config = sc.get(props, 'config', {});
        this.client = sc.get(props, 'client', 'mysql');
        this.debug = sc.get(props, 'debug', false);
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
            Logger.info('Running prisma generate "npx prisma generate"...');
            execSync('npx prisma generate', { stdio: 'inherit' });
            return true;
        } catch(error) {
            Logger.critical('Failed to generate Prisma schema. '+error.message);
        }
        return false;
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
