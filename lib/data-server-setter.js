/**
 *
 * Reldens - DataServerSetter
 *
 */

const { ErrorManager, sc } = require('@reldens/utils');

class DataServerSetter
{

    static setValidDataServer(props, object)
    {
        object.dataServer = sc.getDef(props, 'dataServer', false);
        if(
            false === object.dataServer
            // @TODO - BETA - When moving to ES or TS dataServer will be typed and an interface.
            || 'function' !== typeof object.dataServer.connect
            || 'function' !== typeof object.dataServer.generateEntities
        ){
            ErrorManager.error('Data Server instance not found.', props, object);
        }
    }

}

module.exports.DataServerSetter = DataServerSetter;
