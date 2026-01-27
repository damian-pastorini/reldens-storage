/**
 *
 * Reldens - Test Categories Fixtures
 * Universal fixtures for all drivers (no driver-specific nesting)
 *
 */

module.exports.CategoriesFixtures = {
    category_create_single: {
        id: 1001,
        name: 'Electronics',
        description: 'Electronic devices and gadgets',
        is_active: 1,
        display_order: 1,
        slug: 'electronics'
    },
    category_create_json: {
        id: 1002,
        name: 'Books',
        description: 'Books and literature',
        is_active: 1,
        display_order: 2,
        slug: 'books'
    },
    category_create_enum: {
        id: 1003,
        name: 'Clothing',
        description: 'Apparel and fashion',
        is_active: 0,
        display_order: 3,
        slug: 'clothing'
    },
    category_unique_test: {
        id: 1004,
        name: 'Sports',
        description: 'Sports equipment and gear',
        is_active: 1,
        display_order: 4,
        slug: 'sports'
    },
    category_update_by_id: {
        id: 1100,
        name: 'Furniture',
        description: 'Home and office furniture',
        is_active: 1,
        display_order: 1,
        slug: 'furniture'
    },
    category_update_by_filters: {
        id: 1101,
        name: 'Toys',
        description: 'Toys and games',
        is_active: 1,
        display_order: 2,
        slug: 'toys'
    },
    category_update_by_field: {
        id: 1102,
        name: 'Garden',
        description: 'Garden tools and supplies',
        is_active: 1,
        display_order: 3,
        slug: 'garden'
    },
    category_upsert_new: {
        id: 1103,
        name: 'Automotive',
        description: 'Auto parts and accessories',
        is_active: 1,
        display_order: 4,
        slug: 'automotive'
    },
    category_delete_by_id: {
        id: 1200,
        name: 'Music',
        description: 'Musical instruments and equipment',
        is_active: 1,
        display_order: 1,
        slug: 'music'
    },
    category_delete_by_filters: {
        id: 1201,
        name: 'Art',
        description: 'Art supplies and materials',
        is_active: 1,
        display_order: 2,
        slug: 'art'
    },
    category_query_1: {
        id: 1300,
        name: 'Query Test 1',
        description: 'First category for query tests',
        is_active: 1,
        display_order: 1,
        slug: 'query-test-1'
    },
    category_query_2: {
        id: 1301,
        name: 'Query Test 2',
        description: 'Second category for query tests',
        is_active: 1,
        display_order: 2,
        slug: 'query-test-2'
    },
    category_query_3: {
        id: 1302,
        name: 'Query Test 3',
        description: 'Third category for query tests',
        is_active: 0,
        display_order: 3,
        slug: 'query-test-3'
    },
    category_reviews_crud: {
        id: 1400,
        name: 'Reviews CRUD Test',
        description: 'Category for reviews CRUD tests',
        is_active: 1,
        display_order: 1,
        slug: 'reviews-crud-test'
    },
    category_filters_1: {
        id: 1500,
        name: 'Filters Test 1',
        description: 'First category for filter tests',
        is_active: 1,
        display_order: 1,
        slug: 'filters-test-1'
    },
    category_filters_2: {
        id: 1501,
        name: 'Filters Test 2',
        description: 'Second category for filter tests',
        is_active: 1,
        display_order: 2,
        slug: 'filters-test-2'
    },
    category_filters_3: {
        id: 1502,
        name: 'Filters Test 3',
        description: 'Third category for filter tests',
        is_active: 0,
        display_order: 3,
        slug: 'filters-test-3'
    },
    category_relations_1: {
        id: 1600,
        name: 'Relations Test 1',
        description: 'First category for relations tests',
        is_active: 1,
        display_order: 1,
        slug: 'relations-test-1'
    },
    category_relations_2: {
        id: 1601,
        name: 'Relations Test 2',
        description: 'Second category for relations tests',
        is_active: 1,
        display_order: 2,
        slug: 'relations-test-2'
    }
};
