/**
 *
 * Reldens - TestProductDetailsModel
 *
 */

const { MikroOrmCore } = require('../../../index');
const { EntitySchema } = MikroOrmCore;

class TestProductDetailsModel
{

    constructor(id, product_id, weight, dimensions, customData, useTimeOut, category_id, created_at, updated_at)
    {
        this.id = id;
        this.product_id = product_id;
        this.weight = weight;
        this.dimensions = dimensions;
        this.customData = customData;
        this.useTimeOut = useTimeOut;
        this.category_id = category_id;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }

    static createByProps(props)
    {
        const {id, product_id, weight, dimensions, customData, useTimeOut, category_id, created_at, updated_at} = props;
        return new this(id, product_id, weight, dimensions, customData, useTimeOut, category_id, created_at, updated_at);
    }

}

const schema = new EntitySchema({
    class: TestProductDetailsModel,
    tableName: 'test_product_details',
    properties: {
        id: { type: 'int', primary: true },
        product_id: { type: 'int' },
        weight: { type: 'decimal', nullable: true },
        dimensions: { type: 'varchar', nullable: true },
        customData: { type: 'text', nullable: true },
        useTimeOut: { type: 'int', nullable: true },
        category_id: { type: 'int', nullable: true },
        created_at: { type: 'timestamp', nullable: true },
        updated_at: { type: 'timestamp', nullable: true },
        related_test_products: {
            kind: '1:1',
            entity: () => require('./test-products-model').TestProductsModel,
            joinColumns: ['product_id'],
            persist: false
        },
        related_test_categories: {
            kind: 'm:1',
            entity: () => require('./test-categories-model').TestCategoriesModel,
            joinColumns: ['category_id'],
            nullable: true,
            persist: false
        }
    },
});
schema._fkMappings = {
    "product_id": {
        "relationKey": "related_test_products",
        "entityName": "TestProductsModel",
        "referencedColumn": "id",
        "nullable": false
    },
    "category_id": {
        "relationKey": "related_test_categories",
        "entityName": "TestCategoriesModel",
        "referencedColumn": "id",
        "nullable": true
    }
};
module.exports = {
    TestProductDetailsModel,
    entity: TestProductDetailsModel,
    schema: schema
};
