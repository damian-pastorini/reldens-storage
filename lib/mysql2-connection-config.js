/**
 *
 * Reldens - Mysql2ConnectionConfig
 *
 */

const { sc } = require('@reldens/utils');

let validMySQL2Options = [
    'authPlugins', 'authSwitchHandler', 'bigNumberStrings', 'charset', 'charsetNumber', 'compress',
    'connectAttributes', 'connectTimeout', 'database', 'dateStrings', 'debug', 'decimalNumbers',
    'enableKeepAlive', 'flags', 'host', 'insecureAuth', 'infileStreamFactory', 'isServer',
    'keepAliveInitialDelay', 'localAddress', 'maxPreparedStatements', 'multipleStatements',
    'namedPlaceholders', 'nestTables', 'password', 'password1', 'password2', 'password3', 'passwordSha1',
    'pool', 'port', 'queryFormat', 'rowsAsArray', 'socketPath', 'ssl', 'stream', 'stringifyObjects',
    'supportBigNumbers', 'timezone', 'trace', 'typeCast', 'uri', 'user', 'disableEval', 'connectionLimit',
    'maxIdle', 'idleTimeout', 'Promise', 'queueLimit', 'waitForConnections', 'jsonStrings', 'gracefulEnd'
];

class Mysql2ConnectionConfig
{

    static sanitize(config)
    {
        let cleanConfig = {};
        for(let prop of validMySQL2Options){
            if(sc.hasOwn(config, prop)){
                cleanConfig[prop] = config[prop];
            }
        }
        return cleanConfig;
    }

}

module.exports.validMySQL2Options = validMySQL2Options;

module.exports.Mysql2ConnectionConfig = Mysql2ConnectionConfig;
