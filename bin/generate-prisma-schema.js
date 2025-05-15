#!/usr/bin/env node

/**
 *
 * Reldens - Generate Prisma Schema CLI
 *
 */

const { PrismaSchemaGenerator } = require('../lib/prisma/prisma-schema-generator');
const { Logger } = require('@reldens/utils');

let args = process.argv.slice(2);

let connectionData = {
    client: 'mysql2',
    config: {
        user: '',
        password: '',
        host: 'localhost',
        database: '',
        port: 3306
    }
};

let projectPath = process.cwd();
for(let i = 0; i < args.length; i++){
    let arg = args[i];
    if(!arg.startsWith('--')){
        continue;
    }
    let [key, value] = arg.substring(2).split('=');
    if(!key || !value){
        continue;
    }
    if('pass' === key){
        connectionData.config.password = value;
        continue;
    }
    if('path' === key){
        projectPath = value;
        continue;
    }
    if('user' === key){
        connectionData.config.user = value;
        continue;
    }
    if('database' === key){
        connectionData.config.database = value;
        continue;
    }
    if('host' === key){
        connectionData.config.host = value;
        continue;
    }
    if('port' === key){
        connectionData.config.port = value;
        continue;
    }
    if('client' === key){
        connectionData.client = value;
    }
}

if(!connectionData.config.user || !connectionData.config.database){
    Logger.error('Required parameters missing.');
    Logger.error(
        'Usage:',
        'npx reldens-storage generatePrismaSchema --user=[db-username] --pass=[db-password] --host=[db-host] --database=[db-name] --client=[db-client] --path=[project-path]'
    );
    process.exit();
}

let generator = new PrismaSchemaGenerator({...connectionData, prismaSchemaPath: projectPath+'/prisma'});

generator.generate().then((success) => {
    if(!success){
        Logger.error('Prisma schema generation failed.');
        process.exit();
    }
    Logger.info('Prisma schema generation completed successfully!');
    process.exit();
}).catch((error) => {
    Logger.error('Error during Prisma schema generation: '+error.message);
    process.exit();
});
