/**
 *
 * Reldens - TestProductsModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
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
    properties: {
        id: { type: 'number', primary: true },
        category_id: { type: 'number' },
        name: { type: 'string' },
        sku: { type: 'string' },
        description: { type: 'string', nullable: true },
        price: { type: 'number' },
        stock_quantity: { type: 'number' },
        is_featured: { type: 'number' },
        metadata: { type: 'object', nullable: true },
        tags: { type: 'string', nullable: true },
        status: { type: 'undefined' },
        created_at: { type: 'Date' },
        updated_at: { type: 'Date' }
    },
});

module.exports = {
    TestProductsModel,
    entity: TestProductsModel,
    schema: schema
};
