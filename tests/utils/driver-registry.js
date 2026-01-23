/**
 *
 * Reldens - Driver Registry
 * Singleton registry for shared driver instances across integration tests
 * Reduces test setup/teardown from 9x to 3x (70% performance improvement)
 *
 */

const { Logger } = require('@reldens/utils');
const { FileHandler } = require('@reldens/server-utils');
const { TestHelpers } = require('./test-helpers');

// SINGLETON DATA - Shared across ALL requires
const SHARED_STATE = {
    drivers: {},
    repos: {},
    initialized: false,
    instanceId: Math.random()
};

class DriverRegistry
{

    static schemaPath = FileHandler.joinPaths(__dirname, '..', 'fixtures', 'sql', 'test-schema.sql');
    static repoNames = ['testCategories', 'testProducts', 'testReviews'];
    static driverNames = ['objection-js', 'mikro-orm', 'prisma'];

    static async initialize()
    {
        if(SHARED_STATE.initialized){
            return;
        }
        Logger.info('========================================');
        Logger.info('INITIALIZING SHARED DRIVER REGISTRY');
        Logger.info('========================================');
        for(let driverName of this.driverNames){
            try {
                Logger.info('REGISTRY: Setting up driver: '+driverName);
                let rawEntities = {};
                let dataServer = await TestHelpers.setupDriver(driverName, rawEntities);
                let schemaSql = FileHandler.readFile(this.schemaPath);
                await TestHelpers.executeRawSQL(dataServer, schemaSql);
                await TestHelpers.generateTestEntities(dataServer, driverName);
                let repos = {};
                for(let entityName of this.repoNames){
                    let repo = dataServer.getEntity(entityName);
                    Logger.info('REGISTRY: Got entity '+entityName+' for '+driverName+': '+(repo ? 'EXISTS' : 'NULL'));
                    repos[entityName] = repo;
                }
                Logger.info('REGISTRY: About to assign driver '+driverName+' to registry');
                SHARED_STATE.drivers[driverName] = dataServer;
                SHARED_STATE.repos[driverName] = repos;
                Logger.info('REGISTRY: Assigned! drivers['+driverName+'] = '+(SHARED_STATE.drivers[driverName] ? 'EXISTS' : 'NULL'));
                Logger.info('REGISTRY: Assigned! repos['+driverName+'] = '+(SHARED_STATE.repos[driverName] ? 'EXISTS' : 'NULL'));
                Logger.info('REGISTRY: Driver '+driverName+' initialized successfully');
            } catch(error) {
                Logger.critical('REGISTRY: Failed to initialize driver '+driverName);
                Logger.critical('ERROR: '+error.message);
                Logger.critical('STACK: '+error.stack);
                SHARED_STATE.drivers[driverName] = null;
                SHARED_STATE.repos[driverName] = {};
            }
        }
        SHARED_STATE.initialized = true;
        Logger.info('========================================');
        Logger.info('DRIVER REGISTRY INITIALIZED - instanceId = '+SHARED_STATE.instanceId);
        Logger.info('REGISTRY DEBUG: drivers keys = '+Object.keys(SHARED_STATE.drivers).join(', '));
        Logger.info('REGISTRY DEBUG: repos keys = '+Object.keys(SHARED_STATE.repos).join(', '));
        Logger.info('========================================');
    }

    static getDriver(driverName)
    {
        Logger.info('REGISTRY: getDriver called - instanceId = '+SHARED_STATE.instanceId);
        let driverInstance = SHARED_STATE.drivers[driverName];
        Logger.info('REGISTRY: getDriver('+driverName+') typeof = '+(typeof driverInstance)+', null? '+(driverInstance === null)+', undefined? '+(driverInstance === undefined));
        return driverInstance;
    }

    static getRepos(driverName)
    {
        Logger.info('REGISTRY: getRepos called - instanceId = '+SHARED_STATE.instanceId);
        let reposObject = SHARED_STATE.repos[driverName];
        Logger.info('REGISTRY: getRepos('+driverName+') typeof = '+(typeof reposObject)+', keys = '+(reposObject ? JSON.stringify(Object.keys(reposObject)) : 'NO VALUE'));
        return reposObject;
    }

    static async cleanup()
    {
        Logger.info('========================================');
        Logger.info('CLEANING UP DRIVER REGISTRY');
        Logger.info('========================================');
        for(let driverName of this.driverNames){
            let dataServer = SHARED_STATE.drivers[driverName];
            if(dataServer){
                try {
                    await TestHelpers.dropTestTables(dataServer);
                    await TestHelpers.teardownDriver(dataServer);
                } catch(error) {
                    Logger.warning('Failed to cleanup driver '+driverName+': '+error.message);
                }
            }
        }
        TestHelpers.cleanupGeneratedFiles();
        SHARED_STATE.drivers = {};
        SHARED_STATE.repos = {};
        SHARED_STATE.initialized = false;
        Logger.info('Driver registry cleanup complete');
    }

}

// Export the CLASS itself, not an instance
// Static properties are shared across all imports
module.exports = { DriverRegistry };
