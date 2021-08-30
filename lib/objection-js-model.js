/**
 *
 * Reldens - ObjectionModel
 *
 * Objection JS Model wrapper.
 *
 */

const { Model } = require('objection');

class ObjectionJsModel extends Model
{

    static loadAll()
    {
        return this.query();
    }

    static loadBy(field, value)
    {
        return this.query().where(field, value);
    }

    static updateBy(field, fieldValue, updatePatch)
    {
        return this.query().patch(updatePatch).where(field, fieldValue);
    }

}

module.exports.ModelClass = ObjectionJsModel;
