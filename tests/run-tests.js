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
        if(hasIntegrationTests){
            await this.driverRegistry.initialize();
            await this.runIntegrationTests();
        }
        if(hasUnitTests){
            await this.runUnitTests();
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
                process.stderr.write('Driver '+driverName+' not available, skipping tests\n');
                continue;
            }
            try {
                let driversTest = new DriversTest(dataServer, repos, driverName);
                let driversResult = await driversTest.run();
                this.allCounts.total += driversResult.total;
                this.allCounts.passed += driversResult.passed;
                this.allCounts.failed += driversResult.failed;
            } catch(error) {
                process.stderr.write('Driver '+driverName+' tests crashed: '+error.message+'\n');
                process.stderr.write(error.stack+'\n');
            }
            try {
                let nestedFiltersTest = new NestedFiltersTest(dataServer, repos, driverName);
                let nestedFiltersResult = await nestedFiltersTest.run();
                this.allCounts.total += nestedFiltersResult.total;
                this.allCounts.passed += nestedFiltersResult.passed;
                this.allCounts.failed += nestedFiltersResult.failed;
            } catch(error) {
                process.stderr.write('Driver '+driverName+' nested filters tests crashed: '+error.message+'\n');
                process.stderr.write(error.stack+'\n');
            }
            try {
                let relationsTest = new RelationsTest(dataServer, repos, driverName);
                let relationsResult = await relationsTest.run();
                this.allCounts.total += relationsResult.total;
                this.allCounts.passed += relationsResult.passed;
                this.allCounts.failed += relationsResult.failed;
            } catch(error) {
                process.stderr.write('Driver '+driverName+' relations tests crashed: '+error.message+'\n');
                process.stderr.write(error.stack+'\n');
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
    process.stderr.write('(Test suite will continue)\n');
});

process.on('uncaughtException', (error) => {
    process.stderr.write('Uncaught Exception: '+error.message+'\n');
    process.stderr.write(error.stack+'\n');
    process.stderr.write('(Test suite will continue)\n');
});

let runner = new RunTests();
runner.run().catch(error => {
    process.stderr.write('CATASTROPHIC ERROR: Test runner failed completely\n');
    process.stderr.write('Error: '+error.message+'\n');
    process.stderr.write(error.stack+'\n');
    process.exit(1);
});
