/**
 *
 * Reldens - Storage Test Runner
 *
 */

const { Logger, sc } = require('@reldens/utils');
const { FileHandler } = require('@reldens/server-utils');
const { describe, run } = require('node:test');
const { spec } = require('node:test/reporters');
const { TestHelpers } = require('./utils/test-helpers');
const { OutputFilter } = require('./utils/custom-reporter');
const { DriverRegistry } = require('./utils/driver-registry');
const DriversTest = require('./integration/test-drivers');
const NestedFiltersTest = require('./integration/test-nested-filters');
const RelationsTest = require('./integration/test-relations');
const EntityManagerTest = require('./unit/test-entity-manager');
const TypeMapperTest = require('./unit/test-type-mapper');
const DriversUnitTest = require('./unit/test-drivers');
// const EntitiesGeneratorTest = require('./unit/test-entities-generator');

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
        this.breakOnError = false;
        this.driverRegistry = new DriverRegistry();
    }

    parseCommandLineArgs()
    {
        for(let arg of process.argv){
            if(arg.startsWith('--filter=')){
                this.filter = arg.split('=')[1];
                process.stderr.write('Filter applied: '+this.filter+'\n');
            }
            if(arg.startsWith('--suite=')){
                this.suite = arg.split('=')[1];
                process.stderr.write('Suite: '+this.suite+'\n');
            }
            if(arg.startsWith('--driver=')){
                this.driver = arg.split('=')[1];
                process.stderr.write('Driver: '+this.driver+'\n');
            }
            if(arg === '--break-on-error'){
                this.breakOnError = true;
                process.stderr.write('Break on error enabled\n');
            }
        }
    }

    async run()
    {
        process.stderr.write('='.repeat(60)+'\n');
        process.stderr.write('@RELDENS/STORAGE - TEST SUITE\n');
        process.stderr.write('='.repeat(60)+'\n');
        process.stderr.write('Test execution started: '+sc.formatDate(new Date())+'\n\n');
        this.parseCommandLineArgs();
        let config = TestHelpers.getTestDbConfig();
        TestHelpers.cleanupGeneratedFiles();
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
        process.stderr.write('Integration tests: '+(hasIntegrationTests ? 'YES' : 'NO')+'\n');
        process.stderr.write('Unit tests: '+(hasUnitTests ? 'YES' : 'NO')+'\n\n');
        let testPromises = [];
        if(hasIntegrationTests){
            await this.driverRegistry.initialize();
        }
        describe('Reldens Storage Test Suite - Sequential Execution', () => {
            if(hasIntegrationTests){
                process.stderr.write('Registering integration test classes...\n');
                let driverNames = ['objection-js', 'mikro-orm', 'prisma'];
                for(let driverName of driverNames){
                    let dataServer = this.driverRegistry.getDriver(driverName);
                    let repos = this.driverRegistry.getRepos(driverName);
                    Logger.info('Registering tests for driver: '+driverName);
                    let driversTest = new DriversTest(dataServer, repos, driverName);
                    testPromises.push({name: 'DriversTest['+driverName+']', promise: driversTest.run()});
                    let nestedFiltersTest = new NestedFiltersTest(dataServer, repos, driverName);
                    testPromises.push({name: 'NestedFiltersTest['+driverName+']', promise: nestedFiltersTest.run()});
                    let relationsTest = new RelationsTest(dataServer, repos, driverName);
                    testPromises.push({name: 'RelationsTest['+driverName+']', promise: relationsTest.run()});
                }
                process.stderr.write('Integration tests registered\n\n');
            }
            if(hasUnitTests){
                process.stderr.write('Registering unit test classes...\n');
                let entityManagerTest = new EntityManagerTest();
                testPromises.push({name: 'EntityManagerTest', promise: entityManagerTest.run()});
                let typeMapperTest = new TypeMapperTest();
                testPromises.push({name: 'TypeMapperTest', promise: typeMapperTest.run()});
                let driversUnitTest = new DriversUnitTest();
                testPromises.push({name: 'DriversUnitTest', promise: driversUnitTest.run()});
                process.stderr.write('Unit tests registered\n\n');
            }
        });
        process.stderr.write('Starting test runner to execute ALL registered tests...\n');
        let testStream = run({
            concurrency: false
        });
        let outputFilter = new OutputFilter();
        testStream.compose(spec).pipe(outputFilter).pipe(process.stdout);
        await new Promise((resolve) => {
            testStream.on('end', resolve);
        });
        process.stderr.write('\nAwaiting test counters...\n');
        for(let testPromise of testPromises){
            try {
                let result = await testPromise.promise;
                this.allCounts.total += result.counter;
                this.allCounts.passed += result.counter - result.errors;
                this.allCounts.failed += result.errors;
                process.stderr.write('  '+testPromise.name+': '+result.counter+' tests ('+result.errors+' errors)\n');
            } catch(error) {
                process.stderr.write('  '+testPromise.name+': ERROR awaiting promise: '+error.message+'\n');
            }
        }
        process.stderr.write('\n'+('='.repeat(60))+'\n');
        process.stderr.write('FINAL TEST RESULTS\n');
        process.stderr.write(('='.repeat(60))+'\n');
        process.stderr.write('Total tests executed: '+this.allCounts.total+'\n');
        process.stderr.write('Tests passed: '+this.allCounts.passed+'\n');
        process.stderr.write('Tests failed: '+this.allCounts.failed+'\n');
        process.stderr.write(('='.repeat(60))+'\n');
        if(hasIntegrationTests){
            await this.driverRegistry.cleanup();
        }
        if(0 < this.allCounts.failed){
            process.exitCode = 1;
        }
        setTimeout(() => {
            process.stderr.write('\nForce exiting after 5 seconds (connections may still be open)\n');
            process.exit(process.exitCode || 0);
        }, 5000);
        return this.allCounts;
    }

    async runPreFlightChecks(config)
    {
        Logger.info('========================================');
        Logger.info('Pre-Flight Checks');
        Logger.info('========================================');
        if(!TestHelpers.verifyAllPackages()){
            Logger.critical('Package verification failed');
            process.exit(1);
        }
        Logger.info('All pre-flight checks passed');
        Logger.info('========================================');
    }

}

process.on('unhandledRejection', (reason, promise) => {
    process.stderr.write('Unhandled Rejection at: '+promise+' reason: '+reason+'\n');
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    process.stderr.write('Uncaught Exception: '+error.message+'\n');
    process.stderr.write(error.stack+'\n');
    process.exit(1);
});

let runner = new RunTests();
runner.run().catch(error => {
    process.stderr.write('Test runner error: '+error.message+'\n');
    process.stderr.write(error.stack+'\n');
    process.exit(1);
});
