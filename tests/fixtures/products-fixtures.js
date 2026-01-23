/**
 *
 * Reldens - Test Products Fixtures
 *
 */

const baseProducts = {
    product1: {
        name: 'Laptop Pro 15',
        description: 'High-performance laptop',
        price: 1299.99,
        stock_quantity: 50,
        is_featured: 1,
        metadata: JSON.stringify({warranty: '2 years', color: 'silver'}),
        tags: 'electronics,computers,featured',
        status: 'published'
    },
    product2: {
        name: 'Wireless Mouse',
        description: 'Ergonomic wireless mouse',
        price: 29.99,
        stock_quantity: 150,
        is_featured: 0,
        metadata: JSON.stringify({battery: 'AA', range: '10m'}),
        tags: 'electronics,accessories',
        status: 'published'
    }
};

module.exports.ProductsFixtures = {
    'objection-js': {
        product1: {...baseProducts.product1, id: 1001, category_id: 1001, sku: 'LAPTOP-PRO-15'},
        product2: {...baseProducts.product2, id: 1002, category_id: 1001, sku: 'MOUSE-WIRELESS'}
    },
    'mikro-orm': {
        product1: {...baseProducts.product1, id: 2001, category_id: 2001, sku: 'LAPTOP-PRO-15-MIKRO'},
        product2: {...baseProducts.product2, id: 2002, category_id: 2001, sku: 'MOUSE-WIRELESS-MIKRO'}
    },
    prisma: {
        product1: {...baseProducts.product1, id: 3001, category_id: 3001, sku: 'LAPTOP-PRO-15-PRISMA'},
        product2: {...baseProducts.product2, id: 3002, category_id: 3001, sku: 'MOUSE-WIRELESS-PRISMA'}
    }
};
