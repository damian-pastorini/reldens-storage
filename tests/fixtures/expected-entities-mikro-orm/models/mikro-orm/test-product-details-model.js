/**
 *
 * Reldens - TestProductDetailsModel
 *
 */

const { MikroOrmCore } = require('../../../index');
const { EntitySchema } = MikroOrmCore;

class TestProductDetailsModel
{

    constructor(id, product_id, weight, dimensions, created_at, updated_at)
    {
        this.id = id;
        this.product_id = product_id;
        this.weight = weight;
        this.dimensions = dimensions;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }

    static createByProps(props)
    {
        const {id, product_id, weight, dimensions, created_at, updated_at} = props;
        return new this(id, product_id, weight, dimensions, created_at, updated_at);
    }

}

const schema = new EntitySchema({
    class: TestProductDetailsModel,
    tableName: 'test_product_details',
    properties: {
        id: { type: 'number', primary: true },
        product_id: { type: 'number', persist: false },
        weight: { type: 'number', nullable: true },
        dimensions: { type: 'string', nullable: true },
        created_at: { type: 'Date', nullable: true },
        updated_at: { type: 'Date', nullable: true },
        related_test_products: {
            kind: '1:1',
            entity: () => require('./test-products-model').TestProductsModel,
            joinColumns: ['product_id']
        }
    },
});
schema._fkMappings = {
    "product_id": {
        "relationKey": "related_test_products",
        "entityName": "TestProductsModel",
        "referencedColumn": "id",
        "nullable": false
    }
};
module.exports = {
    TestProductDetailsModel,
    entity: TestProductDetailsModel,
    schema: schema
};
