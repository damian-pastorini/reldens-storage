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

    static loadAll(withRelations)
    {
        let result = this.query();
        let relations = Object.keys(this.relationMappings || {});
        if(withRelations === true && relations){
            result.withGraphFetched('['+relations.join(',')+']');
        }
        return result;
    }

    static loadById(id, withRelations)
    {
        let result = this.query();
        let relations = Object.keys(this.relationMappings || {});
        if(withRelations === true && relations.length > 0){
            result.withGraphFetched('['+relations.join(',')+']');
        }
        return result.findById(id);
    }

    static loadBy(field, value, withRelations)
    {
        let result = this.query();
        let relations = Object.keys((this.relationMappings || {}));
        if(withRelations === true && relations.length > 0){
            result.withGraphFetched('['+relations.join(',')+']');
        }
        return result.where(field, value);
    }

    static updateBy(field, fieldValue, updatePatch)
    {
        return this.query().patch(updatePatch).where(field, fieldValue);
    }

}

module.exports.ModelClass = ObjectionJsModel;
