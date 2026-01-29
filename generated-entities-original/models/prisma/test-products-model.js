/**
 *
 * Reldens - TestProductsModel
 *
 */

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

    static get tableName()
    {
        return 'test_products';
    }
    

    static get relationTypes()
    {
        return {
            test_categories: 'one',
            test_reviews: 'many'
        };
    }

    static get relationMappings()
    {
        return {
            'related_test_categories': 'test_categories',
            'related_test_reviews': 'test_reviews'
        };
    }
}

module.exports.TestProductsModel = TestProductsModel;
