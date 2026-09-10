/**
 *
 * Reldens - TestReviewsModel
 *
 */

const { MikroOrmCore } = require('../../../index');
const { EntitySchema } = MikroOrmCore;

class TestReviewsModel
{

    constructor(id, product_id, reviewer_name, reviewer_email, rating, title, comment, is_verified, helpful_count, created_at, updated_at)
    {
        this.id = id;
        this.product_id = product_id;
        this.reviewer_name = reviewer_name;
        this.reviewer_email = reviewer_email;
        this.rating = rating;
        this.title = title;
        this.comment = comment;
        this.is_verified = is_verified;
        this.helpful_count = helpful_count;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }

    static createByProps(props)
    {
        const {id, product_id, reviewer_name, reviewer_email, rating, title, comment, is_verified, helpful_count, created_at, updated_at} = props;
        return new this(id, product_id, reviewer_name, reviewer_email, rating, title, comment, is_verified, helpful_count, created_at, updated_at);
    }
    
}

const schema = new EntitySchema({
    class: TestReviewsModel,
    tableName: 'test_reviews',
    properties: {
        id: { type: 'int', primary: true },
        product_id: { type: 'int' },
        reviewer_name: { type: 'varchar' },
        reviewer_email: { type: 'varchar' },
        rating: { type: 'tinyint' },
        title: { type: 'varchar', nullable: true },
        comment: { type: 'text', nullable: true },
        is_verified: { type: 'tinyint', nullable: true },
        helpful_count: { type: 'int', nullable: true },
        created_at: { type: 'timestamp', nullable: true },
        updated_at: { type: 'timestamp', nullable: true },
        related_test_products: {
            kind: 'm:1',
            entity: () => require('./test-products-model').TestProductsModel,
            joinColumns: ['product_id'],
            persist: false
        }
    },
});
schema._fkMappings = {
    "product_id": {
        "relationKey": "related_test_products",
        "entityName": "TestProductsModel",
        "referencedColumn": "id",
        "nullable": false
    }
};
module.exports = {
    TestReviewsModel,
    entity: TestReviewsModel,
    schema: schema
};
