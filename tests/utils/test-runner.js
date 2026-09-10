/**
 *
 * Reldens - Storage Test Runner Utility
 *
 */

const assert = require('node:assert');
const { Logger } = require('@reldens/utils');

class TestRunner
{

    constructor()
    {
        this.testCount = 0;
        this.passedCount = 0;
        this.failedCount = 0;
        this.currentSuite = '';
        this.currentGroup = '';
        this.totalDuration = 0;
    }

    suite(name)
    {
        this.currentSuite = name;
        Logger.info('▶ '+name);
    }

    group(name)
    {
        this.currentGroup = name;
        Logger.info('  ▶ '+name);
    }

    async test(name, testFn)
    {
        this.testCount++;
        let startTime = Date.now();
        try {
            await testFn();
            this.passedCount++;
            this.logTestResult(name, startTime, false);
        } catch(error) {
            this.failedCount++;
            this.logTestResult(name, startTime, true);
            Logger.error('      Error: '+error.message);
        }
    }

    fail(name, message)
    {
        this.testCount++;
        this.failedCount++;
        Logger.error('    ✖ '+name);
        Logger.error('      Error: '+message);
        return this.getResults();
    }

    logTestResult(name, startTime, hasFailed)
    {
        let duration = Date.now() - startTime;
        this.totalDuration += duration;
        if(hasFailed){
            Logger.error('    ✖ '+name+' ('+duration+'ms)');
            return duration;
        }
        Logger.info('    ✔ '+name+' ('+duration+'ms)');
        return duration;
    }

    getResults()
    {
        return {
            total: this.testCount,
            passed: this.passedCount,
            failed: this.failedCount,
            duration: this.totalDuration
        };
    }

}

module.exports.TestRunner = TestRunner;
module.exports.assert = assert;
