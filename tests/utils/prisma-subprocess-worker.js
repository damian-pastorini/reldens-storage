/**
 *
 * Reldens - Storage - Prisma Test Subprocess Worker
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class PrismaTestSubprocessWorker
{

    constructor()
    {
        this.setupProcessHandlers();
    }

    setupProcessHandlers()
    {
        process.on('message', async (message) => {
            try {
                await this.processIncomingMessage(message);
            } catch(error) {
                Logger.error('PrismaTestSubprocessWorker error: '+error.message);
                this.sendErrorResponse(error.message);
                setTimeout(() => process.exit(1), 100);
            }
        });
        process.on('uncaughtException', (error) => {
            Logger.error('PrismaTestSubprocessWorker uncaught exception: '+error.message);
            this.sendErrorResponse(error.message);
            setTimeout(() => process.exit(1), 100);
        });
        process.on('unhandledRejection', (error) => {
            Logger.error('PrismaTestSubprocessWorker unhandled rejection: '+error.message);
            this.sendErrorResponse(error.message);
            setTimeout(() => process.exit(1), 100);
        });
    }

    async ensureStubFiles(projectRoot)
    {
        let stubPath = FileHandler.joinPaths(projectRoot, 'node_modules', '.prisma', 'client', 'default.js');
        if(FileHandler.exists(stubPath)){
            Logger.info('Subprocess: Prisma stub files already exist');
            return true;
        }
        Logger.info('Subprocess: Creating Prisma stub files...');
        try {
            let postinstallPath = FileHandler.joinPaths(
                projectRoot,
                'node_modules',
                '@prisma',
                'client',
                'scripts',
                'postinstall.js'
            );
            if(!FileHandler.exists(postinstallPath)){
                Logger.warning('Subprocess: Prisma postinstall script not found at: '+postinstallPath);
                return false;
            }
            let { execSync } = require('child_process');
            execSync('node "' + postinstallPath + '"', {
                cwd: projectRoot,
                stdio: 'inherit'
            });
            Logger.info('Subprocess: Prisma stub files created successfully');
            return true;
        } catch(error) {
            Logger.error('Subprocess: Failed to create stub files: '+error.message);
            return false;
        }
    }

    async processIncomingMessage(message)
    {
        let projectRoot = sc.get(message, 'projectRoot', './');
        let config = sc.get(message, 'config', {});
        let stubsCreated = await this.ensureStubFiles(projectRoot);
        if(!stubsCreated){
            Logger.warning('Subprocess: Stub files could not be created, proceeding anyway');
        }
        let generatedClient = await this.generateMinimalPrismaClient(projectRoot, config);
        if(!generatedClient){
            this.sendErrorResponse('Failed to generate Prisma client.');
            return;
        }
        await generatedClient.$disconnect();
        this.sendSuccessResponse('Subprocess Prisma client generation completed.');
    }

    async generateMinimalPrismaClient(projectRoot, config)
    {
        let prismaPath = FileHandler.joinPaths(projectRoot, 'prisma');
        let schemaPath = FileHandler.joinPaths(prismaPath, 'schema.prisma');
        FileHandler.createFolder(prismaPath);
        let dbUrl = 'mysql://'+config.user+':'+config.password+'@'+config.host+':'+config.port+'/'+config.database;
        let schemaContent = 'generator client {\n'
            + '  provider = "prisma-client-js"\n'
            + '  output = "./client"\n'
            + '}\n'
            + '\n'
            + 'datasource db {\n'
            + '  provider = "mysql"\n'
            + '  url = "'+dbUrl+'"\n'
            + '}';
        FileHandler.writeFile(schemaPath, schemaContent);
        Logger.info('Subprocess: Running prisma db pull to introspect database...');
        try {
            let { stdout: pullStdout, stderr: pullStderr } = await execAsync('npx prisma db pull', {cwd: projectRoot});
            if(pullStderr && !pullStderr.includes('Introspected')){
                Logger.warning('Subprocess: Prisma db pull stderr: '+pullStderr);
            }
            Logger.info('Subprocess: Database introspection completed');
        } catch(error) {
            Logger.critical('Subprocess: Prisma db pull failed: '+error.message);
            return false;
        }
        Logger.info('Subprocess: Running prisma generate...');
        try {
            let { stdout, stderr } = await execAsync('npx prisma generate', {cwd: projectRoot});
            if(stderr && !stderr.includes('Generated Prisma Client')){
                Logger.warning('Subprocess: Prisma generate stderr: '+stderr);
            }
            Logger.info('Subprocess: Prisma client generated successfully');
            let clientPath = FileHandler.joinPaths(projectRoot, 'prisma', 'client');
            let { PrismaClient } = require(clientPath);
            return new PrismaClient();
        } catch(error) {
            Logger.critical('Subprocess: Prisma generate failed: '+error.message);
            return false;
        }
    }

    sendSuccessResponse(message)
    {
        process.send({success: true, message: message});
    }

    sendErrorResponse(errorMessage)
    {
        process.send({success: false, error: errorMessage});
    }

}

new PrismaTestSubprocessWorker();
