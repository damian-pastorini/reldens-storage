#!/usr/bin/env node

/**
 *
 * Reldens - Storage CLI
 *
 */

const { EntitiesGenerator } = require('../lib/entities-generator');
const { PrismaClientLoader } = require('../lib/prisma/prisma-client-loader');
const { Logger, sc } = require('@reldens/utils');

class StorageEntitiesGenerator
{

    constructor()
    {
        this.args = process.argv.slice(2);
        this.command = this.args[0];
        this.config = {};
        this.projectPath = process.cwd();
        this.isOverride = false;
        this.prismaClientPath = '';
        this.parseArguments();
    }

    parseArguments()
    {
        for(let i = 1; i < this.args.length; i++){
            let arg = this.args[i];
            if(!arg.startsWith('--')){
                continue;
            }
            let equalIndex = arg.indexOf('=');
            if(-1 === equalIndex){
                let flag = arg.substring(2);
                if('override' === flag){
                    this.isOverride = true;
                }
                continue;
            }
            let key = arg.substring(2, equalIndex);
            let value = arg.substring(equalIndex+1);
            if('path' === key){
                this.projectPath = value;
                continue;
            }
            if('prismaClientPath' === key){
                this.prismaClientPath = value;
                continue;
            }
            if('pass' === key){
                this.config['password'] = value;
                continue;
            }
            if('port' === key){
                this.config[key] = parseInt(value);
                continue;
            }
            this.config[key] = value;
        }
    }

    getConnectionData()
    {
        let connectionData = {
            driver: sc.get(this.config, 'driver', 'objection-js'),
            client: sc.get(this.config, 'client', 'mysql2'),
            user: sc.get(this.config, 'user', ''),
            password: sc.get(this.config, 'password', ''),
            host: sc.get(this.config, 'host', 'localhost'),
            database: sc.get(this.config, 'database', ''),
            port: sc.get(this.config, 'port', 3306)
        };
        if('mikro-orm' === connectionData.driver && !this.config.client){
            connectionData.client = 'mysql';
        }
        if('prisma' === connectionData.driver && !this.config.client){
            connectionData.client = 'mysql';
        }
        return connectionData;
    }

    validateCommand()
    {
        if('generateEntities' !== this.command){
            Logger.error('Unknown command. Available command "generateEntities".');
            return false;
        }
        return true;
    }

    validateRequiredArgs(connectionData)
    {
        if(!connectionData.user || !connectionData.database){
            Logger.error(
                'Required parameters missing.',
                'Usage: npx reldens-storage generateEntities --user=[db-username]'
                +' --pass=[db-password]'
                +' --host=[db-host]'
                +' --database=[db-name]'
                +' --driver=[driver-map-key]'
                +' --client=[db-client]'
                +' --prismaClientPath=[path-to-prisma-client]'
                +' --path=[project-path] --override',
                'Optional flags:',
                '  --override    Regenerate all files even if they exist'
            );
            return false;
        }
        return true;
    }

    loadPrismaClient(connectionData)
    {
        let loadedClient = PrismaClientLoader.load(this.projectPath, this.prismaClientPath, connectionData);
        if(!loadedClient){
            Logger.info('Please run "npx prisma generate" first or provide --prismaClientPath argument.');
        }
        return loadedClient;
    }

    async run()
    {
        if(!this.validateCommand()){
            return false;
        }
        let connectionData = this.getConnectionData();
        if(!this.validateRequiredArgs(connectionData)){
            return false;
        }
        let generatorProps = {
            connectionData,
            projectPath: this.projectPath,
            isOverride: this.isOverride
        };
        if('prisma' === connectionData.driver){
            let prismaClient = this.loadPrismaClient(connectionData);
            if(!prismaClient){
                return false;
            }
            generatorProps.prismaClient = prismaClient;
        }
        let generator = new EntitiesGenerator(generatorProps);
        let success = await generator.generate();
        if(!success){
            Logger.error('Entity generation failed.');
            return false;
        }
        Logger.info('Entity generation completed successfully!');
        return true;
    }
}

let generator = new StorageEntitiesGenerator();
generator.run().then((success) => {
    if(!success){
        process.exit(1);
    }
    process.exit(0);
}).catch((error) => {
    Logger.error('Error during entity generation: '+error.message);
    process.exit(1);
});
