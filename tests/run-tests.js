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
const ReldensShapeRelationsTest = require('./integration/test-reldens-shape-relations');
const ReldensSampleDataTest = require('./integration/test-reldens-sample-data');
const { CrossDriverEquivalenceTest } = require('./integration/test-cross-driver-equivalence');
const RawQueriesTest = require('./integration/test-raw-queries');
const EntityManagerTest = require('./unit/test-entity-manager');
const TypeMapperTest = require('./unit/test-type-mapper');
const DriversUnitTest = require('./unit/test-drivers');
const EntitiesGenerationTest = require('./unit/test-entities-generation');
const ModelsGenerationTest = require('./unit/test-models-generation');

if(!process.env.RELDENS_TEST_DB_HOST){
    let envPath = FileHandler.joinPaths(__dirname, '.env.test');
    if(FileHandler.exists(envPath)){
        process.loadEnvFile(envPath);
    }
}

class RunTests
{

    constructor()
    {
        this.allCounts = {total: 0, passed: 0, failed: 0};
        this.driverBenchmarks = {};
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
        let hasIntegrationTests = !this.suite || 'integration' === this.suite;
        let hasUnitTests = !this.suite || 'unit' === this.suite;
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
        this.logDriverBenchmarks();
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
        let driverNames = TestHelpers.activeDriverNames();
        if(this.driver){
            driverNames = [this.driver];
        }
        await this.runCrossDriverTests(driverNames);
        for(let driverName of driverNames){
            let dataServer = this.driverRegistry.getDriver(driverName);
            let repos = this.driverRegistry.getRepos(driverName);
            if(!dataServer){
                Logger.error('Driver '+driverName+' is not available, counted as a failure.');
                this.allCounts.total++;
                this.allCounts.failed++;
                continue;
            }
            await this.runDriverTests(driverName, dataServer, repos);
        }
    }

    async runCrossDriverTests(driverNames)
    {
        if(2 > driverNames.length){
            Logger.info('Cross driver equivalence needs two active drivers, only '+driverNames.join(', ')+' is.');
            return this.allCounts;
        }
        try {
            return this.appendCounts(
                await (new CrossDriverEquivalenceTest(this.driverRegistry, driverNames)).run(),
                false
            );
        } catch(error) {
            Logger.critical('Cross driver equivalence tests crashed: '+error.message);
            Logger.critical(error.stack);
            this.allCounts.total++;
            this.allCounts.failed++;
        }
        return this.allCounts;
    }

    integrationTestClasses()
    {
        return [
            {label: 'drivers', testClass: DriversTest, isBenchmarked: true},
            {label: 'nested filters', testClass: NestedFiltersTest, isBenchmarked: true},
            {label: 'relations', testClass: RelationsTest, isBenchmarked: true},
            {label: 'raw queries', testClass: RawQueriesTest, isBenchmarked: true},
            {label: 'reldens shape relations', testClass: ReldensShapeRelationsTest, isBenchmarked: false},
            {label: 'reldens sample data', testClass: ReldensSampleDataTest, isBenchmarked: false}
        ];
    }

    async runDriverTests(driverName, dataServer, repos)
    {
        for(let testDefinition of this.integrationTestClasses()){
            try {
                let testInstance = new testDefinition.testClass(dataServer, repos, driverName);
                this.appendCounts(await testInstance.run(), testDefinition.isBenchmarked ? driverName : false);
            } catch(error) {
                Logger.critical(
                    'Driver '+driverName+' '+testDefinition.label+' tests crashed: '+error.message
                );
                Logger.critical(error.stack);
                this.allCounts.total++;
                this.allCounts.failed++;
            }
        }
        return this.driverBenchmarks;
    }

    appendCounts(result, driverName)
    {
        this.allCounts.total += result.total;
        this.allCounts.passed += result.passed;
        this.allCounts.failed += result.failed;
        if(!driverName){
            return result;
        }
        if(!sc.hasOwn(this.driverBenchmarks, driverName)){
            this.driverBenchmarks[driverName] = {total: 0, duration: 0};
        }
        this.driverBenchmarks[driverName].total += result.total;
        this.driverBenchmarks[driverName].duration += sc.get(result, 'duration', 0);
        return result;
    }

    logDriverBenchmarks()
    {
        let driverNames = Object.keys(this.driverBenchmarks);
        if(0 === driverNames.length){
            return false;
        }
        Logger.info('='.repeat(60));
        Logger.info('DRIVER BENCHMARKS - INTEGRATION TESTS');
        Logger.info('='.repeat(60));
        for(let driverName of driverNames){
            let benchmark = this.driverBenchmarks[driverName];
            let average = 0 === benchmark.total ? 0 : (benchmark.duration / benchmark.total).toFixed(2);
            Logger.info(
                driverName+' - tests: '+benchmark.total
                +' - total: '+benchmark.duration+'ms'
                +' - average: '+average+'ms'
            );
        }
        Logger.info('='.repeat(60));
        return true;
    }

    async runUnitTests()
    {
        let unitTestClasses = [
            EntityManagerTest,
            TypeMapperTest,
            DriversUnitTest,
            EntitiesGenerationTest,
            ModelsGenerationTest
        ];
        for(let UnitTestClass of unitTestClasses){
            let unitTest = new UnitTestClass();
            this.appendCounts(await unitTest.run(), false);
        }
        return this.allCounts;
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
runner.run().then(counts => {
    process.exit(0 < counts.failed ? 1 : 0);
}).catch(error => {
    Logger.info('CATASTROPHIC ERROR: Test runner failed completely\n');
    Logger.info('Error: '+error.message+'\n');
    Logger.info(error.stack+'\n');
    process.exit(1);
});
