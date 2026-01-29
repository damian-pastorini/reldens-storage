/**
 *
 * Reldens - TestReviewsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class TestReviewsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'test_reviews';
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

module.exports.TestReviewsModel = TestReviewsModel;
