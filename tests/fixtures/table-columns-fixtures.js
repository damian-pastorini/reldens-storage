/**
 *
 * Reldens - Test Table Columns Fixtures
 * Every column of every test table with the JavaScript type it must be returned as and the database default
 * applied when the inserted fixture does not include it, mirroring tests/fixtures/sql/test-schema.sql.
 *
 */

module.exports.TableColumnsFixtures = {
    test_categories: {
        columns: {
            id: 'number',
            name: 'string',
            slug: 'string',
            description: 'string',
            is_active: 'number',
            display_order: 'number',
            created_at: 'date',
            updated_at: 'date'
        },
        defaults: {
            description: null,
            is_active: 1,
            display_order: 0
        }
    },
    test_products: {
        columns: {
            id: 'number',
            category_id: 'number',
            name: 'string',
            sku: 'string',
            description: 'string',
            price: 'string',
            stock_quantity: 'number',
            is_featured: 'number',
            metadata: 'json',
            tags: 'string',
            status: 'string',
            created_at: 'date',
            updated_at: 'date'
        },
        defaults: {
            description: null,
            stock_quantity: 0,
            is_featured: 0,
            metadata: null,
            tags: null,
            status: 'draft'
        }
    },
    test_product_details: {
        columns: {
            id: 'number',
            product_id: 'number',
            weight: 'number',
            dimensions: 'string',
            customData: 'string',
            useTimeOut: 'number',
            total_views: 'number',
            category_id: 'number',
            created_at: 'date',
            updated_at: 'date'
        },
        defaults: {
            weight: null,
            dimensions: null,
            customData: null,
            useTimeOut: null,
            total_views: null,
            category_id: null
        }
    },
    test_reviews: {
        columns: {
            id: 'number',
            product_id: 'number',
            reviewer_name: 'string',
            reviewer_email: 'string',
            rating: 'number',
            title: 'string',
            comment: 'string',
            is_verified: 'number',
            helpful_count: 'number',
            category_slug: 'string',
            created_at: 'date',
            updated_at: 'date'
        },
        defaults: {
            title: null,
            comment: null,
            is_verified: 0,
            helpful_count: 0,
            category_slug: null
        }
    }
};
