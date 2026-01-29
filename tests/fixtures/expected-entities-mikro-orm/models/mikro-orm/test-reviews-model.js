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
    properties: {
        id: { type: 'number', primary: true },
        product_id: { type: 'number' },
        reviewer_name: { type: 'string' },
        reviewer_email: { type: 'string' },
        rating: { type: 'number' },
        title: { type: 'string', nullable: true },
        comment: { type: 'string', nullable: true },
        is_verified: { type: 'number' },
        helpful_count: { type: 'number' },
        created_at: { type: 'Date' },
        updated_at: { type: 'Date' }
    },
});

module.exports = {
    TestReviewsModel,
    entity: TestReviewsModel,
    schema: schema
};
