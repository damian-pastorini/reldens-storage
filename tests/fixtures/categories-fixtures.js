/**
 *
 * Reldens - Test Categories Fixtures
 *
 */

const baseCategories = {
    category1: {
        name: 'Electronics',
        description: 'Electronic devices and gadgets',
        is_active: 1,
        display_order: 1
    },
    category2: {
        name: 'Books',
        description: 'Books and publications',
        is_active: 1,
        display_order: 2
    },
    category3: {
        name: 'Clothing',
        description: 'Apparel and accessories',
        is_active: 0,
        display_order: 3
    }
};

module.exports.CategoriesFixtures = {
    'objection-js': {
        category1: {...baseCategories.category1, id: 1001, slug: 'electronics'},
        category2: {...baseCategories.category2, id: 1002, slug: 'books'},
        category3: {...baseCategories.category3, id: 1003, slug: 'clothing'}
    },
    'mikro-orm': {
        category1: {...baseCategories.category1, id: 2001, slug: 'electronics-mikro'},
        category2: {...baseCategories.category2, id: 2002, slug: 'books-mikro'},
        category3: {...baseCategories.category3, id: 2003, slug: 'clothing-mikro'}
    },
    prisma: {
        category1: {...baseCategories.category1, id: 3001, slug: 'electronics-prisma'},
        category2: {...baseCategories.category2, id: 3002, slug: 'books-prisma'},
        category3: {...baseCategories.category3, id: 3003, slug: 'clothing-prisma'}
    }
};
