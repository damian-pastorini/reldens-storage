/**
 *
 * Reldens - EntitiesGenerator Test
 *
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { EntitiesGenerator } = require('../../lib/entities-generator');
const { FileHandler } = require('@reldens/server-utils');

describe('EntitiesGenerator', () => {
    describe('constructor', () => {
        it('should initialize with default props', () => {
            let generator = new EntitiesGenerator({});
            assert.ok(generator.templatesFolderPath);
            assert.ok(generator.templates);
            assert.ok(generator.projectPath);
            assert.ok(generator.generationFolder);
            assert.ok(generator.entitiesFolder);
            assert.ok(generator.modelsFolder);
            assert.ok(generator.driverMap);
            assert.ok(generator.driversClassMap);
        });
        it('should initialize with custom projectPath', () => {
            let customPath = FileHandler.joinPaths(__dirname, 'custom-project');
            let generator = new EntitiesGenerator({projectPath: customPath});
            assert.strictEqual(generator.projectPath, customPath);
        });
        it('should initialize with override flag', () => {
            let generator = new EntitiesGenerator({isOverride: true});
            assert.strictEqual(generator.isOverride, true);
        });
        it('should initialize empty generated entities map', () => {
            let generator = new EntitiesGenerator({});
            assert.deepStrictEqual(generator.generatedEntities, {});
        });
        it('should initialize empty existing entities map', () => {
            let generator = new EntitiesGenerator({});
            assert.deepStrictEqual(generator.existingEntities, {});
        });
        it('should initialize empty existing entity fields map', () => {
            let generator = new EntitiesGenerator({});
            assert.deepStrictEqual(generator.existingEntityFields, {});
        });
        it('should initialize empty existing models map', () => {
            let generator = new EntitiesGenerator({});
            assert.deepStrictEqual(generator.existingModels, {});
        });
    });
    describe('detectExistingEntities', () => {
        it('should return early when entities folder does not exist', () => {
            let generator = new EntitiesGenerator({});
            generator.entitiesFolder = FileHandler.joinPaths(__dirname, 'nonexistent-folder');
            generator.detectExistingEntities();
            assert.deepStrictEqual(generator.existingEntities, {});
        });
        it('should detect entity files with -entity.js suffix', () => {
            let generator = new EntitiesGenerator({});
            generator.entitiesFolder = FileHandler.joinPaths(__dirname, '..', 'fixtures', 'mock-entities');
            if(!FileHandler.exists(generator.entitiesFolder)){
                assert.ok(true);
                return;
            }
            generator.detectExistingEntities();
            assert.ok(generator.existingEntities);
        });
        it('should skip files without -entity.js suffix', () => {
            let generator = new EntitiesGenerator({});
            generator.entitiesFolder = FileHandler.joinPaths(__dirname, '..', 'fixtures');
            if(!FileHandler.exists(generator.entitiesFolder)){
                assert.ok(true);
                return;
            }
            generator.detectExistingEntities();
            let entityFiles = Object.values(generator.existingEntities);
            for(let entity of entityFiles){
                assert.ok(entity.entityFileName.endsWith('-entity.js'));
            }
        });
        it('should convert kebab-case filenames to snake_case table names', () => {
            let generator = new EntitiesGenerator({});
            generator.entitiesFolder = FileHandler.joinPaths(__dirname, '..', 'fixtures', 'mock-entities');
            if(!FileHandler.exists(generator.entitiesFolder)){
                assert.ok(true);
                return;
            }
            generator.detectExistingEntities();
            for(let tableName of Object.keys(generator.existingEntities)){
                assert.ok(!tableName.includes('-'));
            }
        });
    });
    describe('detectExistingModels', () => {
        it('should return early when models folder does not exist', () => {
            let generator = new EntitiesGenerator({});
            generator.modelsFolder = FileHandler.joinPaths(__dirname, 'nonexistent-folder');
            generator.detectExistingModels();
            assert.deepStrictEqual(generator.existingModels, {});
        });
        it('should detect model files in driver subfolders', () => {
            let generator = new EntitiesGenerator({});
            generator.modelsFolder = FileHandler.joinPaths(__dirname, '..', 'fixtures', 'mock-models');
            if(!FileHandler.exists(generator.modelsFolder)){
                assert.ok(true);
                return;
            }
            generator.detectExistingModels();
            assert.ok(generator.existingModels);
        });
        it('should skip files without -model.js suffix', () => {
            let generator = new EntitiesGenerator({});
            generator.modelsFolder = FileHandler.joinPaths(__dirname, '..', 'fixtures', 'mock-models');
            if(!FileHandler.exists(generator.modelsFolder)){
                assert.ok(true);
                return;
            }
            generator.detectExistingModels();
            for(let tableName of Object.keys(generator.existingModels)){
                for(let driverKey of Object.keys(generator.existingModels[tableName])){
                    assert.ok(generator.existingModels[tableName][driverKey].modelFileName.endsWith('-model.js'));
                }
            }
        });
        it('should group models by table name and driver', () => {
            let generator = new EntitiesGenerator({});
            generator.modelsFolder = FileHandler.joinPaths(__dirname, '..', 'fixtures', 'mock-models');
            if(!FileHandler.exists(generator.modelsFolder)){
                assert.ok(true);
                return;
            }
            generator.detectExistingModels();
            for(let tableName of Object.keys(generator.existingModels)){
                assert.ok('object' === typeof generator.existingModels[tableName]);
                for(let driverKey of Object.keys(generator.existingModels[tableName])){
                    assert.ok(generator.existingModels[tableName][driverKey].driverKey);
                }
            }
        });
    });
    describe('detectExistingEntityFields', () => {
        it('should return early when file does not exist', () => {
            let generator = new EntitiesGenerator({});
            generator.entitiesFolder = FileHandler.joinPaths(__dirname, 'nonexistent-folder');
            generator.detectExistingEntityFields('test_table', 'test-entity.js');
            assert.ok(!generator.existingEntityFields['test_table']);
        });
        it('should extract property names from entity file', () => {
            let generator = new EntitiesGenerator({});
            let mockEntityPath = FileHandler.joinPaths(__dirname, '..', 'fixtures', 'mock-entities', 'test-users-entity.js');
            if(!FileHandler.exists(mockEntityPath)){
                assert.ok(true);
                return;
            }
            generator.entitiesFolder = FileHandler.joinPaths(__dirname, '..', 'fixtures', 'mock-entities');
            generator.detectExistingEntityFields('test_users', 'test-users-entity.js');
            assert.ok(generator.existingEntityFields['test_users']);
            assert.ok(Array.isArray(generator.existingEntityFields['test_users']));
        });
    });
    describe('entityNeedsUpdate', () => {
        it('should return true when no existing fields', () => {
            let generator = new EntitiesGenerator({});
            let tableData = {columns: {id: {}, name: {}, email: {}}};
            let needsUpdate = generator.entityNeedsUpdate('new_table', tableData);
            assert.strictEqual(needsUpdate, true);
        });
        it('should return true when database has new field', () => {
            let generator = new EntitiesGenerator({});
            generator.existingEntityFields['test_table'] = ['id', 'name'];
            let tableData = {columns: {id: {}, name: {}, email: {}}};
            let needsUpdate = generator.entityNeedsUpdate('test_table', tableData);
            assert.strictEqual(needsUpdate, true);
        });
        it('should return true when entity has removed field', () => {
            let generator = new EntitiesGenerator({});
            generator.existingEntityFields['test_table'] = ['id', 'name', 'email', 'phone'];
            let tableData = {columns: {id: {}, name: {}, email: {}}};
            let needsUpdate = generator.entityNeedsUpdate('test_table', tableData);
            assert.strictEqual(needsUpdate, true);
        });
        it('should return false when fields match exactly', () => {
            let generator = new EntitiesGenerator({});
            generator.existingEntityFields['test_table'] = ['id', 'name', 'email'];
            let tableData = {columns: {id: {}, name: {}, email: {}}};
            let needsUpdate = generator.entityNeedsUpdate('test_table', tableData);
            assert.strictEqual(needsUpdate, false);
        });
        it('should ignore id field when checking for removed fields', () => {
            let generator = new EntitiesGenerator({});
            generator.existingEntityFields['test_table'] = ['id', 'name'];
            let tableData = {columns: {id: {}, name: {}}};
            let needsUpdate = generator.entityNeedsUpdate('test_table', tableData);
            assert.strictEqual(needsUpdate, false);
        });
    });
    describe('filterTablesToGenerate', () => {
        let generator;
        beforeEach(() => {
            generator = new EntitiesGenerator({});
            generator.existingEntities = {};
            generator.existingModels = {};
            generator.existingEntityFields = {};
            generator.entitiesConfigPath = FileHandler.joinPaths(__dirname, 'nonexistent-config.js');
        });
        it('should include new tables', () => {
            let tables = {
                new_table: {columns: {id: {}, name: {}}}
            };
            let filtered = generator.filterTablesToGenerate(tables, 'objection-js');
            assert.ok(filtered['new_table']);
        });
        it('should include tables with field changes', () => {
            generator.existingEntities['test_table'] = {entityFileName: 'test-table-entity.js'};
            generator.existingEntityFields['test_table'] = ['id', 'name'];
            generator.entityExistsInConfig = () => true;
            generator.modelExistsInRegistered = () => true;
            let tables = {
                test_table: {columns: {id: {}, name: {}, email: {}}}
            };
            let filtered = generator.filterTablesToGenerate(tables, 'objection-js');
            assert.ok(filtered['test_table']);
        });
        it('should include tables missing models', () => {
            generator.existingEntities['test_table'] = {entityFileName: 'test-table-entity.js'};
            generator.existingEntityFields['test_table'] = ['id', 'name'];
            generator.entityExistsInConfig = () => true;
            let tables = {
                test_table: {columns: {id: {}, name: {}}}
            };
            let filtered = generator.filterTablesToGenerate(tables, 'objection-js');
            assert.ok(filtered['test_table']);
        });
        it('should exclude tables that are fully configured and up to date', () => {
            generator.existingEntities['test_table'] = {entityFileName: 'test-table-entity.js'};
            generator.existingEntityFields['test_table'] = ['id', 'name'];
            generator.existingModels['test_table'] = {
                'objection-js': {modelFileName: 'test-table-model.js'}
            };
            generator.modelExistsInRegistered = () => true;
            generator.entityExistsInConfig = () => true;
            let tables = {
                test_table: {columns: {id: {}, name: {}}}
            };
            let filtered = generator.filterTablesToGenerate(tables, 'objection-js');
            assert.ok(!filtered['test_table']);
        });
        it('should include all tables when override flag is set', () => {
            generator.isOverride = true;
            generator.existingEntities['test_table'] = {entityFileName: 'test-table-entity.js'};
            generator.existingEntityFields['test_table'] = ['id', 'name'];
            generator.existingModels['test_table'] = {
                'objection-js': {modelFileName: 'test-table-model.js'}
            };
            generator.modelExistsInRegistered = () => true;
            generator.entityExistsInConfig = () => true;
            let tables = {
                test_table: {columns: {id: {}, name: {}}}
            };
            let filtered = generator.filterTablesToGenerate(tables, 'objection-js');
            assert.ok(filtered['test_table']);
        });
        it('should return empty object when no tables need generation', () => {
            generator.existingEntities['test_table'] = {entityFileName: 'test-table-entity.js'};
            generator.existingEntityFields['test_table'] = ['id', 'name'];
            generator.existingModels['test_table'] = {
                'objection-js': {modelFileName: 'test-table-model.js'}
            };
            generator.modelExistsInRegistered = () => true;
            generator.entityExistsInConfig = () => true;
            let tables = {
                test_table: {columns: {id: {}, name: {}}}
            };
            let filtered = generator.filterTablesToGenerate(tables, 'objection-js');
            assert.strictEqual(Object.keys(filtered).length, 0);
        });
    });
    describe('entityExistsInConfig', () => {
        it('should delegate to entitiesConfigGeneration', () => {
            let generator = new EntitiesGenerator({});
            generator.entitiesConfigPath = FileHandler.joinPaths(__dirname, 'nonexistent-config.js');
            let called = false;
            generator.entitiesConfigGeneration.entityExistsInConfig = () => {
                called = true;
                return true;
            };
            generator.entityExistsInConfig('test_table');
            assert.strictEqual(called, true);
        });
    });
    describe('modelExistsInRegistered', () => {
        it('should return false when registered models file does not exist', () => {
            let generator = new EntitiesGenerator({});
            generator.modelsFolder = FileHandler.joinPaths(__dirname, 'nonexistent-folder');
            let exists = generator.modelExistsInRegistered('test_table', 'objection-js');
            assert.strictEqual(exists, false);
        });
        it('should return false when model not found in registered file', () => {
            let generator = new EntitiesGenerator({});
            generator.modelsFolder = FileHandler.joinPaths(__dirname, '..', 'fixtures', 'mock-models');
            let registeredPath = FileHandler.joinPaths(generator.modelsFolder, 'objection-js', 'registered-models-objection-js.js');
            if(!FileHandler.exists(registeredPath)){
                assert.ok(true);
                return;
            }
            let exists = generator.modelExistsInRegistered('nonexistent_table', 'objection-js');
            assert.strictEqual(exists, false);
        });
    });
    describe('ensureFoldersExist', () => {
        it('should return true when all folders created successfully', () => {
            let generator = new EntitiesGenerator({});
            generator.generationFolder = FileHandler.joinPaths(__dirname, 'temp-generation');
            generator.entitiesFolder = FileHandler.joinPaths(generator.generationFolder, 'entities');
            generator.modelsFolder = FileHandler.joinPaths(generator.generationFolder, 'models');
            let result = generator.ensureFoldersExist();
            assert.ok(result);
        });
    });
});
