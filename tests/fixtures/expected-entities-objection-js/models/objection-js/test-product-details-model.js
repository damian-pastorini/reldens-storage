/**
 *
 * Reldens - TestProductDetailsModel
 *
 */

const { ObjectionJsRawModel } = require('../../../index');

class TestProductDetailsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'test_product_details';
    }

    static get relationMappings()
    {
        const { TestProductsModel } = require('./test-products-model');
        return {
            related_test_products: {
                relation: this.BelongsToOneRelation,
                modelClass: TestProductsModel,
                join: {
                    from: this.tableName+'.product_id',
                    to: TestProductsModel.tableName+'.id'
                }
            }
        };
    }
}

module.exports.TestProductDetailsModel = TestProductDetailsModel;
