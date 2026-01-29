/**
 *
 * Reldens - TestProductsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class TestProductsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'test_products';
    }

    static get relationMappings()
    {
        const { TestCategoriesModel } = require('./test-categories-model');
        const { TestReviewsModel } = require('./test-reviews-model');
        return {
            related_test_categories: {
                relation: this.BelongsToOneRelation,
                modelClass: TestCategoriesModel,
                join: {
                    from: this.tableName+'.category_id',
                    to: TestCategoriesModel.tableName+'.id'
                }
            },
            related_test_reviews: {
                relation: this.HasManyRelation,
                modelClass: TestReviewsModel,
                join: {
                    from: this.tableName+'.id',
                    to: TestReviewsModel.tableName+'.product_id'
                }
            }
        };
    }
}

module.exports.TestProductsModel = TestProductsModel;
