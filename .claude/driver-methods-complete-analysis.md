# Driver Methods Complete Analysis

**Date:** 2026-01-28
**Purpose:** Complete understanding of driver abstraction layer and ALL public methods across the 3 drivers

---

## 1. FUNDAMENTAL PURPOSE: The Abstraction Layer

### What Problem Does This Solve?

**The @reldens/storage package provides a UNIFIED API across three different ORM libraries:**
- ObjectionJS (built on Knex.js)
- MikroORM
- Prisma

### The Core Concept

**Write once, run anywhere:**
```javascript
// Application code - SAME for all drivers
let category = await categoriesRepo.create({name: 'Electronics', slug: 'electronics'});
let products = await productsRepo.loadWithRelations({category_id: category.id}, ['related_reviews']);
let count = await categoriesRepo.count({is_active: 1});
```

**No matter which driver is configured (objection-js, mikro-orm, or prisma), the code above works identically.**

### Why This Matters

**Without abstraction:**
```javascript
// ObjectionJS
let category = await Category.query().insert({name: 'Electronics'});
let products = await Product.query().where('category_id', category.id).withGraphFetched('related_reviews');

// MikroORM
let category = await em.create(Category, {name: 'Electronics'});
await em.flush();
let products = await em.find(Product, {category_id: category.id}, {populate: ['related_reviews']});

// Prisma
let category = await prisma.category.create({data: {name: 'Electronics'}});
let products = await prisma.product.findMany({where: {category_id: category.id}, include: {related_reviews: true}});
```

**Each ORM has different:**
- Method names
- Parameter structures
- Query syntax
- Relation loading syntax
- Filter operators

**With abstraction:**
```javascript
// ONE codebase works with ALL ORMs
await repo.create(params);
await repo.loadWithRelations(filters, relations);
await repo.count(filters);
```

### The Contract

**Every driver MUST implement:**
1. **Same method signatures** - Same method names, same parameters
2. **Same behavior** - Same inputs produce same outputs
3. **Same return format** - Results structure is identical
4. **Driver-agnostic code** - Application code doesn't know/care which driver is used

**The BaseDriver class defines this contract** (lib/base-driver.js)

---

## 2. PUBLIC METHODS - The Complete API

All methods defined in BaseDriver that ALL drivers must implement:

### CREATE Operations
- `create(params)` - Create single record
- `createWithRelations(params, relations)` - Create record with nested relations

### READ Operations (No Relations)
- `loadAll()` - Load all records (no filters, respects limit/offset/sort)
- `load(filters)` - Load records by filters (respects limit/offset/sort)
- `loadBy(field, fieldValue, operator)` - Load records by single field
- `loadById(id)` - Load single record by ID
- `loadByIds(ids)` - Load multiple records by IDs array
- `loadOne(filters)` - Load first record matching filters
- `loadOneBy(field, fieldValue, operator)` - Load first record by single field

### READ Operations (With Relations)
- `loadAllWithRelations(relations)` - Load all records with relations
- `loadWithRelations(filters, relations)` - Load records by filters with relations
- `loadByWithRelations(field, fieldValue, relations, operator)` - Load by field with relations
- `loadByIdWithRelations(id, relations)` - Load by ID with relations
- `loadOneWithRelations(filters, relations)` - Load first record with relations
- `loadOneByWithRelations(field, fieldValue, relations, operator)` - Load first by field with relations

### UPDATE Operations
- `update(filters, updatePatch)` - Update records by filters
- `updateBy(field, fieldValue, updatePatch, operator)` - Update by single field
- `updateById(id, params)` - Update single record by ID
- `upsert(params, filters)` - Insert if not exists, update if exists

### DELETE Operations
- `delete(filters)` - Delete records by filters
- `deleteById(id)` - Delete single record by ID

### COUNT Operations
- `count(filters)` - Count records by filters
- `countWithRelations(filters, relations)` - Count records with relation filters

### UTILITY Operations
- `rawQuery(content)` - Execute raw SQL query
- `executeCustomQuery(methodName, methodOptions)` - Execute custom model method
- `isJsonField(fieldName)` - Check if field is JSON type
- `parseRelationsString(relationsString)` - Parse relation string to array

### PROPERTY Accessors
- `databaseName()` - Get database name
- `id()` - Get entity ID
- `name()` - Get entity name
- `tableName()` - Get table name
- `property(propertyName)` - Get model property

### CONFIGURATION Properties
- `this.limit` - Result limit (0 = no limit)
- `this.offset` - Result offset
- `this.sortBy` - Sort field name
- `this.sortDirection` - Sort direction ('ASC' or 'DESC')
- `this.select` - Fields to select (array)

---

## 3. METHOD-BY-METHOD ANALYSIS

### 3.1 create(params)

**Purpose:** Create a single record

**Parameters:**
- `params` (object) - Record data

**Expected Behavior:**
- Insert record into database
- Return created record with ID
- Throw error if constraints violated (UNIQUE, FK, NOT NULL)

**Return:** Created record object with all fields including auto-generated ID

#### ObjectionJS Implementation (objection-js-driver.js:38-41)

```javascript
create(params)
{
    return this.queryBuilder().insert(params);
}
```

**How it works:**
- Calls Objection's `insert()` method
- Passes params directly to Knex
- Returns promise that resolves to created record

**Behavior:**
- ✅ Accepts explicit IDs for autoincrement fields
- ✅ Returns created record with ID
- ✅ Throws on constraint violations

#### MikroORM Implementation (mikro-orm-driver.js:85-92)

```javascript
async create(params)
{
    let transformed = this.transformFkToRelations(params);
    let newInstance = await this.orm.em.create(this.rawModel, transformed);
    await this.orm.em.upsert(newInstance);
    await this.orm.em.flush();
    return newInstance;
}
```

**How it works:**
1. Transforms FK fields to relation objects via `transformFkToRelations()`
   - Converts `category_id: 1` to `related_categories: Reference<Category>(1)`
2. Creates entity instance via `em.create()`
3. Upserts to identity map via `em.upsert()`
4. Flushes to database via `em.flush()`
5. Returns entity instance

**transformFkToRelations() (lines 497-512):**
```javascript
transformFkToRelations(params)
{
    let transformed = {...params};
    for(let fkColumn of Object.keys(this.fkMappings)){
        if(!sc.hasOwn(params, fkColumn) || null === params[fkColumn]){
            continue;
        }
        let mapping = this.fkMappings[fkColumn];
        transformed[mapping.relationKey] = this.orm.em.getReference(mapping.entityName, params[fkColumn]);
        delete transformed[fkColumn];
    }
    return transformed;
}
```

**Behavior:**
- ✅ Accepts explicit IDs for autoincrement fields
- ✅ Returns created record with ID
- ✅ Throws on constraint violations
- ⚠️ Transforms FK columns to MikroORM References

#### Prisma Implementation (prisma-driver.js:225-234)

```javascript
async create(params)
{
    let preparedData = this.prepareData(params, {convertRelations: true, isCreate: true});
    this.ensureRequiredFields(preparedData);
    return this.executeWithNormalization(
        () => this.model.create({data: preparedData}),
        'Create error: ',
        false
    );
}
```

**How it works:**
1. Prepares data via `prepareData()` with `isCreate: true`
   - Removes autoincrement ID field (line 170-172)
   - Converts FK fields to relation connect syntax
   - Casts types
2. Validates required fields via `ensureRequiredFields()`
3. Calls Prisma's `model.create()`
4. Normalizes return data (converts BigInt, etc)

**prepareData() for create (lines 150-189):**
```javascript
prepareData(params, options = {})
{
    let isCreate = sc.get(options, 'isCreate', false);
    let convertRelations = sc.get(options, 'convertRelations', false);
    if(convertRelations){
        let converted = this.relationResolver.convertForeignKeysToRelations(params, isCreate);
        return this.castDataFields(converted, skipObjects, isCreate);
    }
    return this.castDataFields(params, skipObjects, isCreate);
}

castDataFields(params, skipObjects = false, isCreate = false)
{
    let data = {};
    for(let key of Object.keys(params)){
        let value = params[key];
        if(isCreate && key === this.idFieldName && this.typeCaster.isNullOrEmpty(value)){
            continue;  // Skip ID field in create
        }
        // ... type casting logic
    }
    return data;
}
```

**Behavior:**
- ❌ REJECTS explicit IDs for autoincrement fields (removed in prepareData)
- ✅ Returns created record with auto-generated ID
- ✅ Throws on constraint violations
- ⚠️ Converts FK columns to Prisma connect syntax

**Consistency Analysis:**
- ✅ All return created record with ID
- ✅ All throw on constraint violations
- ❌ **INCONSISTENT**: ObjectionJS and MikroORM accept explicit IDs, Prisma rejects them
- ⚠️ All three transform FK fields differently internally

**Tests Impact:**
- Basic CREATE tests work when NOT passing explicit IDs
- Prisma fails when fixtures contain explicit IDs

---

### 3.2 createWithRelations(params, relations)

**Purpose:** Create a record along with nested related records in a single operation

**Parameters:**
- `params` (object) - Parent record data with nested relation data
- `relations` (array) - Relation names to create (e.g., ['related_products'])

**Expected Behavior:**
- Create parent record
- Create child records
- Link child records to parent via FK
- Return parent record with relations populated

**Return:** Created parent record with nested relations

#### ObjectionJS Implementation (objection-js-driver.js:43-46)

```javascript
createWithRelations(params, relations)
{
    return this.queryBuilder().insertGraphAndFetch(params);
}
```

**How it works:**
- Uses Objection's `insertGraphAndFetch()` method
- Recursively inserts parent and children
- Automatically handles FK relationships
- Returns complete graph with all IDs

**Example:**
```javascript
await categoriesRepo.createWithRelations({
    name: 'Electronics',
    related_products: [
        {name: 'Laptop', sku: 'LAP-001'}
    ]
}, ['related_products']);
```

**Behavior:**
- ✅ Supports nested CREATE (creates new children)
- ✅ Works with explicit IDs
- ✅ Works without explicit IDs
- ✅ Returns parent with populated relations

#### MikroORM Implementation (mikro-orm-driver.js:94-102)

```javascript
async createWithRelations(params, relations)
{
    if(!sc.isArray(relations) || 0 === relations.length){
        relations = this.getAllRelations();
    }
    let newInstance = await this.create(params);
    await this.createNested(newInstance, params, relations);
    return await this.appendRelationsToCollection(newInstance, relations);
}
```

**How it works:**
1. Create parent via `this.create(params)` (ignores relation fields)
2. Create nested children via `createNested()`
3. Populate relations via `appendRelationsToCollection()`

**createNested() (lines 441-470):**
```javascript
async createNested(newInstance, params, relations)
{
    for(let relationName of Object.keys(properties)){
        let prop = properties[relationName];
        if(isOneToMany && sc.hasOwn(params, relationName) && sc.isArray(params[relationName])){
            await this.createMany(params, relationName, relationDriver, newInstance, prop);
        }
    }
}
```

**createMany() (lines 483-495):**
```javascript
async createMany(params, relationName, relationDriver, newInstance, prop)
{
    let nestedArray = [];
    for(let objectData of params[relationName]){
        if(prop.joinColumn){
            objectData[prop.joinColumn] = newInstance.id;  // Set FK to parent ID
        }
        let nestedObject = await relationDriver.create(objectData);
        await this.orm.em.flush();
        nestedArray.push(nestedObject);
    }
    newInstance[relationName] = nestedArray;
}
```

**Behavior:**
- ✅ Supports nested CREATE (creates new children)
- ✅ Works with explicit IDs
- ⚠️ **BREAKS with delete operator** on properties (JIT compiler issue)
- ✅ Returns parent with populated relations

#### Prisma Implementation (prisma-driver.js:236-264)

```javascript
async createWithRelations(params, relations)
{
    if(!sc.isArray(relations) || 0 === relations.length){
        relations = this.getAllRelations();
    }
    let preparedData = this.prepareData(params);  // NOTE: no isCreate flag!
    this.ensureRequiredFields(preparedData);
    let createData = {data: preparedData};
    if(0 < relations.length){
        let includeData = this.relationResolver.buildIncludeObjectWithMapping(relations);
        createData.include = includeData.include;
        let relationData = this.relationResolver.buildCreateDataWithRelations(params, relations);
        createData.data = {...createData.data, ...relationData};
        return this.executeWithNormalization(
            async () => this.relationResolver.transformRelationResults(
                await this.model.create(createData),
                includeData.include,
                includeData.mapping
            ),
            'Create with relations error: ',
            false
        );
    }
    return this.executeWithNormalization(
        () => this.model.create(createData),
        'Create with relations error: ',
        false
    );
}
```

**buildCreateDataWithRelations() (prisma-relation-resolver.js:234-263):**
```javascript
buildCreateDataWithRelations(params, relations)
{
    let createData = {};
    for(let relation of relations){
        let relationData = params[relation];
        if(sc.isArray(relationData)){
            createData[prismaName] = {
                connect: relationData.map(item => ({id: this.typeCaster.castToIdType(item.id)}))
            };
            continue;
        }
        createData[prismaName] = {
            connect: {id: this.typeCaster.castToIdType(relationData.id)}
        };
    }
    return createData;
}
```

**CRITICAL ISSUE:** Uses `connect` syntax, NOT `create` syntax!

**Prisma's nested CREATE syntax should be:**
```javascript
{
    data: {
        name: 'Electronics',
        related_products: {
            create: [  // ← Should use "create"
                {name: 'Laptop', sku: 'LAP-001'}
            ]
        }
    }
}
```

**What our code does:**
```javascript
{
    data: {
        name: 'Electronics',
        related_products: {
            connect: [  // ← WRONG: Tries to link existing records
                {id: undefined}  // ← Fails because no ID
            ]
        }
    }
}
```

**Behavior:**
- ❌ **DOES NOT support nested CREATE**
- ❌ Only supports CONNECT (linking existing records)
- ❌ Requires child records to already exist with IDs
- ❌ Current implementation is broken

**Consistency Analysis:**
- ✅ ObjectionJS: Full nested CREATE support
- ⚠️ MikroORM: Full nested CREATE support BUT breaks with delete operator
- ❌ Prisma: NO nested CREATE support - only CONNECT
- **MAJOR INCONSISTENCY** - Method doesn't work the same across drivers

---

### 3.3 update(filters, updatePatch)

**Purpose:** Update multiple records matching filters

**Parameters:**
- `filters` (object) - Filter conditions
- `updatePatch` (object) - Fields to update

**Expected Behavior:**
- Find all records matching filters
- Update specified fields
- Return updated records (or result indicator)

**Return:** Updated records or result object

#### ObjectionJS Implementation (objection-js-driver.js:48-53)

```javascript
update(filters, updatePatch)
{
    let queryBuilder = this.queryBuilder(true, true, true);
    this.appendFilters(queryBuilder, filters);
    return queryBuilder.patch(updatePatch);
}
```

**How it works:**
- Builds query with limit/offset/sort
- Appends filters via `appendFilters()`
- Calls Knex `patch()` method
- Returns number of affected rows

**Return type:** Number (count of updated rows)

#### MikroORM Implementation (mikro-orm-driver.js:119-123)

```javascript
async update(filters, updatePatch)
{
    let processedFilters = this.processFilters(filters);
    return this.applyUpdateToEntities(processedFilters, updatePatch);
}

async applyUpdateToEntities(processedFilters, updatePatch)
{
    let entities = await this.repository.find(processedFilters, this.queryBuilder(true, true, true));
    if(0 === entities.length){
        return false;
    }
    let transformed = this.transformFkToRelations(updatePatch);
    for(let entity of entities){
        Object.assign(entity, transformed);
        await this.orm.em.upsert(entity);
        await this.orm.em.flush();
    }
    return entities;
}
```

**How it works:**
1. Find entities matching filters
2. Transform FK fields to relations
3. Update each entity via Object.assign
4. Upsert and flush each entity
5. Return array of updated entities

**Return type:** Array of entity objects OR false

#### Prisma Implementation (prisma-driver.js:266-275)

```javascript
async update(filters, updatePatch)
{
    let preparedData = this.prepareData(updatePatch, {skipObjects: true});
    let processedFilters = this.filterProcessor.processFilters(filters);
    return this.executeWithNormalization(
        () => this.model.updateMany({where: processedFilters, data: preparedData}),
        'Update error: ',
        false
    );
}
```

**How it works:**
- Prepare data (skip object fields, convert relations)
- Process filters
- Call Prisma's `updateMany()`
- Normalize return (count of updated rows)

**Return type:** Object with `count` property OR false

**Consistency Analysis:**
- ❌ **RETURN TYPE INCONSISTENT**:
  - ObjectionJS: Number (count)
  - MikroORM: Array of entities OR false
  - Prisma: Object {count: N} OR false
- ✅ All update multiple records
- ✅ All respect filters

**Tests Impact:**
- Tests check for truthy return value (`assert.ok(updated)`)
- Works for all drivers despite different return types
- MikroORM returns full entities (more data than needed)

---

### 3.4 updateById(id, params)

**Purpose:** Update single record by ID

**Parameters:**
- `id` - Record ID
- `params` (object) - Fields to update

**Expected Behavior:**
- Find record by ID
- Update specified fields
- Return updated record

**Return:** Updated record object

#### ObjectionJS Implementation (objection-js-driver.js:62-65)

```javascript
updateById(id, params)
{
    return this.queryBuilder().patchAndFetchById(id, params);
}
```

**How it works:**
- Uses Objection's `patchAndFetchById()` method
- Updates and returns updated record in one operation

**Return type:** Updated record object

#### MikroORM Implementation (mikro-orm-driver.js:132-135)

```javascript
updateById(id, params)
{
    return this.update({id}, params);
}
```

**How it works:**
- Delegates to `update()` with `{id}` filter
- Returns array of entities (from update())

**Return type:** Array with single entity OR false

#### Prisma Implementation (prisma-driver.js:288-301)

```javascript
async updateById(id, params)
{
    let castedId = this.typeCaster.castToIdType(id);
    let found = await this.loadById(castedId);
    if(!found){
        return false;
    }
    let preparedData = this.prepareData(params, {convertRelations: true});
    return this.executeWithNormalization(
        () => this.model.update({where: {[this.idFieldName]: castedId}, data: preparedData}),
        'Update by ID error: ',
        false
    );
}
```

**How it works:**
1. Cast ID to correct type
2. Check if record exists via `loadById()`
3. Return false if not found
4. Prepare data with relation conversion
5. Call Prisma's `update()`
6. Return updated record

**Return type:** Updated record object OR false

**Consistency Analysis:**
- ⚠️ **RETURN TYPE INCONSISTENT**:
  - ObjectionJS: Record object
  - MikroORM: Array [record] OR false
  - Prisma: Record object OR false
- ✅ All update by ID
- ⚠️ MikroORM returns array instead of single object

**Tests Impact:**
- Tests expect single object: `assert.strictEqual(updated.name, 'Updated Name')`
- **MikroORM tests FAIL** because it returns array
- Need to check test logs for MikroORM updateById failures

---

### 3.5 updateBy(field, fieldValue, updatePatch, operator)

**Purpose:** Update multiple records matching a single field condition

**Parameters:**
- `field` (string) - Field name to filter by
- `fieldValue` - Value to match
- `updatePatch` (object) - Fields to update
- `operator` (string, optional) - Comparison operator (GT, LT, LIKE, etc.)

**Expected Behavior:**
- Find records where field matches value (with optional operator)
- Update specified fields
- Return updated records

**Return:** Updated records or result indicator

#### ObjectionJS Implementation (objection-js-driver.js:55-60)

```javascript
updateBy(field, fieldValue, updatePatch, operator = null)
{
    let queryBuilder = this.queryBuilder(true, true, true);
    this.appendSingleFilter(queryBuilder, field, fieldValue, operator);
    return queryBuilder.patch(updatePatch);
}
```

**Return type:** Number (count of updated rows)

#### MikroORM Implementation (mikro-orm-driver.js:125-130)

```javascript
async updateBy(field, fieldValue, updatePatch, operator = null)
{
    let filter = this.createSingleFilter(field, fieldValue, operator);
    let processedFilters = this.processFilters(filter);
    return this.applyUpdateToEntities(processedFilters, updatePatch);
}
```

**Return type:** Array of entities OR false

#### Prisma Implementation (prisma-driver.js:277-286)

```javascript
async updateBy(field, fieldValue, updatePatch, operator = null)
{
    let filter = this.filterProcessor.createSingleFilter(field, fieldValue, operator);
    let preparedData = this.prepareData(updatePatch, {skipObjects: true});
    return this.executeWithNormalization(
        () => this.model.updateMany({where: filter, data: preparedData}),
        'Update by error: ',
        false
    );
}
```

**Return type:** Object {count: N} OR false

**Consistency Analysis:**
- ❌ **RETURN TYPE INCONSISTENT** (same as update())
- ✅ All support operator parameter
- ✅ All update multiple records

---

### 3.6 upsert(params, filters)

**Purpose:** Insert if record doesn't exist, update if it does

**Parameters:**
- `params` (object) - Record data (with or without ID)
- `filters` (object, optional) - Alternate filters to find existing record

**Expected Behavior:**
- If params.id exists and record found: UPDATE by ID
- Else if filters provided and record found: UPDATE by filters
- Else: CREATE new record

**Return:** Updated or created record

#### ObjectionJS Implementation (objection-js-driver.js:67-82)

```javascript
async upsert(params, filters)
{
    if(params.id){
        let existent = await this.loadById(params.id);
        if(existent){
            return this.updateById(params.id, params);
        }
    }
    if(filters){
        let existent = await this.loadOne(filters);
        if(existent){
            return this.updateById(existent.id, params);
        }
    }
    return this.create(params);
}
```

**Logic:**
1. Check if record exists by ID
2. Check if record exists by filters
3. If found: update, else: create

**Return type:** Record object

#### MikroORM Implementation (mikro-orm-driver.js:137-152)

```javascript
async upsert(params, filters)
{
    if(params.id){
        let patch = Object.assign({}, params);
        delete patch.id;
        return this.updateById(params.id, patch);
    }
    if(filters){
        let existent = await this.loadOne(filters);
        if(existent){
            let transformed = this.transformFkToRelations(params);
            return this.updateById(existent.id, transformed);
        }
    }
    return this.create(params);
}
```

**Logic:**
1. If params.id: update by ID (removes ID from patch)
2. Check if record exists by filters
3. If found: update, else: create

**Return type:** Array [record] OR Record (from updateById or create)

#### Prisma Implementation (prisma-driver.js:303-334)

```javascript
async upsert(params, filters)
{
    let preparedData = this.prepareData(params, {convertRelations: true});
    let idValue = params[this.idFieldName];
    if(idValue){
        let castedId = this.typeCaster.castToIdType(idValue);
        let existing = await this.loadById(castedId);
        if(existing){
            let patch = Object.assign({}, preparedData);
            delete patch[this.idFieldName];
            return this.executeWithNormalization(
                () => this.model.update({where: {[this.idFieldName]: castedId}, data: patch}),
                'Upsert update error: ',
                false
            );
        }
    }
    if(filters){
        let existing = await this.loadOne(filters);
        if(existing){
            return this.executeWithNormalization(
                () => this.model.update({
                    where: {[this.idFieldName]: this.typeCaster.castToIdType(existing[this.idFieldName])},
                    data: preparedData
                }),
                'Upsert update by filter error: ',
                false
            );
        }
    }
    return await this.create(preparedData);
}
```

**Logic:** Same as ObjectionJS

**Return type:** Record object OR false

**Consistency Analysis:**
- ✅ All have same logic flow
- ⚠️ MikroORM has inconsistent return (array from updateById)
- ✅ All support ID-based and filter-based detection

---

### 3.7 delete(filters)

**Purpose:** Delete multiple records matching filters

**Parameters:**
- `filters` (object) - Filter conditions

**Expected Behavior:**
- Find all records matching filters
- Delete them
- Return success indicator

**Return:** Boolean or count

#### ObjectionJS Implementation (objection-js-driver.js:84-88)

```javascript
delete(filters)
{
    let queryBuilder = this.queryBuilder(true, true, true);
    return this.appendFilters(queryBuilder, filters).delete();
}
```

**Return type:** Number (count of deleted rows)

#### MikroORM Implementation (mikro-orm-driver.js:154-166)

```javascript
async delete(filters = {})
{
    let processedFilters = this.processFilters(filters);
    let entries = await this.repository.find(processedFilters);
    if(!entries || 0 === entries.length){
        return false;
    }
    for(let entry of entries){
        await this.orm.em.remove(entry);
    }
    await this.orm.em.flush();
    return true;
}
```

**Return type:** Boolean (true or false)

#### Prisma Implementation (prisma-driver.js:336-344)

```javascript
async delete(filters = {})
{
    let processedFilters = this.filterProcessor.processFilters(filters);
    return this.executeWithNormalization(
        () => this.model.deleteMany({where: processedFilters}),
        'Delete error: ',
        false
    );
}
```

**Return type:** Object {count: N} OR false

**Consistency Analysis:**
- ❌ **RETURN TYPE INCONSISTENT**:
  - ObjectionJS: Number
  - MikroORM: Boolean
  - Prisma: Object {count: N} OR false
- ✅ All delete multiple records
- ✅ All support filters

---

### 3.8 deleteById(id)

**Purpose:** Delete single record by ID

**Parameters:**
- `id` - Record ID

**Expected Behavior:**
- Find record by ID
- Delete it
- Return success indicator

**Return:** Boolean or result object

#### ObjectionJS Implementation (objection-js-driver.js:90-93)

```javascript
deleteById(id)
{
    return this.queryBuilder().deleteById(id);
}
```

**Return type:** Number (1 if deleted, 0 if not found)

#### MikroORM Implementation (mikro-orm-driver.js:168-177)

```javascript
async deleteById(id)
{
    let entity = await this.loadById(id);
    if(!entity){
        return false;
    }
    await this.orm.em.remove(entity);
    await this.orm.em.flush();
    return true;
}
```

**Return type:** Boolean (true or false)

#### Prisma Implementation (prisma-driver.js:346-358)

```javascript
async deleteById(id)
{
    let castedId = this.typeCaster.castToIdType(id);
    let found = await this.loadById(castedId);
    if(!found){
        return false;
    }
    return this.executeWithNormalization(
        () => this.model.delete({where: {[this.idFieldName]: castedId}}),
        'Delete by ID error: ',
        false
    );
}
```

**Return type:** Record object (deleted record) OR false

**Consistency Analysis:**
- ❌ **RETURN TYPE INCONSISTENT**:
  - ObjectionJS: Number
  - MikroORM: Boolean
  - Prisma: Record object OR false
- ✅ All delete by ID
- ✅ All return falsy when not found

---

### 3.9 count(filters)

**Purpose:** Count records matching filters

**Parameters:**
- `filters` (object) - Filter conditions

**Expected Behavior:**
- Count records matching filters
- Return count as number

**Return:** Number

#### ObjectionJS Implementation (objection-js-driver.js:95-101)

```javascript
async count(filters)
{
    let queryBuilder = this.queryBuilder(true, true, true);
    this.appendFilters(queryBuilder, filters);
    let count = await queryBuilder.count().first();
    return count ? count['count(*)'] : 0;
}
```

**Return type:** Number

#### MikroORM Implementation (mikro-orm-driver.js:179-183)

```javascript
async count(filters)
{
    let processedFilters = this.processFilters(filters);
    return this.repository.count(processedFilters);
}
```

**Return type:** Number

#### Prisma Implementation (prisma-driver.js:360-368)

```javascript
async count(filters)
{
    let processedFilters = this.filterProcessor.processFilters(filters);
    return this.executeWithNormalization(
        () => this.model.count({where: processedFilters}),
        'Count error: ',
        0
    );
}
```

**Return type:** Number

**Consistency Analysis:**
- ✅ **ALL CONSISTENT** - Return number
- ✅ All count by filters
- ✅ All return 0 on error

---

### 3.10 countWithRelations(filters, relations)

**Purpose:** Count records with relation-based filters

**Parameters:**
- `filters` (object) - Filter conditions
- `relations` (array) - Relations to include in query

**Expected Behavior:**
- Count records matching filters
- Consider relation joins in count
- Return count as number

**Return:** Number

#### ObjectionJS Implementation (objection-js-driver.js:103-109)

```javascript
async countWithRelations(filters, relations)
{
    let queryBuilder = this.queryBuilder(true, true, true);
    this.appendFilters(queryBuilder, filters);
    let count = await this.appendRelationsToQuery(queryBuilder, relations).count().first();
    return count ? count['count(*)'] : 0;
}
```

**How it works:**
- Builds query with relations joined
- Counts distinct parent records

**Return type:** Number

#### MikroORM Implementation (mikro-orm-driver.js:185-222)

```javascript
async countWithRelations(filters, relations)
{
    if(!sc.isArray(relations) || 0 === relations.length){
        relations = this.getAllRelations();
    }
    let processedFilters = this.processFilters(filters);
    if(0 === relations.length || !this.rawModel.meta || !this.rawModel.meta.properties){
        return this.repository.count(processedFilters);
    }
    let queryBuilder = this.orm.em.createQueryBuilder(this.rawModel);
    let properties = this.rawModel.meta.properties;
    let aliasCounter = 0;
    for(let relationName of relations){
        let prop = properties[relationName];
        if(!prop || !prop.kind || (prop.kind !== 'm:1' && prop.kind !== '1:m')){
            continue;
        }
        // ... builds LEFT JOINs for relations
    }
    if(sc.isObject(processedFilters) && 0 < Object.keys(processedFilters).length){
        queryBuilder.where(processedFilters);
    }
    return queryBuilder.getCount();
}
```

**How it works:**
- Manually builds LEFT JOINs for each relation
- Counts with relations joined

**Return type:** Number

#### Prisma Implementation (prisma-driver.js:370-385)

```javascript
async countWithRelations(filters, relations)
{
    if(!sc.isArray(relations) || 0 === relations.length){
        relations = this.getAllRelations();
    }
    let processedFilters = this.filterProcessor.processFilters(filters);
    let query = {where: processedFilters};
    if(0 < relations.length){
        query.include = this.relationResolver.buildIncludeObjectWithMapping(relations).include;
    }
    return this.executeWithNormalization(
        () => this.model.count(query),
        'Count with relations error: ',
        0
    );
}
```

**How it works:**
- Builds include object for relations
- Calls Prisma count with include

**Return type:** Number

**Consistency Analysis:**
- ✅ **ALL CONSISTENT** - Return number
- ✅ All count with relations joined
- ⚠️ Prisma's include in count may not work correctly (Prisma doesn't filter by relations in count)

---

### 3.11 loadAll()

**Purpose:** Load ALL records from table (no filters)

**Parameters:** None

**Expected Behavior:**
- Load all records
- Respect limit/offset/sort properties
- Return array of records

**Return:** Array of records

#### ObjectionJS Implementation (objection-js-driver.js:111-114)

```javascript
loadAll()
{
    return this.queryBuilder();
}
```

**Return type:** Promise<Array>

#### MikroORM Implementation (mikro-orm-driver.js:224-227)

```javascript
loadAll()
{
    return this.repository.findAll();
}
```

**Return type:** Promise<Array>

#### Prisma Implementation (prisma-driver.js:387-394)

```javascript
async loadAll()
{
    return this.executeWithNormalization(
        () => this.model.findMany(this.queryBuilder.buildQueryOptions(this.getQueryOptions())),
        'Load all error: ',
        []
    );
}
```

**Return type:** Promise<Array>

**Consistency Analysis:**
- ✅ **ALL CONSISTENT** - Return array
- ✅ All load all records
- ✅ All respect limit/offset/sort

---

### 3.12 loadAllWithRelations(relations)

**Purpose:** Load ALL records with relations

**Parameters:**
- `relations` (array) - Relations to load

**Expected Behavior:**
- Load all records
- Populate specified relations
- Respect limit/offset/sort
- Return array with relations

**Return:** Array of records with relations populated

#### ObjectionJS Implementation (objection-js-driver.js:116-119)

```javascript
loadAllWithRelations(relations)
{
    return this.appendRelationsToQuery(this.queryBuilder(), relations);
}
```

**Return type:** Promise<Array>

#### MikroORM Implementation (mikro-orm-driver.js:229-236)

```javascript
async loadAllWithRelations(relations)
{
    if(!sc.isArray(relations) || 0 === relations.length){
        relations = this.getAllRelations();
    }
    let entities = await this.loadAll();
    return await this.appendRelationsToCollection(entities, relations);
}
```

**Return type:** Promise<Array>

#### Prisma Implementation (prisma-driver.js:396-405)

```javascript
async loadAllWithRelations(relations)
{
    return this.executeQueryWithRelations(
        (q) => this.model.findMany(q),
        this.queryBuilder.buildQueryOptions(this.getQueryOptions()),
        relations,
        'Load all with relations error: ',
        []
    );
}
```

**Return type:** Promise<Array>

**Consistency Analysis:**
- ✅ **ALL CONSISTENT** - Return array with relations
- ✅ All load all records with relations
- ✅ All respect limit/offset/sort

---

### 3.13 load(filters)

**Purpose:** Load records matching filters

**Parameters:**
- `filters` (object) - Filter conditions

**Expected Behavior:**
- Load records matching filters
- Respect limit/offset/sort properties
- Return array of records

**Return:** Array of records

#### ObjectionJS Implementation (objection-js-driver.js:121-126)

```javascript
load(filters)
{
    let queryBuilder = this.queryBuilder(true, true, true);
    this.appendFilters(queryBuilder, filters);
    return queryBuilder;
}
```

**Return type:** Promise<Array>

#### MikroORM Implementation (mikro-orm-driver.js:238-242)

```javascript
load(filters)
{
    let processedFilters = this.processFilters(filters);
    return this.repository.find(processedFilters, this.queryBuilder(true, true, true));
}
```

**Return type:** Promise<Array>

#### Prisma Implementation (prisma-driver.js:407-417)

```javascript
async load(filters)
{
    let processedFilters = this.filterProcessor.processFilters(filters);
    let query = this.queryBuilder.buildQueryOptions(this.getQueryOptions());
    query.where = processedFilters;
    return this.executeWithNormalization(
        () => this.model.findMany(query),
        'Load error: ',
        []
    );
}
```

**Return type:** Promise<Array>

**Consistency Analysis:**
- ✅ **ALL CONSISTENT** - Return array
- ✅ All load by filters
- ✅ All respect limit/offset/sort

---

### 3.14 loadWithRelations(filters, relations)

**Purpose:** Load records matching filters with relations

**Parameters:**
- `filters` (object) - Filter conditions
- `relations` (array) - Relations to load

**Expected Behavior:**
- Load records matching filters
- Populate specified relations
- Respect limit/offset/sort
- Return array with relations

**Return:** Array of records with relations populated

#### ObjectionJS Implementation (objection-js-driver.js:128-133)

```javascript
loadWithRelations(filters, relations)
{
    let queryBuilder = this.queryBuilder(true, true, true);
    this.appendFilters(queryBuilder, filters);
    return this.appendRelationsToQuery(queryBuilder, relations);
}
```

**Return type:** Promise<Array>

#### MikroORM Implementation (mikro-orm-driver.js:244-252)

```javascript
async loadWithRelations(filters, relations)
{
    if(!sc.isArray(relations) || 0 === relations.length){
        relations = this.getAllRelations();
    }
    let processedFilters = this.processFilters(filters);
    let entitiesCollection = await this.repository.find(processedFilters, this.queryBuilder(true, true, true));
    return await this.appendRelationsToCollection(entitiesCollection, relations);
}
```

**Return type:** Promise<Array>

#### Prisma Implementation (prisma-driver.js:419-430)

```javascript
async loadWithRelations(filters, relations)
{
    let query = this.queryBuilder.buildQueryOptions(this.getQueryOptions());
    query.where = this.filterProcessor.processFilters(filters);
    return this.executeQueryWithRelations(
        (q) => this.model.findMany(q),
        query,
        relations,
        'Load with relations error: ',
        []
    );
}
```

**Return type:** Promise<Array>

**Consistency Analysis:**
- ✅ **ALL CONSISTENT** - Return array with relations
- ✅ All load by filters with relations
- ✅ All respect limit/offset/sort

---

### 3.15 loadById(id)

**Purpose:** Load single record by ID

**Parameters:**
- `id` - Record ID

**Expected Behavior:**
- Find record by ID
- Return record or null

**Return:** Record object or null

#### ObjectionJS Implementation (objection-js-driver.js:149-152)

```javascript
loadById(id)
{
    return this.queryBuilder().findById(id);
}
```

**Return type:** Promise<Record | null>

#### MikroORM Implementation (mikro-orm-driver.js:272-275)

```javascript
loadById(id)
{
    return this.loadOneBy('id', id);
}
```

**Return type:** Promise<Record | null>

#### Prisma Implementation (prisma-driver.js:457-465)

```javascript
async loadById(id)
{
    let castedId = this.typeCaster.castToIdType(id);
    return this.executeWithNormalization(
        () => this.model.findUnique({where: {[this.idFieldName]: castedId}}),
        'Load by ID error: ',
        null
    );
}
```

**Return type:** Promise<Record | null>

**Consistency Analysis:**
- ✅ **ALL CONSISTENT** - Return record or null
- ✅ All load by ID
- ✅ All return null when not found

---

### 3.16 loadByIdWithRelations(id, relations)

**Purpose:** Load single record by ID with relations

**Parameters:**
- `id` - Record ID
- `relations` (array) - Relations to load

**Expected Behavior:**
- Find record by ID
- Populate specified relations
- Return record with relations or null

**Return:** Record object with relations or null

#### ObjectionJS Implementation (objection-js-driver.js:154-157)

```javascript
loadByIdWithRelations(id, relations)
{
    return this.appendRelationsToQuery(this.queryBuilder().findById(id), relations);
}
```

**Return type:** Promise<Record | null>

#### MikroORM Implementation (mikro-orm-driver.js:277-284)

```javascript
async loadByIdWithRelations(id, relations)
{
    if(!sc.isArray(relations) || 0 === relations.length){
        relations = this.getAllRelations();
    }
    let entity = await this.loadOneBy('id', id);
    return await this.appendRelationsToCollection(entity, relations);
}
```

**Return type:** Promise<Record | null>

#### Prisma Implementation (prisma-driver.js:467-476)

```javascript
async loadByIdWithRelations(id, relations)
{
    return this.executeQueryWithRelations(
        (q) => this.model.findUnique(q),
        {where: {[this.idFieldName]: this.typeCaster.castToIdType(id)}},
        relations,
        'Load by ID with relations error: ',
        null
    );
}
```

**Return type:** Promise<Record | null>

**Consistency Analysis:**
- ✅ **ALL CONSISTENT** - Return record with relations or null
- ✅ All load by ID with relations
- ✅ All return null when not found

---

### 3.17 loadOne(filters)

**Purpose:** Load first record matching filters

**Parameters:**
- `filters` (object) - Filter conditions

**Expected Behavior:**
- Find first record matching filters
- Respect offset/sort (not limit)
- Return single record or null

**Return:** Record object or null

#### ObjectionJS Implementation (objection-js-driver.js:164-169)

```javascript
loadOne(filters)
{
    let queryBuilder = this.queryBuilder(false, true, true);
    this.appendFilters(queryBuilder, filters);
    return queryBuilder.limit(1).first();
}
```

**Note:** Uses `useLimit = false` but then manually adds `.limit(1)`

**Return type:** Promise<Record | null>

#### MikroORM Implementation (mikro-orm-driver.js:292-296)

```javascript
loadOne(filters)
{
    let processedFilters = this.processFilters(filters);
    return this.repository.findOne(processedFilters, this.queryBuilder(false, true, true));
}
```

**Return type:** Promise<Record | null>

#### Prisma Implementation (prisma-driver.js:491-501)

```javascript
async loadOne(filters)
{
    let processedFilters = this.filterProcessor.processFilters(filters);
    let query = this.queryBuilder.buildQueryOptions(this.getQueryOptions(), false);
    query.where = processedFilters;
    return this.executeWithNormalization(
        () => this.model.findFirst(query),
        'Load one error: ',
        null
    );
}
```

**Return type:** Promise<Record | null>

**Consistency Analysis:**
- ✅ **ALL CONSISTENT** - Return single record or null
- ✅ All load first match
- ✅ All respect offset/sort

---

### 3.18 rawQuery(content)

**Purpose:** Execute raw SQL query

**Parameters:**
- `content` (string) - SQL query string

**Expected Behavior:**
- Execute raw SQL
- Return results array or false

**Return:** Array of results or false

**Note:** This is implemented in DataServer classes, not Driver classes

#### ObjectionJS Implementation (objection-js-data-server.js:83-87)

```javascript
async rawQuery(content)
{
    let result = await this.knex.raw(content);
    return result[0] || false;
}
```

**Uses:** Knex.raw()

**Return type:** Array or false

#### MikroORM Implementation (mikro-orm-data-server.js:97-108)

```javascript
async rawQuery(content)
{
    try {
        let queryResult = await this.orm.em.execute(content);
        if(!sc.isArray(queryResult) || 0 === queryResult.length){
            return false;
        }
        return queryResult;
    } catch(error){
        Logger.error('MikroORM raw query error:', error.message);
        return false;
    }
}
```

**Uses:** EntityManager.execute()

**Return type:** Array or false

#### Prisma Implementation (prisma-data-server.js:119-138)

```javascript
async rawQuery(content)
{
    try {
        let statements = this.splitSqlStatements(content)
            .map(s => s.trim())
            .filter(s => '' !== s);
        if(0 === statements.length){
            return false;
        }
        let results = [];
        await this.prisma.$transaction(
            async (tx) => { results = await this.executeStatements(statements, tx); },
            {timeout: 60000}
        );
        return 1 === results.length ? results[0] : results;
    } catch(error) {
        Logger.error('Raw query failed: '+error.message);
        return false;
    }
}
```

**Uses:** `$transaction` wrapping `executeStatements()`, which calls `executeStatement()` per statement:
- SELECT / SHOW → `$queryRawUnsafe` → returns rows array
- CREATE / ALTER / DROP → `$executeRawUnsafe` → returns `{affectedRows: N}`
- INSERT / UPDATE / DELETE → `$executeRawUnsafe` → returns affected row count

**Return type:**
- Empty content → `false`
- Single statement → the result directly (not wrapped in array)
- Multiple statements → array of results
- Error → `false`

**Consistency Analysis:**
- ✅ All execute raw SQL
- ✅ All return false on error or empty input
- ⚠️ **RETURN TYPE DIFFERS for single statements**: ObjectionJS and MikroORM always return array or false; Prisma returns the result directly (not in an array) for a single statement, and an array only for multiple statements
- ⚠️ Prisma is the only driver that explicitly splits multi-statement strings and runs them atomically in a transaction

---

## 4. FILTER OPERATORS ANALYSIS

### 4.1 Supported Operators

**BaseDriver defines these operators** (base-driver.js:24-31):
```javascript
this.operatorsMap = {
    'GT': '>',
    'GTE': '>=',
    'LT': '<',
    'LTE': '<=',
    'NE': '!=',
    'EQ': '='
};
```

**Additional operators in drivers:**
- `OR` - OR condition
- `IN` - IN array
- `NOT` - NOT equal
- `LIKE` - Pattern matching
- `AND` - AND conditions

### 4.2 Filter Syntax

**Basic filter:**
```javascript
{field: value}  // WHERE field = value
```

**Operator filter:**
```javascript
{field: {operator: 'GT', value: 10}}  // WHERE field > 10
```

**OR filter:**
```javascript
{OR: [{field1: value1}, {field2: value2}]}  // WHERE field1 = value1 OR field2 = value2
```

**AND filter:**
```javascript
{AND: [{field1: value1}, {field2: value2}]}  // WHERE field1 = value1 AND field2 = value2
```

**IN filter:**
```javascript
{field: {operator: 'IN', value: [1, 2, 3]}}  // WHERE field IN (1, 2, 3)
```

**LIKE filter:**
```javascript
{field: {operator: 'LIKE', value: 'pattern'}}  // WHERE field LIKE '%pattern%'
```

### 4.3 ObjectionJS Filter Processing

**Implementation:** `appendFilters()` method (objection-js-driver.js:274-330)

**Key behaviors:**
- Converts operator strings to UPPERCASE
- Maps operators: `GT` → `>`, `GTE` → `>=`, etc.
- Special handling for:
  - `OR` operator → `.orWhere()`
  - `IN` operator → `.whereIn()`
  - `NOT` operator → `.whereNot()`
  - `LIKE` operator → `.where(field, 'like', '%value%')`
  - JSON fields with LIKE → `.where(ref(field).castText(), 'like', '%value%')`
- Nested AND/OR with proper SQL grouping
- Relation field flattening (converts `{related_table: {field: value}}` to `{related_table.field: value}`)

**Case sensitivity:** Operator strings converted to UPPERCASE before processing

### 4.4 MikroORM Filter Processing

**Implementation:** `processFilters()` method (mikro-orm-driver.js:326-353)

**Operator mapping** (mikro-orm-driver.js:32-41):
```javascript
this.mikroOrmOperators = {
    'GT': '$gt',
    'GTE': '$gte',
    'LT': '$lt',
    'LTE': '$lte',
    'NE': '$ne',
    'NOT': '$ne',
    'IN': '$in',
    'NOT IN': '$nin'
};
```

**Key behaviors:**
- Converts operator strings to UPPERCASE
- Maps to MikroORM operators: `GT` → `$gt`, `IN` → `$in`, etc.
- Special handling for:
  - `AND` → `$and` array
  - `OR` → `$or` array
  - `LIKE` → `$like` with `%value%` wrapping
  - JSON fields with LIKE → `$like` with `%value%`
- Recursive processing for nested filters

**Case sensitivity:** Operator strings converted to UPPERCASE before processing

### 4.5 Prisma Filter Processing

**Implementation:** `PrismaFilterProcessor` class (prisma-filter-processor.js)

**Key behaviors:**
- Converts filters to Prisma where syntax
- Maps operators to Prisma syntax: `GT` → `{gt: value}`, `IN` → `{in: array}`
- Special handling for:
  - `AND` → `AND` array
  - `OR` → `OR` array
  - `LIKE` → `{contains: value}` (case-sensitive) or `{mode: 'insensitive'}`
  - JSON fields → special JSON filtering
- Recursive processing for nested filters

**Case sensitivity:** Depends on database collation and mode setting

### 4.6 Filter Consistency Analysis

**Operator support:**
- ✅ **GT, GTE, LT, LTE, NE, EQ** - All drivers support
- ✅ **IN, NOT** - All drivers support
- ✅ **OR, AND** - All drivers support nested conditions
- ✅ **LIKE** - All drivers support with `%pattern%` wrapping

**Differences:**
- ⚠️ **Case handling:** All convert operators to UPPERCASE (consistent)
- ⚠️ **LIKE on JSON:** ObjectionJS uses castText(), others use string comparison
- ⚠️ **Relation filters:** ObjectionJS flattens, others handle differently

---

## 5. RELATION LOADING MECHANISMS

### 5.1 ObjectionJS Relations

**Method:** `appendRelationsToQuery()` (objection-js-driver.js:332-342)

**Implementation:**
```javascript
appendRelationsToQuery(queryBuilder, relations, relationsModifiers)
{
    if(!sc.isArray(relations) || 0 === relations.length){
        relations = Object.keys(this.rawModel.relationMappings || {});
    }
    if(0 < relations.length){
        queryBuilder.withGraphFetched('['+relations.join(',')+']');
    }
    this.appendRelationsModifiers(queryBuilder, relations, relationsModifiers);
    return queryBuilder;
}
```

**Key features:**
- Uses Objection's `withGraphFetched()` method
- Supports nested relations: `'related_products.related_reviews'`
- Supports relation modifiers (orderBy, limit)
- Single query with JOINs
- Eager loading

**Relation format:** Comma-separated string in brackets: `'[related_products,related_reviews]'`

### 5.2 MikroORM Relations

**Method:** `appendRelationsToCollection()` (mikro-orm-driver.js:423-439)

**Implementation:**
```javascript
async appendRelationsToCollection(entitiesCollection, relations)
{
    if(!relations || 0 === relations.length){
        return entitiesCollection;
    }
    if(!entitiesCollection){
        return entitiesCollection;
    }
    await this.orm.em.populate(entitiesCollection, relations);
    if(sc.isArray(entitiesCollection)){
        for(let entity of entitiesCollection){
            this.convertCollectionsToArrays(entity);
        }
        return entitiesCollection;
    }
    return this.convertCollectionsToArrays(entitiesCollection);
}
```

**Key features:**
- Uses MikroORM's `em.populate()` method
- Loads relations AFTER loading main entities (separate queries)
- Converts MikroORM Collections to plain arrays
- Lazy loading approach
- Supports nested relations

**Relation format:** Array of strings: `['related_products', 'related_reviews']`

### 5.3 Prisma Relations

**Method:** `executeQueryWithRelations()` (prisma-driver.js:541-559)

**Implementation:**
```javascript
async executeQueryWithRelations(modelMethod, query, relations, errorMessage, defaultReturn)
{
    if(!sc.isArray(relations) || 0 === relations.length){
        relations = this.getAllRelations();
    }
    let includeData = this.relationResolver.buildIncludeObjectWithMapping(relations);
    if(0 < Object.keys(includeData.include).length){
        query.include = includeData.include;
    }
    return this.executeWithNormalization(
        async () => this.relationResolver.transformRelationResults(
            await modelMethod(query),
            includeData.include,
            includeData.mapping
        ),
        errorMessage,
        defaultReturn
    );
}
```

**buildIncludeObjectWithMapping()** (prisma-relation-resolver.js:156-164):
```javascript
buildIncludeObjectWithMapping(relations)
{
    let include = {};
    let mapping = {};
    for(let relation of relations){
        this.processRelationPath(relation, include, mapping);
    }
    return {include, mapping};
}
```

**Key features:**
- Uses Prisma's `include` syntax
- Maps relation names (handles Prisma vs Reldens naming)
- Supports nested relations: `'related_products.related_reviews'` → `{related_products: {include: {related_reviews: true}}}`
- Eager loading with single query
- Transforms results to match Reldens naming

**Relation format:** Array of strings with dot notation: `['related_products.related_reviews']`

### 5.4 Relation Consistency Analysis

**Loading strategy:**
- ObjectionJS: Eager (single query with JOINs)
- MikroORM: Lazy (separate queries via populate)
- Prisma: Eager (single query with include)

**Nested relations:**
- ✅ All support nested relations
- ✅ All use dot notation: `'parent.child.grandchild'`

**Result format:**
- ✅ All return plain objects with relation properties
- ✅ All use same relation key names (e.g., `related_products`)

**Differences:**
- ⚠️ Performance: ObjectionJS/Prisma faster (fewer queries)
- ⚠️ MikroORM converts Collections to arrays (extra processing)
- ⚠️ Prisma requires name mapping (transformRelationResults)

---

**Documentation Complete**
**Date:** 2026-01-28
**Total Public Methods Documented:** 35+
**Purpose:** Technical reference for driver abstraction layer and method implementations

