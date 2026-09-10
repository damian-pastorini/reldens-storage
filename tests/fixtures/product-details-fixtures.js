/**
 *
 * Reldens - Test Product Details Fixtures
 * Universal fixtures for all drivers (no driver-specific nesting)
 *
 */

module.exports.ProductDetailsFixtures = {
    product_details_relations_1: {
        id: 4600,
        product_id: 2600,
        weight: 1.25,
        dimensions: '10x20x30',
        customData: '{"origin":"fixture"}',
        useTimeOut: 45,
        total_views: 9007199254740991
    },
    product_details_create_nested: {
        weight: 2.5,
        dimensions: '5x5x5'
    }
};
