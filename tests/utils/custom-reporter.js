/**
 *
 * Reldens - Custom Test Reporter
 * Filters test output to remove suites, cancelled (treats as fail), skipped, todo
 *
 */

const { Transform } = require('node:stream');

class OutputFilter extends Transform
{
    constructor()
    {
        super();
        this.buffer = '';
        this.stats = {
            tests: 0,
            pass: 0,
            fail: 0,
            cancelled: 0
        };
    }

    _transform(chunk, encoding, callback)
    {
        this.buffer += chunk.toString();
        let lines = this.buffer.split('\n');
        this.buffer = lines.pop();
        for(let line of lines){
            // Extract stats before filtering
            if(line.includes('ℹ tests ')){
                this.stats.tests = parseInt(line.match(/\d+/)[0]);
            }
            if(line.includes('ℹ pass ')){
                this.stats.pass = parseInt(line.match(/\d+/)[0]);
            }
            if(line.includes('ℹ fail ')){
                this.stats.fail = parseInt(line.match(/\d+/)[0]);
            }
            if(line.includes('ℹ cancelled ')){
                this.stats.cancelled = parseInt(line.match(/\d+/)[0]);
                continue; // Skip this line
            }
            if(line.includes('ℹ skipped ')){
                continue; // Skip this line
            }
            if(line.includes('ℹ todo ')){
                continue; // Skip this line
            }
            if(line.includes('ℹ suites ')){
                continue; // Skip this line
            }
            this.push(line + '\n');
        }
        callback();
    }

    _flush(callback)
    {
        if(this.buffer){
            this.push(this.buffer);
        }
        // Output corrected summary (cancelled becomes fail)
        if(0 < this.stats.tests){
            this.push('\n');
            this.push('ℹ tests ' + this.stats.tests + '\n');
            this.push('ℹ pass ' + this.stats.pass + '\n');
            this.push('ℹ fail ' + (this.stats.fail + this.stats.cancelled) + '\n');
        }
        callback();
    }
}

module.exports = { OutputFilter };
