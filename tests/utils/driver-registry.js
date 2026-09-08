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

class DriverRegistry
{

    constructor()
    {
        this.sharedState = {
            drivers: {},
            repos: {},
            initialized: false,
            instanceId: Math.random()
        };
        this.schemaPath = FileHandler.joinPaths(__dirname, '..', 'fixtures', 'sql', 'test-schema.sql');
        this.repoNames = ['testCategories', 'testProductDetails', 'testProducts', 'testReviews'];
        this.driverNames = TestHelpers.activeDriverNames();
        this.skipGeneration = false;
    }

    async initialize()
    {
        if(this.sharedState.initialized){
            return;
        }
        Logger.info('='.repeat(60));
        Logger.info('INITIALIZING SHARED DRIVER REGISTRY');
        Logger.info('='.repeat(60));
        for(let driverName of this.driverNames){
            let dataServer = null;
            try {
                Logger.info('REGISTRY: Setting up driver: '+driverName);
                let rawEntities = {};
                dataServer = await TestHelpers.setupDriver(driverName, rawEntities);
                let schemaSql = FileHandler.readFile(this.schemaPath);
                await TestHelpers.executeRawSQL(dataServer, schemaSql);
                await this.generateOrLoadEntities(dataServer, driverName);
                let repos = {};
                for(let entityName of this.repoNames){
                    let repo = dataServer.getEntity(entityName);
                    Logger.info('REGISTRY: Got entity '+entityName+' for '+driverName+': '+(repo ? 'EXISTS' : 'NULL'));
                    repos[entityName] = repo;
                }
                Logger.info('REGISTRY: About to assign driver '+driverName+' to registry');
                this.sharedState.drivers[driverName] = dataServer;
                this.sharedState.repos[driverName] = repos;
                Logger.info(
                    'REGISTRY: Assigned! drivers['+driverName+'] = '
                    +(this.sharedState.drivers[driverName] ? 'EXISTS' : 'NULL')
                );
                Logger.info(
                    'REGISTRY: Assigned! repos['+driverName+'] = '
                    +(this.sharedState.repos[driverName] ? 'EXISTS' : 'NULL')
                );
                Logger.info('REGISTRY: Driver '+driverName+' initialized successfully');
            } catch(error) {
                Logger.critical('REGISTRY: Failed to initialize driver '+driverName);
                Logger.critical('ERROR: '+error.message);
                Logger.critical('STACK: '+error.stack);
                if(dataServer){
                    try {
                        await TestHelpers.teardownDriver(dataServer);
                    } catch(cleanupError) {
                        Logger.warning('Failed to disconnect '+driverName+' after init error: '+cleanupError.message);
                    }
                }
                this.sharedState.drivers[driverName] = null;
                this.sharedState.repos[driverName] = {};
            }
        }
        this.sharedState.initialized = true;
        Logger.info('='.repeat(60));
        Logger.info('DRIVER REGISTRY INITIALIZED - instanceId = '+this.sharedState.instanceId);
        Logger.info('REGISTRY DEBUG: drivers keys = '+Object.keys(this.sharedState.drivers).join(', '));
        Logger.info('REGISTRY DEBUG: repos keys = '+Object.keys(this.sharedState.repos).join(', '));
        Logger.info('='.repeat(60));
    }

    async generateOrLoadEntities(dataServer, driverName)
    {
        if(this.skipGeneration){
            Logger.info('REGISTRY: Skipping entity generation for '+driverName+' (using existing files)');
            return await TestHelpers.loadGeneratedEntities(dataServer, driverName);
        }
        return await TestHelpers.generateTestEntities(dataServer, driverName);
    }

    getDriver(driverName)
    {
        Logger.info('REGISTRY: getDriver called - instanceId = '+this.sharedState.instanceId);
        let driverInstance = this.sharedState.drivers[driverName];
        Logger.info(
            'REGISTRY: getDriver('+driverName+') typeof = '
            +(typeof driverInstance)+', null? '+(driverInstance === null)+', undefined? '+(driverInstance === undefined)
        );
        return driverInstance;
    }

    getRepos(driverName)
    {
        Logger.info('REGISTRY: getRepos called - instanceId = '+this.sharedState.instanceId);
        let reposObject = this.sharedState.repos[driverName];
        Logger.info(
            'REGISTRY: getRepos('+driverName+') typeof = '
            +(typeof reposObject)+', keys = '+(reposObject ? JSON.stringify(Object.keys(reposObject)) : 'NO VALUE')
        );
        return reposObject;
    }

    async cleanup()
    {
        Logger.info('='.repeat(60));
        Logger.info('CLEANING UP DRIVER REGISTRY');
        Logger.info('='.repeat(60));
        for(let driverName of this.driverNames){
            let dataServer = this.sharedState.drivers[driverName];
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
        this.sharedState.drivers = {};
        this.sharedState.repos = {};
        this.sharedState.initialized = false;
        Logger.info('Driver registry cleanup complete');
    }

}

module.exports.DriverRegistry = DriverRegistry;
