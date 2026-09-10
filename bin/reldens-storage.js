#!/usr/bin/env node

/**
 *
 * Reldens - Storage CLI
 *
 */

const { EntitiesGenerator } = require('../lib/entities-generator');
const { PrismaClientLoader } = require('../lib/prisma/prisma-client-loader');
const { KyselyModulesLoader } = require('../lib/kysely/kysely-modules-loader');
const { DrizzleModulesLoader } = require('../lib/drizzle/drizzle-modules-loader');
const { MikroOrmModulesLoader } = require('../lib/mikro-orm/mikro-orm-modules-loader');
const { ObjectionModulesLoader } = require('../lib/objection-js/objection-modules-loader');
const { KnexModulesLoader } = require('../lib/knex/knex-modules-loader');
const { FileHandler } = require('@reldens/server-utils');
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
        this.prismaAdapter = '@prisma/adapter-mariadb';
        this.prismaAdapterClass = 'PrismaMariaDb';
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
            if('prismaAdapter' === key){
                this.prismaAdapter = value;
                continue;
            }
            if('prismaAdapterClass' === key){
                this.prismaAdapterClass = value;
                continue;
            }
            if('pass' === key){
                this.config['password'] = value;
                continue;
            }
            if('port' === key){
                this.config[key] = Number(value);
                continue;
            }
            this.config[key] = value;
        }
    }

    getConnectionData()
    {
        let connectionData = {
            driver: sc.get(this.config, 'driver', 'knex'),
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
        if('kysely' === connectionData.driver && !this.config.client){
            connectionData.client = 'mysql';
        }
        if('drizzle' === connectionData.driver && !this.config.client){
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
                +' --driver=[knex|kysely|drizzle|objection-js|mikro-orm|prisma] (default: knex)'
                +' --client=[db-client]'
                +' --prismaClientPath=[path-to-prisma-client]'
                +' --prismaAdapter=[prisma-adapter-package-or-path]'
                +' --prismaAdapterClass=[prisma-adapter-export-name]'
                +' --path=[project-path] --override',
                'Optional flags:',
                '  --override    Regenerate all files even if they exist'
            );
            return false;
        }
        return true;
    }

    loadPrismaModules(connectionData)
    {
        let adapterPath = FileHandler.joinPaths(this.projectPath, 'node_modules', this.prismaAdapter);
        if(!FileHandler.exists(adapterPath)){
            adapterPath = this.prismaAdapter;
        }
        if(!FileHandler.exists(adapterPath)){
            Logger.critical(
                'Prisma adapter "'+this.prismaAdapter+'" not found in the project.'
                +' Run: npm install prisma @prisma/client '+this.prismaAdapter
            );
            return null;
        }
        let adapterModule = require(adapterPath);
        if(!sc.isFunction(adapterModule[this.prismaAdapterClass])){
            Logger.critical('Prisma adapter class "'+this.prismaAdapterClass+'" not exported by: '+adapterPath);
            return null;
        }
        let loadedModules = PrismaClientLoader.load(
            this.projectPath,
            this.prismaClientPath,
            connectionData,
            {PrismaAdapter: adapterModule[this.prismaAdapterClass]}
        );
        if(!loadedModules){
            Logger.info('Please run "npx prisma generate" first or provide --prismaClientPath argument.');
        }
        return loadedModules;
    }

    appendDriverModules(generatorProps, connectionData)
    {
        if('prisma' === connectionData.driver){
            generatorProps.prismaModules = this.loadPrismaModules(connectionData);
            return Boolean(generatorProps.prismaModules);
        }
        if('kysely' === connectionData.driver){
            generatorProps.kyselyModules = KyselyModulesLoader.load(this.projectPath);
            return Boolean(generatorProps.kyselyModules);
        }
        if('drizzle' === connectionData.driver){
            generatorProps.drizzleModules = DrizzleModulesLoader.load(this.projectPath);
            return Boolean(generatorProps.drizzleModules);
        }
        if('mikro-orm' === connectionData.driver){
            generatorProps.mikroOrmModules = MikroOrmModulesLoader.load(this.projectPath, connectionData.client);
            return Boolean(generatorProps.mikroOrmModules);
        }
        if('objection-js' === connectionData.driver){
            generatorProps.objectionModules = ObjectionModulesLoader.load(this.projectPath);
            return Boolean(generatorProps.objectionModules);
        }
        generatorProps.knexModules = KnexModulesLoader.load(this.projectPath);
        return Boolean(generatorProps.knexModules);
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
        if(!this.appendDriverModules(generatorProps, connectionData)){
            return false;
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
