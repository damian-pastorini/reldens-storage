/**
 *
 * Reldens - Entities Translations
 *
 */

module.exports.entitiesTranslations = {
    labels: {
        'test_categories': 'Test Categories',
        'test_product_details': 'Test Product Details',
        'test_products': 'Test Products',
        'test_reviews': 'Test Reviews'
    },
    fields: {
        'test_categories': {
            'id': 'ID',
            'name': 'Name',
            'slug': 'Slug',
            'description': 'Description',
            'is_active': 'Is Active',
            'display_order': 'Display Order',
            'created_at': 'Created At',
            'updated_at': 'Updated At'
        },
        'test_product_details': {
            'id': 'ID',
            'product_id': 'Product ID',
            'weight': 'Weight',
            'dimensions': 'Dimensions',
            'created_at': 'Created At',
            'updated_at': 'Updated At'
        },
        'test_products': {
            'id': 'ID',
            'category_id': 'Category ID',
            'name': 'Name',
            'sku': 'Sku',
            'description': 'Description',
            'price': 'Price',
            'stock_quantity': 'Stock Quantity',
            'is_featured': 'Is Featured',
            'metadata': 'Metadata',
            'tags': 'Tags',
            'status': 'Status',
            'created_at': 'Created At',
            'updated_at': 'Updated At'
        },
        'test_reviews': {
            'id': 'ID',
            'product_id': 'Product ID',
            'reviewer_name': 'Reviewer Name',
            'reviewer_email': 'Reviewer Email',
            'rating': 'Rating',
            'title': 'Title',
            'comment': 'Comment',
            'is_verified': 'Is Verified',
            'helpful_count': 'Helpful Count',
            'created_at': 'Created At',
            'updated_at': 'Updated At'
        }
    }
};
