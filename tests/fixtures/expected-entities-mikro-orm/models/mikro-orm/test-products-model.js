/**
 *
 * Reldens - TestProductsModel
 *
 */

const { MikroOrmCore } = require('../../../index');
const { EntitySchema } = MikroOrmCore;

class TestProductsModel
{

    constructor(id, category_id, name, sku, description, price, stock_quantity, is_featured, metadata, tags, status, created_at, updated_at)
    {
        this.id = id;
        this.category_id = category_id;
        this.name = name;
        this.sku = sku;
        this.description = description;
        this.price = price;
        this.stock_quantity = stock_quantity;
        this.is_featured = is_featured;
        this.metadata = metadata;
        this.tags = tags;
        this.status = status;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }

    static createByProps(props)
    {
        const {id, category_id, name, sku, description, price, stock_quantity, is_featured, metadata, tags, status, created_at, updated_at} = props;
        return new this(id, category_id, name, sku, description, price, stock_quantity, is_featured, metadata, tags, status, created_at, updated_at);
    }
    
}

const schema = new EntitySchema({
    class: TestProductsModel,
    tableName: 'test_products',
    properties: {
        id: { type: 'int', primary: true },
        category_id: { type: 'int' },
        name: { type: 'varchar' },
        sku: { type: 'varchar' },
        description: { type: 'text', nullable: true },
        price: { type: 'decimal' },
        stock_quantity: { type: 'int', nullable: true },
        is_featured: { type: 'tinyint', nullable: true },
        metadata: { type: 'json', nullable: true },
        tags: { type: 'varchar', nullable: true },
        status: { type: 'enum', nullable: true },
        created_at: { type: 'timestamp', nullable: true },
        updated_at: { type: 'timestamp', nullable: true },
        related_test_categories: {
            kind: 'm:1',
            entity: () => require('./test-categories-model').TestCategoriesModel,
            joinColumns: ['category_id'],
            persist: false
        },
        related_test_product_details: {
            kind: '1:1',
            entity: () => require('./test-product-details-model').TestProductDetailsModel,
            mappedBy: 'related_test_products'
        },
        related_test_reviews: {
            kind: '1:m',
            entity: () => require('./test-reviews-model').TestReviewsModel,
            mappedBy: 'related_test_products'
        }
    },
});
schema._fkMappings = {
    "category_id": {
        "relationKey": "related_test_categories",
        "entityName": "TestCategoriesModel",
        "referencedColumn": "id",
        "nullable": false
    }
};
module.exports = {
    TestProductsModel,
    entity: TestProductsModel,
    schema: schema
};
