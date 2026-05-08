/**
 *
 * Reldens - Storage Test Runner
 *
 */

const { Logger, sc } = require('@reldens/utils');
const { FileHandler } = require('@reldens/server-utils');
const { TestHelpers } = require('./utils/test-helpers');
const { DriverRegistry } = require('./utils/driver-registry');
const DriversTest = require('./integration/test-drivers');
const NestedFiltersTest = require('./integration/test-nested-filters');
const RelationsTest = require('./integration/test-relations');
const RawQueriesTest = require('./integration/test-raw-queries');
const EntityManagerTest = require('./unit/test-entity-manager');
const TypeMapperTest = require('./unit/test-type-mapper');
const DriversUnitTest = require('./unit/test-drivers');

if(!process.env.RELDENS_TEST_DB_HOST){
    let envPath = FileHandler.joinPaths(__dirname, '.env.test');
    if(FileHandler.exists(envPath)){
        require('dotenv').config({path: envPath});
    }
}

class RunTests
{

    constructor()
    {
        this.allCounts = {total: 0, passed: 0, failed: 0};
        this.filter = null;
        this.suite = null;
        this.driver = null;
        this.skipCleanup = false;
        this.skipGeneration = false;
        this.driverRegistry = new DriverRegistry();
    }

    parseCommandLineArgs()
    {
        for(let arg of process.argv){
            if(arg.startsWith('--filter=')){
                this.filter = arg.split('=')[1];
                Logger.info('Filter applied: '+this.filter+'\n');
            }
            if(arg.startsWith('--suite=')){
                this.suite = arg.split('=')[1];
                Logger.info('Suite: '+this.suite);
            }
            if(arg.startsWith('--driver=')){
                this.driver = arg.split('=')[1];
                Logger.info('Driver: '+this.driver);
            }
            if('--skip-cleanup' === arg){
                this.skipCleanup = true;
                Logger.info('Skipping cleanup: YES\n');
            }
            if('--skip-generation' === arg){
                this.skipGeneration = true;
                Logger.info('Skipping entity generation: YES\n');
            }
        }
    }

    async run()
    {
        Logger.info('='.repeat(60));
        Logger.info('@RELDENS/STORAGE - TEST SUITE');
        Logger.info('='.repeat(60));
        Logger.info('Test execution started: '+sc.formatDate(new Date()));
        Logger.info('');
        this.parseCommandLineArgs();
        let config = TestHelpers.getTestDbConfig();
        if(!this.skipCleanup){
            TestHelpers.cleanupGeneratedFiles();
        }
        await this.runPreFlightChecks(config);
        let hasIntegrationTests = !this.suite || this.suite === 'integration';
        let hasUnitTests = !this.suite || this.suite === 'unit';
        if(this.filter){
            if(this.filter.includes('integration')){
                hasUnitTests = false;
            }
            if(this.filter.includes('unit')){
                hasIntegrationTests = false;
            }
        }
        Logger.info('Integration tests: '+(hasIntegrationTests ? 'YES' : 'NO'));
        Logger.info('Unit tests: '+(hasUnitTests ? 'YES' : 'NO'));
        Logger.info('');
        if(hasIntegrationTests){
            this.driverRegistry.skipGeneration = this.skipGeneration;
            await this.driverRegistry.initialize();
            await this.runIntegrationTests();
        }
        if(hasUnitTests){
            await this.runUnitTests();
        }
        Logger.info('');
        Logger.info('='.repeat(60));
        Logger.info('FINAL TEST RESULTS');
        Logger.info('='.repeat(60));
        Logger.info('Total tests executed: '+this.allCounts.total);
        Logger.info('Tests passed: '+this.allCounts.passed);
        Logger.info('Tests failed: '+this.allCounts.failed);
        Logger.info('='.repeat(60));
        if(hasIntegrationTests){
            await this.driverRegistry.cleanup();
        }
        if(0 < this.allCounts.failed){
            process.exitCode = 1;
        }
        return this.allCounts;
    }

    async runIntegrationTests()
    {
        let driverNames = ['objection-js', 'mikro-orm', 'prisma'];
        if(this.driver){
            driverNames = [this.driver];
        }
        for(let driverName of driverNames){
            let dataServer = this.driverRegistry.getDriver(driverName);
            let repos = this.driverRegistry.getRepos(driverName);
            if(!dataServer){
                Logger.warning('Driver '+driverName+' not available, skipping tests');
                continue;
            }
            try {
                let driversTest = new DriversTest(dataServer, repos, driverName);
                let driversResult = await driversTest.run();
                this.allCounts.total += driversResult.total;
                this.allCounts.passed += driversResult.passed;
                this.allCounts.failed += driversResult.failed;
            } catch(error) {
                Logger.critical('Driver '+driverName+' tests crashed: '+error.message);
                Logger.critical(error.stack);
            }
            try {
                let nestedFiltersTest = new NestedFiltersTest(dataServer, repos, driverName);
                let nestedFiltersResult = await nestedFiltersTest.run();
                this.allCounts.total += nestedFiltersResult.total;
                this.allCounts.passed += nestedFiltersResult.passed;
                this.allCounts.failed += nestedFiltersResult.failed;
            } catch(error) {
                Logger.critical('Driver '+driverName+' nested filters tests crashed: '+error.message);
                Logger.critical(error.stack);
            }
            try {
                let relationsTest = new RelationsTest(dataServer, repos, driverName);
                let relationsResult = await relationsTest.run();
                this.allCounts.total += relationsResult.total;
                this.allCounts.passed += relationsResult.passed;
                this.allCounts.failed += relationsResult.failed;
            } catch(error) {
                Logger.critical('Driver '+driverName+' relations tests crashed: '+error.message);
                Logger.critical(error.stack);
            }
            try {
                let rawQueriesTest = new RawQueriesTest(dataServer, repos, driverName);
                let rawQueriesResult = await rawQueriesTest.run();
                this.allCounts.total += rawQueriesResult.total;
                this.allCounts.passed += rawQueriesResult.passed;
                this.allCounts.failed += rawQueriesResult.failed;
            } catch(error) {
                Logger.critical('Driver '+driverName+' raw queries tests crashed: '+error.message);
                Logger.critical(error.stack);
            }
        }
    }

    async runUnitTests()
    {
        let entityManagerTest = new EntityManagerTest();
        let entityManagerResult = await entityManagerTest.run();
        this.allCounts.total += entityManagerResult.total;
        this.allCounts.passed += entityManagerResult.passed;
        this.allCounts.failed += entityManagerResult.failed;
        let typeMapperTest = new TypeMapperTest();
        let typeMapperResult = await typeMapperTest.run();
        this.allCounts.total += typeMapperResult.total;
        this.allCounts.passed += typeMapperResult.passed;
        this.allCounts.failed += typeMapperResult.failed;
        let driversUnitTest = new DriversUnitTest();
        let driversUnitResult = await driversUnitTest.run();
        this.allCounts.total += driversUnitResult.total;
        this.allCounts.passed += driversUnitResult.passed;
        this.allCounts.failed += driversUnitResult.failed;
    }

    async runPreFlightChecks(config)
    {
        Logger.info('='.repeat(60));
        Logger.info('Pre-Flight Checks');
        Logger.info('='.repeat(60));
        if(!TestHelpers.verifyAllPackages()){
            Logger.critical('Package verification failed');
            process.exit(1);
        }
        Logger.info('All pre-flight checks passed');
        Logger.info('='.repeat(60));
    }

}

process.on('unhandledRejection', (reason, promise) => {
    Logger.info('Unhandled Rejection at: '+promise+' reason: '+reason+'\n');
    Logger.info('(Test suite will continue)\n');
});

process.on('uncaughtException', (error) => {
    Logger.info('Uncaught Exception: '+error.message+'\n');
    Logger.info(error.stack+'\n');
    Logger.info('(Test suite will continue)\n');
});

let runner = new RunTests();
runner.run().catch(error => {
    Logger.info('CATASTROPHIC ERROR: Test runner failed completely\n');
    Logger.info('Error: '+error.message+'\n');
    Logger.info(error.stack+'\n');
    process.exit(1);
});
