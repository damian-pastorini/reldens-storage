/**
 *
 * Reldens - Test Reviews Fixtures
 * Universal fixtures for all drivers (no driver-specific nesting)
 *
 */

module.exports.ReviewsFixtures = {
    review_crud_1: {
        id: 3400,
        product_id: 2400,
        reviewer_name: 'John Doe',
        reviewer_email: 'john@example.com',
        rating: 5,
        title: 'Excellent product!',
        comment: 'Very satisfied with this purchase',
        is_verified: 1,
        helpful_count: 10
    },
    review_relations_1: {
        id: 3600,
        product_id: 2600,
        reviewer_name: 'Jane Smith',
        reviewer_email: 'jane@example.com',
        rating: 4,
        title: 'Good value',
        comment: 'Works as expected',
        is_verified: 1,
        helpful_count: 5
    },
    review_relations_2: {
        id: 3601,
        product_id: 2601,
        reviewer_name: 'Bob Johnson',
        reviewer_email: 'bob@example.com',
        rating: 5,
        title: 'Great quality',
        comment: 'Highly recommended',
        is_verified: 1,
        helpful_count: 8
    }
};
