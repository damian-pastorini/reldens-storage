/**
 *
 * Reldens - TestCategoriesModel
 *
 */

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

    static get tableName()
    {
        return 'test_categories';
    }
    

    static get relationTypes()
    {
        return {
            test_products: 'many'
        };
    }

    static get relationMappings()
    {
        return {
            'related_test_products': 'test_products'
        };
    }
}

module.exports.TestCategoriesModel = TestCategoriesModel;
