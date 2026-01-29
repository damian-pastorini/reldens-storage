/**
 *
 * Reldens - TestReviewsModel
 *
 */

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

    static get tableName()
    {
        return 'test_reviews';
    }
    

    static get relationTypes()
    {
        return {
            test_products: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_test_products': 'test_products'
        };
    }
}

module.exports.TestReviewsModel = TestReviewsModel;
