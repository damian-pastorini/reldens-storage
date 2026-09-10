/**
 *
 * Reldens - Relations Shape Support
 * Reusable fixtures setup and relation/foreign-key assertions for the child -> parent -> grandparent chain
 * (test_reviews -> test_products -> test_categories), both links being NOT NULL m:1 foreign keys.
 * Every assertion reports the observed value so a failure states what the driver actually returned.
 *
 */

const { TestHelpers } = require('./test-helpers');
const { ObservedValue } = require('./observed-value');
const { assert } = require('./test-runner');
const { CategoriesFixtures } = require('../fixtures/categories-fixtures');
const { ProductsFixtures } = require('../fixtures/products-fixtures');
const { ReviewsFixtures } = require('../fixtures/reviews-fixtures');

class RelationsShapeSupport
{

    constructor(dataServer, repos)
    {
        this.dataServer = dataServer;
        this.repos = {
            child: repos.testReviews,
            parent: repos.testProducts,
            grandParent: repos.testCategories
        };
    }

    async insertChainFixtures()
    {
        await TestHelpers.cleanDatabase(this.dataServer);
        let fixturesByTable = {
            test_categories: [CategoriesFixtures.category_relations_1, CategoriesFixtures.category_relations_2],
            test_products: [ProductsFixtures.product_relations_1, ProductsFixtures.product_relations_2],
            test_reviews: [ReviewsFixtures.review_relations_1, ReviewsFixtures.review_relations_2]
        };
        for(let tableName of Object.keys(fixturesByTable)){
            await TestHelpers.insertFixturesViaRawSQL(this.dataServer, tableName, fixturesByTable[tableName]);
        }
        return true;
    }

    cleared(repoKey)
    {
        if(this.dataServer.orm && this.dataServer.orm.em){
            this.dataServer.orm.em.clear();
        }
        return this.repos[repoKey];
    }

    async loadChildWithHint(relationsHint)
    {
        return await this.cleared('child').loadOneByWithRelations(
            'product_id',
            ProductsFixtures.product_relations_1.id,
            relationsHint
        );
    }

    assertEntityColumns(entityValue, expectedColumns, label)
    {
        let described = ObservedValue.log(label, entityValue);
        assert.ok(entityValue, label+' is falsy, the relation was not populated, observed: '+described);
        assert.notStrictEqual('number', typeof entityValue, label+' is a RAW NUMBER, observed: '+described);
        assert.strictEqual('object', typeof entityValue, label+' is not an entity, observed: '+described);
        for(let columnName of Object.keys(expectedColumns)){
            assert.strictEqual(
                entityValue[columnName],
                expectedColumns[columnName],
                label+'.'+columnName+' observed: '+ObservedValue.describe(entityValue[columnName])
                +' - expected: '+String(expectedColumns[columnName])
            );
        }
        return true;
    }

    assertNumericColumn(actualValue, expectedValue, label)
    {
        let described = ObservedValue.log(label, actualValue);
        assert.ok(null !== actualValue, label+' is null, observed: '+described);
        assert.strictEqual(Number(actualValue), expectedValue, label+' observed: '+described);
        return true;
    }

    async assertStoredColumn(repoKey, id, columnName, expectedValue, label)
    {
        let record = await this.cleared(repoKey).loadOneBy('id', id);
        assert.ok(record, label+' row was not found in the database, id: '+id);
        this.assertNumericColumn(record[columnName], expectedValue, label+'.'+columnName+' re-read from database');
        let filtered = await this.cleared(repoKey).loadBy(columnName, expectedValue);
        let filteredIds = filtered.map((row) => Number(row.id));
        ObservedValue.log(label+' ids where '+columnName+' = '+expectedValue, filteredIds);
        assert.ok(
            filteredIds.includes(Number(id)),
            label+' id '+id+' was not returned when filtering by '+columnName+' = '+expectedValue
            +', so that column value is not stored in the database; observed ids: '+filteredIds.join(',')
        );
        return true;
    }

}

module.exports.RelationsShapeSupport = RelationsShapeSupport;
