/**
 *
 * Reldens - Cross Driver Equivalence Test
 * Runs the exact same repository call on every active driver against the very same fixture rows and fails
 * when the normalised results are not equivalent, naming the driver, the method, the entity and the key
 * that diverged. The per driver suites prove that each driver works on its own, this suite proves that all
 * of them answer the same thing for the same call.
 *
 */

const assert = require('node:assert');
const { TestRunner } = require('../utils/test-runner');
const { TestHelpers } = require('../utils/test-helpers');
const { EntityProjection } = require('../utils/entity-projection');
const { ProjectionDifference } = require('../utils/projection-difference');
const { CategoriesFixtures } = require('../fixtures/categories-fixtures');
const { ProductsFixtures } = require('../fixtures/products-fixtures');
const { ReviewsFixtures } = require('../fixtures/reviews-fixtures');
const { ProductDetailsFixtures } = require('../fixtures/product-details-fixtures');
const { Logger } = require('@reldens/utils');

class CrossDriverEquivalenceTest
{

    constructor(driverRegistry, driverNames)
    {
        this.driverRegistry = driverRegistry;
        this.driverNames = driverNames;
        this.runner = new TestRunner();
        this.drivers = [];
        this.referenceDriverName = '';
        this.referenceDataServer = false;
        this.minimumDrivers = 2;
        this.volatileKeys = ['created_at', 'updated_at'];
        this.categoryId = CategoriesFixtures.category_relations_1.id;
        this.categorySlug = CategoriesFixtures.category_relations_1.slug;
        this.secondCategoryId = CategoriesFixtures.category_relations_2.id;
        this.productId = ProductsFixtures.product_relations_1.id;
        this.productDetailsId = ProductDetailsFixtures.product_details_relations_1.id;
        this.productsHint = ['related_test_products'];
        this.categoriesHint = ['related_test_categories'];
        this.productsReviewsHint = ['related_test_products.related_test_reviews'];
        this.productsCategoriesHint = ['related_test_products.related_test_categories'];
        this.commaSeparatedHint = 'related_test_categories,related_test_reviews';
        this.updatePatch = {name: 'Cross Driver Updated'};
    }

    async run()
    {
        this.runner.suite('Cross Driver Equivalence');
        if(!this.collectDrivers()){
            return this.runner.fail(
                'cross driver equivalence must have at least '+this.minimumDrivers+' active drivers',
                'Only '+this.drivers.length+' driver(s) were available.'
            );
        }
        await this.runAllGroups();
        return this.runner.getResults();
    }

    collectDrivers()
    {
        for(let driverName of this.driverNames){
            let dataServer = this.driverRegistry.getDriver(driverName);
            if(!dataServer){
                Logger.warning('Cross driver equivalence: driver '+driverName+' is not available.');
                continue;
            }
            this.drivers.push({driverName, dataServer, repos: this.driverRegistry.getRepos(driverName)});
        }
        if(this.minimumDrivers > this.drivers.length){
            Logger.warning('Cross driver equivalence needs at least two active drivers, tests were skipped.');
            return false;
        }
        let referenceDriver = [...this.drivers].shift();
        this.referenceDriverName = referenceDriver.driverName;
        this.referenceDataServer = referenceDriver.dataServer;
        return true;
    }

    async runAllGroups()
    {
        await this.insertSharedFixtures();
        await this.testPlainReads();
        await this.testRelationReads();
        await this.testCounts();
        await this.testWrites();
    }

    async insertSharedFixtures()
    {
        await TestHelpers.cleanDatabase(this.referenceDataServer);
        this.clearIdentityMaps();
        let fixturesByTable = {
            test_categories: [CategoriesFixtures.category_relations_1, CategoriesFixtures.category_relations_2],
            test_products: [ProductsFixtures.product_relations_1, ProductsFixtures.product_relations_2],
            test_reviews: [ReviewsFixtures.review_relations_1, ReviewsFixtures.review_relations_2],
            test_product_details: [ProductDetailsFixtures.product_details_relations_1]
        };
        for(let tableName of Object.keys(fixturesByTable)){
            await TestHelpers.insertFixturesViaRawSQL(
                this.referenceDataServer,
                tableName,
                fixturesByTable[tableName]
            );
        }
    }

    clearIdentityMaps()
    {
        for(let driverEntry of this.drivers){
            if(!driverEntry.dataServer.orm){
                continue;
            }
            if(!driverEntry.dataServer.orm.em){
                continue;
            }
            driverEntry.dataServer.orm.em.clear();
        }
    }

    async collectFailures(entityName, methodLabel, driverCall, resetFixtures)
    {
        let referenceProjection = null;
        let failures = [];
        for(let driverEntry of this.drivers){
            if(resetFixtures){
                await this.insertSharedFixtures();
            }
            this.clearIdentityMaps();
            let projection = EntityProjection.project(await driverCall(driverEntry.repos[entityName]));
            if(driverEntry.driverName === this.referenceDriverName){
                referenceProjection = projection;
                continue;
            }
            let differences = ProjectionDifference.collect(referenceProjection, projection, this.volatileKeys);
            failures.push(...ProjectionDifference.describe(
                driverEntry.driverName,
                this.referenceDriverName,
                entityName,
                methodLabel,
                differences
            ));
        }
        return failures;
    }

    async assertEquivalent(entityName, methodLabel, driverCall, resetFixtures)
    {
        let testName = methodLabel+' on '+entityName+' returns an equivalent result on every driver';
        await this.runner.test(testName, async () => {
            let failures = await this.collectFailures(entityName, methodLabel, driverCall, resetFixtures);
            assert.strictEqual(failures.length, 0, this.buildReport(failures));
        });
    }

    buildReport(failures)
    {
        if(0 === failures.length){
            return '';
        }
        return failures.length+' difference(s) against the reference driver '+this.referenceDriverName
            +':\n      '+failures.join('\n      ');
    }

    async runCases(cases, resetFixtures)
    {
        for(let testCase of cases){
            await this.assertEquivalent(testCase.entity, testCase.label, testCase.call, resetFixtures);
        }
    }

    async testPlainReads()
    {
        this.runner.group('Plain reads');
        await this.runCases([
            {entity: 'testCategories', label: 'loadById', call: (repo) => repo.loadById(this.categoryId)},
            {entity: 'testCategories', label: 'loadBy', call: (repo) => repo.loadBy('is_active', 1)},
            {entity: 'testCategories', label: 'loadAll', call: (repo) => repo.loadAll()},
            {entity: 'testProducts', label: 'loadById', call: (repo) => repo.loadById(this.productId)},
            {entity: 'testProducts', label: 'loadAll', call: (repo) => repo.loadAll()},
            {entity: 'testReviews', label: 'loadAll', call: (repo) => repo.loadAll()},
            {
                entity: 'testCategories',
                label: 'loadOneBy',
                call: (repo) => repo.loadOneBy('slug', this.categorySlug)
            },
            {
                entity: 'testProductDetails',
                label: 'loadById',
                call: (repo) => repo.loadById(this.productDetailsId)
            }
        ], false);
    }

    async testRelationReads()
    {
        this.runner.group('Relation reads');
        await this.runCases([
            {
                entity: 'testCategories',
                label: 'loadByIdWithRelations one level hint',
                call: (repo) => repo.loadByIdWithRelations(this.categoryId, this.productsHint)
            },
            {
                entity: 'testCategories',
                label: 'loadOneByWithRelations one level hint',
                call: (repo) => repo.loadOneByWithRelations('slug', this.categorySlug, this.productsHint)
            },
            {
                entity: 'testCategories',
                label: 'loadAllWithRelations one level hint',
                call: (repo) => repo.loadAllWithRelations(this.productsHint)
            },
            {
                entity: 'testCategories',
                label: 'loadWithRelations two levels hint',
                call: (repo) => repo.loadWithRelations({id: this.categoryId}, this.productsReviewsHint)
            },
            {
                entity: 'testProductDetails',
                label: 'loadByIdWithRelations two levels hint',
                call: (repo) => repo.loadByIdWithRelations(this.productDetailsId, this.productsCategoriesHint)
            },
            {
                entity: 'testProducts',
                label: 'loadWithRelations comma separated string hint',
                call: (repo) => repo.loadWithRelations({id: this.productId}, this.commaSeparatedHint)
            },
            {
                entity: 'testProducts',
                label: 'loadAllWithRelations comma separated string hint',
                call: (repo) => repo.loadAllWithRelations(this.commaSeparatedHint)
            }
        ], false);
    }

    async testCounts()
    {
        this.runner.group('Counts');
        await this.runCases([
            {entity: 'testCategories', label: 'count empty filters', call: (repo) => repo.count({})},
            {entity: 'testCategories', label: 'count filtered', call: (repo) => repo.count({is_active: 1})},
            {
                entity: 'testCategories',
                label: 'countWithRelations one level hint',
                call: (repo) => repo.countWithRelations({}, this.productsHint)
            },
            {
                entity: 'testProducts',
                label: 'countWithRelations one level hint',
                call: (repo) => repo.countWithRelations({}, this.categoriesHint)
            }
        ], false);
    }

    async testWrites()
    {
        this.runner.group('Writes');
        await this.runCases([
            {
                entity: 'testCategories',
                label: 'create',
                call: (repo) => repo.create({...CategoriesFixtures.category_cross_driver_create})
            },
            {
                entity: 'testCategories',
                label: 'updateById',
                call: (repo) => repo.updateById(this.categoryId, {...this.updatePatch})
            },
            {
                entity: 'testCategories',
                label: 'delete',
                call: (repo) => repo.delete({id: this.secondCategoryId})
            },
            {
                entity: 'testCategories',
                label: 'deleteById',
                call: (repo) => repo.deleteById(this.secondCategoryId)
            }
        ], true);
    }

}

module.exports.CrossDriverEquivalenceTest = CrossDriverEquivalenceTest;
