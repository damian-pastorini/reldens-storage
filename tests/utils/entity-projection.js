/**
 *
 * Reldens - Entity Projection
 * Turns any driver result (plain row, ORM managed entity, ORM collection) into a normalised plain object
 * projection: own enumerable keys sorted, dates as tagged strings, collections as arrays, nested entities
 * projected recursively. Two projections built from the same database rows must be strictly equal on every
 * driver, so any divergence found between them is a driver contract divergence.
 *
 */

const { sc } = require('@reldens/utils');

class EntityProjection
{

    static maxDepth = 12;
    static functionLabel = 'function';
    static circularReferenceLabel = 'circular-reference';
    static maxDepthLabel = 'max-depth-reached';
    static uninitializedCollectionLabel = 'uninitialized-collection';

    static project(value, parentVisited = null, depth = 0)
    {
        let visited = null === parentVisited ? new Set() : parentVisited;
        if(null === value){
            return null;
        }
        if('undefined' === typeof value){
            return null;
        }
        if('function' === typeof value){
            return EntityProjection.functionLabel;
        }
        if('bigint' === typeof value){
            return 'bigint:'+String(value);
        }
        if('object' !== typeof value){
            return value;
        }
        if(value instanceof Date){
            return 'date:'+value.toISOString();
        }
        if(Buffer.isBuffer(value)){
            return 'buffer:'+value.length;
        }
        if(EntityProjection.maxDepth < depth){
            return EntityProjection.maxDepthLabel;
        }
        if(visited.has(value)){
            return EntityProjection.circularReferenceLabel;
        }
        return this.projectContainer(value, visited, depth);
    }

    static projectContainer(value, visited, depth)
    {
        visited.add(value);
        let projected = this.projectByShape(value, visited, depth);
        visited.delete(value);
        return projected;
    }

    static projectByShape(value, visited, depth)
    {
        if(sc.isArray(value)){
            return this.projectArray(value, visited, depth);
        }
        if(this.isCollection(value)){
            return this.projectCollection(value, visited, depth);
        }
        return this.projectObject(value, visited, depth);
    }

    static isCollection(value)
    {
        if(!sc.isFunction(value.getItems)){
            return false;
        }
        return sc.isFunction(value.isInitialized);
    }

    static projectCollection(value, visited, depth)
    {
        if(!value.isInitialized()){
            return EntityProjection.uninitializedCollectionLabel;
        }
        return this.projectArray(value.getItems(), visited, depth);
    }

    static projectArray(value, visited, depth)
    {
        let projected = [];
        for(let item of value){
            projected.push(this.project(item, visited, depth + 1));
        }
        return projected;
    }

    static projectObject(value, visited, depth)
    {
        let projected = {};
        let keys = Object.keys(value).sort();
        for(let key of keys){
            projected[key] = this.project(value[key], visited, depth + 1);
        }
        return projected;
    }

}

module.exports.EntityProjection = EntityProjection;
