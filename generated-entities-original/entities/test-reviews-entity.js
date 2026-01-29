/**
 *
 * Reldens - TestReviewsEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');
const { sc } = require('@reldens/utils');

class TestReviewsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'title';
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
                isRequired: true,
                dbType: 'int'
            },
            reviewer_name: {
                isRequired: true,
                dbType: 'varchar'
            },
            reviewer_email: {
                isRequired: true,
                dbType: 'varchar'
            },
            rating: {
                type: 'boolean',
                isRequired: true,
                dbType: 'tinyint'
            },
            [titleProperty]: {
                dbType: 'varchar'
            },
            comment: {
                type: 'textarea',
                dbType: 'text'
            },
            is_verified: {
                type: 'boolean',
                dbType: 'tinyint'
            },
            helpful_count: {
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
        listProperties.splice(listProperties.indexOf('comment'), 1);
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

module.exports.TestReviewsEntity = TestReviewsEntity;
