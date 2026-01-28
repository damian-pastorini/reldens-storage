/**
 *
 * Reldens - Test Products Fixtures
 * Universal fixtures for all drivers (no driver-specific nesting)
 *
 */

module.exports.ProductsFixtures = {
    product_create_json: {
        name: 'Laptop Pro 15',
        description: 'High-performance laptop',
        sku: 'LAPTOP-PRO-15',
        price: 1299.99,
        stock_quantity: 50,
        is_featured: 1,
        metadata: JSON.stringify({warranty: '2 years', color: 'silver'}),
        tags: 'electronics,computers,featured',
        status: 'published'
    },
    product_create_enum: {
        name: 'T-Shirt Classic',
        description: 'Cotton t-shirt',
        sku: 'TSHIRT-CLASSIC',
        price: 24.99,
        stock_quantity: 200,
        is_featured: 0,
        metadata: JSON.stringify({size: 'M', material: 'cotton'}),
        tags: 'clothing,apparel',
        status: 'published'
    },
    product_fk_test: {
        category_id: 9999,
        name: 'Invalid Category Product',
        description: 'Product with invalid category FK',
        sku: 'INVALID-FK-TEST',
        price: 9.99,
        stock_quantity: 1,
        is_featured: 0,
        metadata: JSON.stringify({}),
        tags: 'test',
        status: 'draft'
    },
    product_reviews_crud: {
        id: 2400,
        category_id: 1400,
        name: 'Reviews CRUD Product',
        description: 'Product for reviews CRUD tests',
        sku: 'REVIEWS-CRUD-PROD',
        price: 99.99,
        stock_quantity: 10,
        is_featured: 1,
        metadata: JSON.stringify({test: 'reviews'}),
        tags: 'test,reviews',
        status: 'published'
    },
    product_filters_1: {
        id: 2500,
        category_id: 1500,
        name: 'Filters Product 1',
        description: 'First product for filter tests',
        sku: 'FILTERS-PROD-1',
        price: 49.99,
        stock_quantity: 25,
        is_featured: 1,
        metadata: JSON.stringify({test: 'filters'}),
        tags: 'test,filters',
        status: 'published'
    },
    product_filters_2: {
        id: 2501,
        category_id: 1500,
        name: 'Filters Product 2',
        description: 'Second product for filter tests',
        sku: 'FILTERS-PROD-2',
        price: 79.99,
        stock_quantity: 15,
        is_featured: 0,
        metadata: JSON.stringify({test: 'filters'}),
        tags: 'test,filters',
        status: 'draft'
    },
    product_relations_1: {
        id: 2600,
        category_id: 1600,
        name: 'Relations Product 1',
        description: 'First product for relations tests',
        sku: 'RELATIONS-PROD-1',
        price: 149.99,
        stock_quantity: 30,
        is_featured: 1,
        metadata: JSON.stringify({test: 'relations'}),
        tags: 'test,relations',
        status: 'published'
    },
    product_relations_2: {
        id: 2601,
        category_id: 1601,
        name: 'Relations Product 2',
        description: 'Second product for relations tests',
        sku: 'RELATIONS-PROD-2',
        price: 199.99,
        stock_quantity: 20,
        is_featured: 1,
        metadata: JSON.stringify({test: 'relations'}),
        tags: 'test,relations',
        status: 'published'
    }
};
