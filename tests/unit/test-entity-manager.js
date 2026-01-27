/**
 *
 * Reldens - EntityManager Test
 *
 */

const { TestRunner, assert } = require('../utils/test-runner');
const { EntityManager } = require('../../lib/entity-manager');

class EntityManagerTest
{

    constructor()
    {
        this.runner = new TestRunner();
    }

    async run()
    {
        this.runner.suite('EntityManager');
        await this.testConstructor();
        await this.testSetEntities();
        await this.testGet();
        await this.testAdd();
        await this.testRemove();
        await this.testClear();
        return this.runner.getResults();
    }

    async testConstructor()
    {
        this.runner.group('constructor');
        await this.runner.test('should initialize with empty entities object', async () => {
            let emptyManager = new EntityManager({});
            assert.deepStrictEqual(emptyManager.entities, {});
        });
        await this.runner.test('should initialize with provided entities', async () => {
            let initialEntities = {users: {}, posts: {}};
            let preloadedManager = new EntityManager({entities: initialEntities});
            assert.deepStrictEqual(preloadedManager.entities, initialEntities);
        });
    }

    async testSetEntities()
    {
        this.runner.group('setEntities');
        await this.runner.test('should set entities object', async () => {
            let manager = new EntityManager({});
            let newEntities = {categories: {}, products: {}};
            manager.setEntities(newEntities);
            assert.deepStrictEqual(manager.entities, newEntities);
        });
    }

    async testGet()
    {
        this.runner.group('get');
        await this.runner.test('should retrieve entity by key', async () => {
            let manager = new EntityManager({});
            let mockEntity = {name: 'users'};
            manager.entities = {users: mockEntity};
            let result = manager.get('users');
            assert.strictEqual(result, mockEntity);
        });
        await this.runner.test('should return undefined for non-existent key', async () => {
            let manager = new EntityManager({});
            let result = manager.get('nonexistent');
            assert.strictEqual(result, undefined);
        });
    }

    async testAdd()
    {
        this.runner.group('add');
        await this.runner.test('should add entity with key', async () => {
            let manager = new EntityManager({});
            let mockEntity = {name: 'posts'};
            manager.add('posts', mockEntity);
            assert.strictEqual(manager.entities.posts, mockEntity);
        });
        await this.runner.test('should return the added entity', async () => {
            let manager = new EntityManager({});
            let mockEntity = {name: 'comments'};
            let result = manager.add('comments', mockEntity);
            assert.strictEqual(result, mockEntity);
        });
        await this.runner.test('should overwrite existing entity with same key', async () => {
            let manager = new EntityManager({});
            let firstEntity = {name: 'first'};
            let secondEntity = {name: 'second'};
            manager.add('test', firstEntity);
            manager.add('test', secondEntity);
            assert.strictEqual(manager.entities.test, secondEntity);
        });
    }

    async testRemove()
    {
        this.runner.group('remove');
        await this.runner.test('should remove entity by key', async () => {
            let manager = new EntityManager({});
            manager.entities = {users: {}, posts: {}};
            manager.remove('users');
            assert.strictEqual(manager.entities.users, undefined);
            assert.ok(manager.entities.posts);
        });
        await this.runner.test('should not throw error when removing non-existent key', async () => {
            let manager = new EntityManager({});
            assert.doesNotThrow(() => {
                manager.remove('nonexistent');
            });
        });
    }

    async testClear()
    {
        this.runner.group('clear');
        await this.runner.test('should remove all entities', async () => {
            let manager = new EntityManager({});
            manager.entities = {users: {}, posts: {}, comments: {}};
            manager.clear();
            assert.deepStrictEqual(manager.entities, {});
        });
    }

}

module.exports = EntityManagerTest;
