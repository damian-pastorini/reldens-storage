/**
 *
 * Reldens - TestProductDetailsEntity
 *
 */

const { EntityProperties } = require('../../index');
const { sc } = require('@reldens/utils');

class TestProductDetailsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {
                isId: true,
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            product_id: {
                type: 'reference',
                reference: 'test_products',
                alias: 'related_test_products',
                onDelete: 'cascade',
                isRequired: true,
                isUnique: true,
                dbType: 'int'
            },
            weight: {
                type: 'number',
                dbType: 'decimal'
            },
            dimensions: {
                dbType: 'varchar'
            },
            customData: {
                type: 'textarea',
                dbType: 'text'
            },
            useTimeOut: {
                type: 'number',
                dbType: 'int'
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
        let listProperties = [...propertiesKeys];
        listProperties.splice(listProperties.indexOf('customData'), 1);
        return {
            showProperties,
            editProperties,
            listProperties,
            filterProperties: listProperties,
            properties,
            ...extraProps
        };
    }

}

module.exports.TestProductDetailsEntity = TestProductDetailsEntity;
