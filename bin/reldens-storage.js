#!/usr/bin/env node

/**
 *
 * Reldens - Storage CLI
 *
 */

const { EntitiesGenerator } = require('../lib/entities-generator');
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
            let value = arg.substring(equalIndex + 1);
            if('path' === key){
                this.projectPath = value;
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
            Logger.error('Required parameters missing.');
            Logger.error('Usage: npx reldens-storage generateEntities --user=[db-username] --pass=[db-password] --host=[db-host] --database=[db-name] --driver=[driver-map-key] --client=[db-client] --path=[project-path] --override');
            Logger.error('');
            Logger.error('Optional flags:');
            Logger.error('  --override    Regenerate all files even if they exist');
            return false;
        }
        return true;
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
        let generator = new EntitiesGenerator({
            connectionData,
            projectPath: this.projectPath,
            isOverride: this.isOverride
        });
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
