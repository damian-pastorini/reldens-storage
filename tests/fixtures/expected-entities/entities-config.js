/**
 *
 * Reldens - Entities Config
 *
 */

const { TestCategoriesEntity } = require('./entities/test-categories-entity');
const { TestProductsEntity } = require('./entities/test-products-entity');
const { TestReviewsEntity } = require('./entities/test-reviews-entity');

let entitiesConfig = {
    testCategories: TestCategoriesEntity.propertiesConfig(),
    testProducts: TestProductsEntity.propertiesConfig(),
    testReviews: TestReviewsEntity.propertiesConfig()
};

module.exports.entitiesConfig = entitiesConfig;
