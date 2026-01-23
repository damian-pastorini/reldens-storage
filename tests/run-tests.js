/**
 *
 * Reldens - Storage Test Runner
 *
 */

const { Logger, sc } = require('@reldens/utils');
const { FileHandler } = require('@reldens/server-utils');
const { run } = require('node:test');
const { spec } = require('node:test/reporters');
const { TestHelpers } = require('./utils/test-helpers');
const { OutputFilter } = require('./utils/custom-reporter');
const { DriverRegistry } = require('./utils/driver-registry');
const DriversTest = require('./integration/test-drivers');
const NestedFiltersTest = require('./integration/test-nested-filters');
const RelationsTest = require('./integration/test-relations');

if(!process.env.RELDENS_TEST_DB_HOST){
    let envPath = FileHandler.joinPaths(__dirname, '.env.test');
    if(FileHandler.exists(envPath)){
        require('dotenv').config({path: envPath});
    }
}

async function runTests()
{
    process.stderr.write('='.repeat(60)+'\n');
    process.stderr.write('@RELDENS/STORAGE - TEST SUITE\n');
    process.stderr.write('='.repeat(60)+'\n');
    process.stderr.write('Test execution started: '+sc.formatDate(new Date())+'\n\n');
    let filter = null;
    let suite = null;
    let driver = null;
    let breakOnError = false;
    for(let arg of process.argv){
        if(arg.startsWith('--filter=')){
            filter = arg.split('=')[1];
            process.stderr.write('Filter applied: '+filter+'\n');
        }
        if(arg.startsWith('--suite=')){
            suite = arg.split('=')[1];
            process.stderr.write('Suite: '+suite+'\n');
        }
        if(arg.startsWith('--driver=')){
            driver = arg.split('=')[1];
            process.stderr.write('Driver: '+driver+'\n');
        }
        if(arg === '--break-on-error'){
            breakOnError = true;
            process.stderr.write('Break on error enabled\n');
        }
    }
    let config = TestHelpers.getTestDbConfig();
    TestHelpers.cleanupGeneratedFiles();
    await runPreFlightChecks(config);
    let testDir = __dirname;
    if(suite){
        testDir = FileHandler.joinPaths(__dirname, suite);
    }
    let testFiles = await getTestFiles(testDir);
    if(filter){
        testFiles = testFiles.filter(file => file.includes(filter));
    }
    if(driver){
        testFiles = testFiles.filter(file => file.includes(driver) || !file.includes('integration'));
    }
    if(0 === testFiles.length){
        let filterMsg = filter ? ' matching filter: '+filter : '';
        process.stderr.write('No test files found'+filterMsg+'\n');
        process.exit(1);
    }
    process.stderr.write('Found '+testFiles.length+' test file(s)\n\n');
    let hasIntegrationTests = testFiles.some(file => file.includes('integration'));
    let hasUnitTests = testFiles.some(file => file.includes('unit'));
    process.stderr.write('Integration tests: '+(hasIntegrationTests ? 'YES' : 'NO')+'\n');
    process.stderr.write('Unit tests: '+(hasUnitTests ? 'YES' : 'NO')+'\n\n');
    await DriverRegistry.initialize();
    if(hasIntegrationTests){
        process.stderr.write('Registering integration test classes with Node test runner...\n');
        let driverNames = ['objection-js', 'mikro-orm', 'prisma'];
        for(let driverName of driverNames){
            let dataServer = DriverRegistry.getDriver(driverName);
            let repos = DriverRegistry.getRepos(driverName);
            if(!dataServer || !repos){
                Logger.warning('Skipping tests for '+driverName+' (driver not initialized)');
                continue;
            }
            Logger.info('Registering test classes for driver: '+driverName);
            let driversTest = new DriversTest(dataServer, repos, driverName);
            driversTest.run();
            let nestedFiltersTest = new NestedFiltersTest(dataServer, repos, driverName);
            nestedFiltersTest.run();
            let relationsTest = new RelationsTest(dataServer, repos, driverName);
            relationsTest.run();
        }
        process.stderr.write('Integration test classes registered\n\n');
    }
    let filesToLoad = [];
    if(hasUnitTests){
        filesToLoad = testFiles.filter(file => file.includes('unit'));
        process.stderr.write('Unit test files to load: '+filesToLoad.length+'\n\n');
    }
    process.stderr.write('Starting test runner to execute ALL tests...\n');
    let testStream = run({
        files: filesToLoad,
        concurrency: false
    });
    let outputFilter = new OutputFilter();
    testStream.compose(spec).pipe(outputFilter).pipe(process.stdout);
    testStream.on('test:fail', () => {
        process.exitCode = 1;
    });
    await new Promise((resolve) => {
        testStream.on('end', resolve);
    });
    await DriverRegistry.cleanup();
    setTimeout(() => {
        process.stderr.write('\nForce exiting after 5 seconds (connections may still be open)\n');
        process.exit(process.exitCode || 0);
    }, 5000);
}

async function runPreFlightChecks(config)
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

async function getTestFiles(directory)
{
    let files = [];
    if(!FileHandler.exists(directory)){
        return files;
    }
    let items = FileHandler.readFolder(directory);
    for(let item of items){
        let fullPath = FileHandler.joinPaths(directory, item);
        let isDirectory = FileHandler.isFolder(fullPath);
        if(isDirectory){
            let subFiles = await getTestFiles(fullPath);
            files = files.concat(subFiles);
            continue;
        }
        if(item.startsWith('test-') && item.endsWith('.js')){
            files.push(fullPath);
        }
    }
    return files;
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

runTests().catch(error => {
    process.stderr.write('Test runner error: '+error.message+'\n');
    process.stderr.write(error.stack+'\n');
    process.exit(1);
});
