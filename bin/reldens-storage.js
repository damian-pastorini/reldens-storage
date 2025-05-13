#!/usr/bin/env node

/**
 *
 * Reldens - Storage CLI
 *
 */

const { EntitiesGenerator } = require('../lib/entities-generator');
const { Logger } = require('@reldens/utils');

let args = process.argv.slice(2);
let command = args[0];

if('generateEntities' !== command){
    Logger.error('Unknown command. Available command "generateEntities".');
    process.exit();
}

let connectionData = {
    driver: 'objection-js',
    client: 'mysql2',
    user: '',
    password: '',
    host: 'localhost',
    database: '',
    port: 3306
};

let projectPath = process.cwd();
for(let i = 1; i < args.length; i++){
    let arg = args[i];
    if(!arg.startsWith('--')){
        continue;
    }
    let [key, value] = arg.substring(2).split('=');
    if(!key || !value){
        continue;
    }
    if('pass' === key){
        connectionData.password = value;
        continue;
    }
    if('path' === key){
        projectPath = value;
        continue;
    }
    connectionData[key] = value;
}

if('mikro-orm' === connectionData.driver && !args.find(arg => arg.startsWith('--client='))){
    connectionData.client = 'mysql';
}

if(!connectionData.user || !connectionData.database){
    Logger.error('Required parameters missing.');
    Logger.error(
        'Usage:',
        'npx reldens-storage generateEntities --user=[db-username] --pass=[db-password] --host=[db-host] --database=[db-name] --driver=[driver-map-key] --client=[db-client] --path=[project-path]'
    );
    process.exit();
}

let generator = new EntitiesGenerator({connectionData, projectPath});
generator.generate().then((success) => {
    if(!success){
        Logger.error('Entity generation failed.');
        process.exit();
    }
    Logger.info('Entity generation completed successfully!');
    process.exit();
}).catch((error) => {
    Logger.error('Error during entity generation: '+error.message);
    process.exit();
});
