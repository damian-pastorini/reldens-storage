/**
 *
 * Reldens - PrismaQueryBuilder
 *
 */

const { sc } = require('@reldens/utils');

class PrismaQueryBuilder
{

    buildQueryOptions(options, useLimit = true)
    {
        let select = sc.get(options, 'select', []);
        let limit = sc.get(options, 'limit', 0);
        let offset = sc.get(options, 'offset', 0);
        let sortBy = sc.get(options, 'sortBy', false);
        let sortDirection = sc.get(options, 'sortDirection', 'ASC');
        let queryOptions = {};
        if(0 < select.length){
            queryOptions.select = {};
            for(let field of select){
                queryOptions.select[field] = true;
            }
        }
        if(useLimit && 0 !== limit){
            queryOptions.take = limit;
        }
        if(0 !== offset){
            queryOptions.skip = offset;
        }
        if(false !== sortBy && false !== sortDirection){
            queryOptions.orderBy = {
                [sortBy]: sortDirection.toLowerCase()
            };
        }
        return queryOptions;
    }

}

module.exports.PrismaQueryBuilder = PrismaQueryBuilder;
