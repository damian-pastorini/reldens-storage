/**
 *
 * Reldens - TestCategoriesEntity
 *
 */

const { EntityProperties } = require('../../index');
const { sc } = require('@reldens/utils');

class TestCategoriesEntity extends EntityProperties
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
            [titleProperty]: {
                isRequired: true,
                dbType: 'varchar'
            },
            slug: {
                isRequired: true,
                dbType: 'varchar'
            },
            description: {
                type: 'textarea',
                dbType: 'text'
            },
            is_active: {
                type: 'boolean',
                dbType: 'tinyint'
            },
            display_order: {
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
        listProperties.splice(listProperties.indexOf('description'), 1);
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

module.exports.TestCategoriesEntity = TestCategoriesEntity;
