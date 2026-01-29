/**
 *
 * Reldens - Registered Models
 *
 */

const { TestCategoriesModel } = require('./test-categories-model');
const { TestProductsModel } = require('./test-products-model');
const { TestReviewsModel } = require('./test-reviews-model');
const { entitiesConfig } = require('../../entities-config');
const { entitiesTranslations } = require('../../entities-translations');

let rawRegisteredEntities = {
    testCategories: TestCategoriesModel,
    testProducts: TestProductsModel,
    testReviews: TestReviewsModel
};

module.exports.rawRegisteredEntities = rawRegisteredEntities;

module.exports.entitiesConfig = entitiesConfig;

module.exports.entitiesTranslations = entitiesTranslations;
