/**
 *
 * Reldens - TestCategoriesModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class TestCategoriesModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'test_categories';
    }

    static get relationMappings()
    {
        const { TestProductsModel } = require('./test-products-model');
        return {
            related_test_products: {
                relation: this.HasManyRelation,
                modelClass: TestProductsModel,
                join: {
                    from: this.tableName+'.id',
                    to: TestProductsModel.tableName+'.category_id'
                }
            }
        };
    }
}

module.exports.TestCategoriesModel = TestCategoriesModel;
