/**
 *
 * Reldens - TestCategoriesModel
 *
 */

const { MikroOrmCore } = require('../../../index');
const { EntitySchema } = MikroOrmCore;

class TestCategoriesModel
{

    constructor(id, name, slug, description, is_active, display_order, created_at, updated_at)
    {
        this.id = id;
        this.name = name;
        this.slug = slug;
        this.description = description;
        this.is_active = is_active;
        this.display_order = display_order;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }

    static createByProps(props)
    {
        const {id, name, slug, description, is_active, display_order, created_at, updated_at} = props;
        return new this(id, name, slug, description, is_active, display_order, created_at, updated_at);
    }
    
}

const schema = new EntitySchema({
    class: TestCategoriesModel,
    tableName: 'test_categories',
    properties: {
        id: { type: 'int', primary: true },
        name: { type: 'varchar' },
        slug: { type: 'varchar' },
        description: { type: 'text', nullable: true },
        is_active: { type: 'tinyint', nullable: true },
        display_order: { type: 'int', nullable: true },
        created_at: { type: 'timestamp', nullable: true },
        updated_at: { type: 'timestamp', nullable: true },
        related_test_product_details: {
            kind: '1:m',
            entity: () => require('./test-product-details-model').TestProductDetailsModel,
            mappedBy: 'related_test_categories'
        },
        related_test_products: {
            kind: '1:m',
            entity: () => require('./test-products-model').TestProductsModel,
            mappedBy: 'related_test_categories'
        }
    },
});

module.exports = {
    TestCategoriesModel,
    entity: TestCategoriesModel,
    schema: schema
};
