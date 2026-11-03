/**
 *
 * Reldens - TestProductDetailsModel
 *
 */

class TestProductDetailsModel
{

    constructor(id, product_id, weight, dimensions, customData, useTimeOut, created_at, updated_at)
    {
        this.id = id;
        this.product_id = product_id;
        this.weight = weight;
        this.dimensions = dimensions;
        this.customData = customData;
        this.useTimeOut = useTimeOut;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }

    static get tableName()
    {
        return 'test_product_details';
    }


    static get relationTypes()
    {
        return {
            test_products: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_test_products': 'test_products'
        };
    }
}

module.exports.TestProductDetailsModel = TestProductDetailsModel;
