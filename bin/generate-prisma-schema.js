#!/usr/bin/env node

/**
 *
 * Reldens - Generate Prisma Schema CLI
 *
 */

const { PrismaSchemaGenerator } = require('../lib/prisma/prisma-schema-generator');
const { Logger, sc } = require('@reldens/utils');

class PrismaSchemaGeneratorCLI
{

    constructor()
    {
        this.args = process.argv.slice(2);
        this.config = {};
        this.parseArguments();
    }

    parseArguments()
    {
        for(let i = 0; i < this.args.length; i++){
            let arg = this.args[i];
            if(!arg.startsWith('--')){
                continue;
            }
            let equalIndex = arg.indexOf('=');
            if(-1 === equalIndex){
                let flag = arg.substring(2);
                if('debug' === flag || 'dataProxy' === flag || 'help' === flag || 'h' === flag){
                    this.config[flag] = true;
                }
                continue;
            }
            let key = arg.substring(2, equalIndex);
            let value = arg.substring(equalIndex + 1);
            if('port' === key || 'checkInterval' === key || 'maxWaitTime' === key){
                this.config[key] = parseInt(value);
                continue;
            }
            if('generateBinaryTargets' === key){
                this.config[key] = value.split(',').map(target => target.trim());
                continue;
            }
            this.config[key] = value;
        }
    }

    shouldShowHelp()
    {
        return 0 === this.args.length || sc.get(this.config, 'help', false) || sc.get(this.config, 'h', false);
    }

    showHelp()
    {
        Logger.info('');
        Logger.info('Reldens Prisma Schema Generator');
        Logger.info('================================');
        Logger.info('');
        Logger.info('Usage: npx reldens-generate-prisma-schema [options]');
        Logger.info('');
        Logger.info('Required Options:');
        Logger.info('  --host=[host]                    Database host');
        Logger.info('  --port=[port]                    Database port');
        Logger.info('  --user=[user]                    Database user');
        Logger.info('  --password=[password]            Database password');
        Logger.info('  --database=[database]            Database name');
        Logger.info('');
        Logger.info('Optional Options:');
        Logger.info('  --client=[client]                Database client (default: mysql)');
        Logger.info('  --debug                          Enable debug mode (default: false)');
        Logger.info('  --dataProxy                      Enable data proxy (default: false)');
        Logger.info('  --checkInterval=[ms]             Check interval in milliseconds (default: 1000)');
        Logger.info('  --maxWaitTime=[ms]               Max wait time in milliseconds (default: 30000)');
        Logger.info('  --prismaSchemaPath=[path]        Path to Prisma schema directory');
        Logger.info('  --clientOutputPath=[path]        Client output path (if not set, uses Prisma default)');
        Logger.info('  --generateBinaryTargets=[targets] Comma-separated binary targets (default: native,debian-openssl-1.1.x)');
        Logger.info('  --dbParams=[params]              Database connection parameters (e.g., authPlugin=mysql_native_password)');
        Logger.info('');
        Logger.info('Example:');
        Logger.info('  npx reldens-generate-prisma-schema --host=localhost --port=3306 --user=root --password=secret --database=mydb');
        Logger.info('');
        Logger.info('Advanced Example:');
        Logger.info('  npx reldens-generate-prisma-schema --host=localhost --port=3306 --user=root --password=secret --database=mydb --client=postgresql --debug --dataProxy --checkInterval=2000 --maxWaitTime=60000 --prismaSchemaPath=./custom/prisma --clientOutputPath=./custom/client --generateBinaryTargets=native,debian-openssl-1.1.x');
        Logger.info('');
    }

    validateRequiredArgs()
    {
        let requiredArgs = ['host', 'port', 'user', 'password', 'database'];
        let missing = [];
        for(let arg of requiredArgs){
            if(!this.config[arg]){
                missing.push(arg);
            }
        }
        if(0 < missing.length){
            Logger.error('Missing required arguments: ' + missing.join(', '));
            this.showHelp();
            return false;
        }
        return true;
    }

    getSchemaConfig()
    {
        return {
            config: {
                host: this.config.host,
                port: this.config.port,
                user: this.config.user,
                password: this.config.password,
                database: this.config.database
            },
            client: sc.get(this.config, 'client', 'mysql'),
            debug: sc.get(this.config, 'debug', false),
            dataProxy: sc.get(this.config, 'dataProxy', false),
            checkInterval: sc.get(this.config, 'checkInterval', 1000),
            maxWaitTime: sc.get(this.config, 'maxWaitTime', 30000),
            prismaSchemaPath: sc.get(this.config, 'prismaSchemaPath'),
            clientOutputPath: sc.get(this.config, 'clientOutputPath'),
            generateBinaryTargets: sc.get(this.config, 'generateBinaryTargets'),
            dbParams: sc.get(this.config, 'dbParams')
        };
    }

    async run()
    {
        if(this.shouldShowHelp()){
            this.showHelp();
            return true;
        }
        if(!this.validateRequiredArgs()){
            return false;
        }
        let schemaConfig = this.getSchemaConfig();
        let generator = new PrismaSchemaGenerator(schemaConfig);
        let success = await generator.generate();
        if(!success){
            Logger.critical('Failed to generate Prisma schema');
            return false;
        }
        Logger.info('Prisma schema generation completed successfully');
        return true;
    }

}

let generator = new PrismaSchemaGeneratorCLI();
generator.run().then((success) => {
    if(!success){
        process.exit(1);
    }
    process.exit(0);
}).catch((error) => {
    Logger.critical('Unexpected error: ' + error.message);
    process.exit(1);
});
