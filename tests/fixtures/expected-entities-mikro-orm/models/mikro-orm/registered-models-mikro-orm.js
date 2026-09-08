/**
 *
 * Reldens - Registered Models
 *
 */

const testCategoriesModel = require('./test-categories-model');
const testProductDetailsModel = require('./test-product-details-model');
const testProductsModel = require('./test-products-model');
const testReviewsModel = require('./test-reviews-model');
const { entitiesConfig } = require('../../entities-config');
const { entitiesTranslations } = require('../../entities-translations');

let rawRegisteredEntities = {
    testCategories: testCategoriesModel,
    testProductDetails: testProductDetailsModel,
    testProducts: testProductsModel,
    testReviews: testReviewsModel
};

module.exports.rawRegisteredEntities = rawRegisteredEntities;

module.exports.entitiesConfig = entitiesConfig;

module.exports.entitiesTranslations = entitiesTranslations;
