/**
 *
 * Reldens - TestProductsEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');
const { sc } = require('@reldens/utils');

class TestProductsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'name';
        let properties = {
            id: {
                isId: true,
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            category_id: {
                type: 'reference',
                reference: 'test_categories',
                isRequired: true,
                dbType: 'int'
            },
            [titleProperty]: {
                isRequired: true,
                dbType: 'varchar'
            },
            sku: {
                isRequired: true,
                dbType: 'varchar'
            },
            description: {
                type: 'textarea',
                dbType: 'text'
            },
            price: {
                type: 'number',
                isRequired: true,
                dbType: 'decimal'
            },
            stock_quantity: {
                type: 'number',
                dbType: 'int'
            },
            is_featured: {
                type: 'boolean',
                dbType: 'tinyint'
            },
            metadata: {
                type: 'textarea',
                dbType: 'json'
            },
            tags: {
                dbType: 'varchar'
            },
            status: {
                availableValues: [
                    {value: 1, label: 'draft'},
                    {value: 2, label: 'published'},
                    {value: 3, label: 'archived'}
                ],
                dbType: 'enum'
            },
            created_at: {
                type: 'datetime',
                dbType: 'timestamp'
            },
            updated_at: {
                type: 'datetime',
                dbType: 'timestamp'
            }
        };
        let propertiesKeys = Object.keys(properties);
        let showProperties = propertiesKeys;
        let editProperties = sc.removeFromArray([...propertiesKeys], ['id', 'created_at', 'updated_at']);
        let listProperties = sc.removeFromArray([...propertiesKeys], ['description', 'metadata']);
        return {
            showProperties,
            editProperties,
            listProperties,
            filterProperties: listProperties,
            properties,
            titleProperty,
            ...extraProps
        };
    }

}

module.exports.TestProductsEntity = TestProductsEntity;
