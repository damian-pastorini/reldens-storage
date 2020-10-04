/**
 *
 * Reldens - ObjectionModel
 *
 * Objection JS Model wrapper.
 *
 */

const { Model } = require('objection');

class ObjectionModel extends Model
{

    static loadAll()
    {
        return this.query();
    }

}

module.exports.ObjectionModel = ObjectionModel;
