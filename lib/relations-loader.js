/**
 *
 * Reldens - RelationsLoader
 *
 */

const { Logger, sc } = require('@reldens/utils');

class RelationsLoader
{

    constructor(props)
    {
        this.driver = sc.get(props, 'driver', false);
        this.server = sc.get(props, 'server', false);
        this.relationMappings = sc.get(this.driver.rawModel, 'relationMappings', {});
    }

    normalizeRelations(relations)
    {
        if(sc.isString(relations)){
            relations = this.driver.parseRelationsString(relations);
        }
        if(!sc.isArray(relations)){
            return Object.keys(this.relationMappings);
        }
        if(0 === relations.length){
            return Object.keys(this.relationMappings);
        }
        return relations;
    }

    relatedDriver(mapping)
    {
        if(!this.server){
            Logger.error('Missing server on relations loader for table: '+mapping.tableName);
            return false;
        }
        let entities = this.server.entityManager.entities;
        for(let entityKey of Object.keys(entities)){
            if(entities[entityKey].tableName() === mapping.tableName){
                return entities[entityKey];
            }
        }
        Logger.error('Related entity not found for table: '+mapping.tableName);
        return false;
    }

    async populate(result, relations)
    {
        if(!result){
            return result;
        }
        let rows = sc.isArray(result) ? result : [result];
        if(0 === rows.length){
            return result;
        }
        for(let relationPath of this.normalizeRelations(relations)){
            await this.populateRelation(rows, relationPath);
        }
        return result;
    }

    async populateRelation(rows, relationPath)
    {
        let pathParts = relationPath.split('.');
        let relationKey = pathParts.shift();
        let mapping = sc.get(this.relationMappings, relationKey, false);
        if(!mapping){
            Logger.warning('Unknown relation "'+relationKey+'" on table "'+this.driver.tableName()+'".');
            return false;
        }
        let relatedDriver = this.relatedDriver(mapping);
        if(!relatedDriver){
            return false;
        }
        let relatedRows = await this.fetchRelatedRows(rows, mapping, relatedDriver);
        this.assignRelatedRows(rows, relatedRows, mapping, relationKey);
        if(0 === pathParts.length){
            return true;
        }
        if(0 === relatedRows.length){
            return true;
        }
        await relatedDriver.relationsLoader.populate(relatedRows, [pathParts.join('.')]);
        return true;
    }

    async fetchRelatedRows(rows, mapping, relatedDriver)
    {
        let values = [...new Set(
            rows.map(row => row[mapping.from]).filter(value => sc.isNumber(value) || sc.isString(value))
        )];
        if(0 === values.length){
            return [];
        }
        return await relatedDriver.selectRows(
            {[mapping.to]: {operator: 'IN', value: values}},
            Object.assign(relatedDriver.selectOptions(false), {offset: 0})
        );
    }

    assignRelatedRows(rows, relatedRows, mapping, relationKey)
    {
        let isMany = 'HasManyRelation' === mapping.relation;
        for(let row of rows){
            let matches = relatedRows.filter(relatedRow => relatedRow[mapping.to] === row[mapping.from]);
            if(isMany){
                row[relationKey] = matches;
                continue;
            }
            row[relationKey] = matches.shift() || null;
        }
    }

    extractNestedRelations(params, relations)
    {
        let nested = {};
        for(let relationKey of this.normalizeRelations(relations)){
            if(!sc.hasOwn(this.relationMappings, relationKey)){
                continue;
            }
            if(!sc.hasOwn(params, relationKey)){
                continue;
            }
            nested[relationKey] = params[relationKey];
        }
        return nested;
    }

    async createWithRelations(params, relations)
    {
        let nested = this.extractNestedRelations(params, relations);
        let nestedKeys = Object.keys(nested);
        if(0 === nestedKeys.length){
            return await this.driver.create(params);
        }
        let data = sc.omitProps(params, nestedKeys);
        await this.createParents(data, nested);
        let created = await this.driver.create(data);
        if(!created){
            return false;
        }
        await this.createChildren(created, nested);
        return await this.populate(created, nestedKeys);
    }

    async createParents(data, nested)
    {
        for(let relationKey of Object.keys(nested)){
            let mapping = sc.get(this.relationMappings, relationKey, false);
            if('BelongsToOneRelation' !== mapping.relation){
                continue;
            }
            let relatedDriver = this.relatedDriver(mapping);
            if(!relatedDriver){
                continue;
            }
            let parent = await relatedDriver.create(nested[relationKey]);
            if(!parent){
                continue;
            }
            data[mapping.from] = parent[mapping.to];
        }
    }

    async createChildren(created, nested)
    {
        for(let relationKey of Object.keys(nested)){
            let mapping = sc.get(this.relationMappings, relationKey, false);
            if('BelongsToOneRelation' === mapping.relation){
                continue;
            }
            let relatedDriver = this.relatedDriver(mapping);
            if(!relatedDriver){
                continue;
            }
            await this.createChildRows(created, nested[relationKey], mapping, relatedDriver);
        }
    }

    async createChildRows(created, children, mapping, relatedDriver)
    {
        let childRows = sc.isArray(children) ? children : [children];
        for(let childRow of childRows){
            await relatedDriver.create(Object.assign({}, childRow, {[mapping.to]: created[mapping.from]}));
        }
    }

}

module.exports.RelationsLoader = RelationsLoader;
