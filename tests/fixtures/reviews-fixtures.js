/**
 *
 * Reldens - Test Reviews Fixtures
 *
 */

const baseReviews = {
    review1: {
        reviewer_name: 'John Doe',
        rating: 5,
        title: 'Excellent product!',
        comment: 'Very satisfied with this purchase',
        is_verified: 1,
        helpful_count: 10
    },
    review2: {
        reviewer_name: 'Jane Smith',
        rating: 4,
        title: 'Good value',
        comment: 'Works as expected',
        is_verified: 1,
        helpful_count: 5
    }
};

module.exports.ReviewsFixtures = {
    'objection-js': {
        review1: {...baseReviews.review1, id: 1001, product_id: 1001, reviewer_email: 'john@example.com'},
        review2: {...baseReviews.review2, id: 1002, product_id: 1001, reviewer_email: 'jane@example.com'}
    },
    'mikro-orm': {
        review1: {...baseReviews.review1, id: 2001, product_id: 2001, reviewer_email: 'john-mikro@example.com'},
        review2: {...baseReviews.review2, id: 2002, product_id: 2001, reviewer_email: 'jane-mikro@example.com'}
    },
    prisma: {
        review1: {...baseReviews.review1, id: 3001, product_id: 3001, reviewer_email: 'john-prisma@example.com'},
        review2: {...baseReviews.review2, id: 3002, product_id: 3001, reviewer_email: 'jane-prisma@example.com'}
    }
};
