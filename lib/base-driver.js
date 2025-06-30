/**
 *
 * Reldens - BaseDriver
 *
 */

const { ErrorManager, Logger, sc } = require('@reldens/utils');

class BaseDriver
{

    constructor(props)
    {
        this.config = sc.get(props, 'config', false);
        this.rawModel = sc.get(props, 'rawModel', false);
        this.rawId = sc.get(props, 'id', false);
        this.rawName = sc.get(props, 'name', false);
        this.select = sc.get(props, 'select', []);
        this.limit = sc.get(props, 'limit', 0);
        this.offset = sc.get(props, 'offset', 0);
        this.sortBy = sc.get(props, 'sortBy', false);
        this.sortDirection = sc.get(props, 'sortDirection', 'ASC');
        this.entityConfig = sc.get(props, 'entityConfig', {});
    }

    databaseName()
    {
        ErrorManager.error('BaseDriver databaseName() not implemented.');
    }

    id()
    {
        ErrorManager.error('BaseDriver id() not implemented.');
    }

    name()
    {
        ErrorManager.error('BaseDriver name() not implemented.');
    }

    tableName()
    {
        ErrorManager.error('BaseDriver tableName() not implemented.');
    }

    property(propertyName)
    {
        ErrorManager.error('BaseDriver property() not implemented.');
    }

    create(params)
    {
        ErrorManager.error('BaseDriver create() not implemented.');
    }

    createWithRelations(params, relations)
    {
        ErrorManager.error('BaseDriver create() not implemented.');
    }

    update(filters, updatePatch)
    {
        ErrorManager.error('BaseDriver update() not implemented.');
    }

    updateBy(field, fieldValue, updatePatch, operator = null)
    {
        ErrorManager.error('BaseDriver updateBy() not implemented.');
    }

    updateById(id, params)
    {
        ErrorManager.error('BaseDriver updateById() not implemented.');
    }

    upsert(params, filters)
    {
        ErrorManager.error('BaseDriver upsert() not implemented.');
    }

    delete(filters)
    {
        ErrorManager.error('BaseDriver delete() not implemented.');
    }

    deleteById(id)
    {
        ErrorManager.error('BaseDriver deleteById() not implemented.');
    }

    count(filters)
    {
        ErrorManager.error('BaseDriver count() not implemented.');
    }

    countWithRelations(filters, relations)
    {
        ErrorManager.error('BaseDriver countWithRelations() not implemented.');
    }

    loadAll()
    {
        ErrorManager.error('BaseDriver loadAll() not implemented.');
    }

    loadAllWithRelations(relations)
    {
        ErrorManager.error('BaseDriver loadAllWithRelations() not implemented.');
    }

    load(filters)
    {
        ErrorManager.error('BaseDriver load() not implemented.');
    }

    loadWithRelations(filters, relations)
    {
        ErrorManager.error('BaseDriver loadWithRelations() not implemented.');
    }

    loadBy(field, fieldValue, operator = null)
    {
        ErrorManager.error('BaseDriver loadBy() not implemented.');
    }

    loadByWithRelations(field, fieldValue, relations, operator = null)
    {
        ErrorManager.error('BaseDriver loadByWithRelations() not implemented.');
    }

    loadById(id)
    {
        ErrorManager.error('BaseDriver loadById() not implemented.');
    }

    loadByIdWithRelations(id, relations)
    {
        ErrorManager.error('BaseDriver loadByIdWithRelations() not implemented.');
    }

    loadByIds(ids)
    {
        ErrorManager.error('BaseDriver loadByIds() not implemented.');
    }

    loadOne(filters)
    {
        ErrorManager.error('BaseDriver load() not implemented.');
    }

    loadOneWithRelations(filters, relations)
    {
        ErrorManager.error('BaseDriver loadWithRelations() not implemented.');
    }

    loadOneBy(field, fieldValue, operator = null)
    {
        ErrorManager.error('BaseDriver loadBy() not implemented.');
    }

    loadOneByWithRelations(field, fieldValue, relations, operator = null)
    {
        ErrorManager.error('BaseDriver loadByWithRelations() not implemented.');
    }

    executeCustomQuery(methodName, methodOptions)
    {
        if('function' !== typeof this.rawModel[methodName]){
            Logger.error('Custom query method not found in raw model.', methodName, this.rawModel);
            return false;
        }
        return this.rawModel[methodName](methodOptions, this);
    }

    async rawQuery(content)
    {
        ErrorManager.error('BaseDriver rawQuery() not implemented.');
    }

    isJsonField(fieldName)
    {
        if(!this.entityConfig || !this.rawName){
            return false;
        }
        let properties = sc.get(this.entityConfig, 'properties', {});
        let fieldConfig = sc.get(properties, fieldName, {});
        let fieldType = sc.get(fieldConfig, 'type', '');
        return 'json' === fieldType.toLowerCase();
    }

    parseRelationsString(relationsString)
    {
        if(!relationsString || '' === relationsString.trim()){
            return [];
        }
        return relationsString.split(',').map(relation => relation.trim()).filter(relation => '' !== relation);
    }

    applyQueryOptions(queryOptions)
    {
        if(sc.hasOwn(queryOptions, 'limit')){
            this.limit = queryOptions.limit;
        }
        if(sc.hasOwn(queryOptions, 'offset')){
            this.offset = queryOptions.offset;
        }
        if(sc.hasOwn(queryOptions, 'sortBy')){
            this.sortBy = queryOptions.sortBy;
        }
        if(sc.hasOwn(queryOptions, 'sortDirection')){
            this.sortDirection = queryOptions.sortDirection;
        }
    }

    preserveEntityState()
    {
        return {
            limit: this.limit,
            offset: this.offset,
            sortBy: this.sortBy,
            sortDirection: this.sortDirection
        };
    }

    restoreEntityState(originalState)
    {
        this.limit = originalState.limit;
        this.offset = originalState.offset;
        this.sortBy = originalState.sortBy;
        this.sortDirection = originalState.sortDirection;
    }

    async loadEntityData(filters, queryOptions, relationsString)
    {
        this.applyQueryOptions(queryOptions);
        let relations = this.parseRelationsString(relationsString);
        return 0 < relations.length
            ? await this.loadWithRelations(filters, relations)
            : 0 < Object.keys(filters).length ? await this.load(filters) : await this.loadAll();
    }

}

module.exports.BaseDriver = BaseDriver;
