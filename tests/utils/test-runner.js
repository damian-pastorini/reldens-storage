/**
 *
 * Reldens - Storage Test Runner Utility
 *
 */

const assert = require('node:assert');

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
        process.stderr.write('\n▶ '+name+'\n');
    }

    group(name)
    {
        this.currentGroup = name;
        process.stderr.write('  ▶ '+name+'\n');
    }

    async test(name, testFn)
    {
        this.testCount++;
        let startTime = Date.now();
        try {
            await testFn();
            this.passedCount++;
            let duration = Date.now() - startTime;
            process.stderr.write('    ✔ '+name+' ('+duration+'ms)\n');
        } catch(error) {
            this.failedCount++;
            let duration = Date.now() - startTime;
            process.stderr.write('    ✖ '+name+' ('+duration+'ms)\n');
            process.stderr.write('      Error: '+error.message+'\n');
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
