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
            let duration = Date.now() - startTime;
            Logger.info('    ✔ '+name+' ('+duration+'ms)');
        } catch(error) {
            this.failedCount++;
            let duration = Date.now() - startTime;
            Logger.error('    ✖ '+name+' ('+duration+'ms)');
            Logger.error('      Error: '+error.message);
        }
    }

    getResults()
    {
        return {
            total: this.testCount,
            passed: this.passedCount,
            failed: this.failedCount
        };
    }

}

module.exports.TestRunner = TestRunner;
module.exports.assert = assert;
