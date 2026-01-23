/**
 *
 * Reldens - EntityManager Test
 *
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { EntityManager } = require('../../lib/entity-manager');

describe('EntityManager', () => {
    let manager;
    beforeEach(() => {
        manager = new EntityManager({});
    });
    describe('constructor', () => {
        it('should initialize with empty entities object', () => {
            let emptyManager = new EntityManager({});
            assert.deepStrictEqual(emptyManager.entities, {});
        });
        it('should initialize with provided entities', () => {
            let initialEntities = {users: {}, posts: {}};
            let preloadedManager = new EntityManager({entities: initialEntities});
            assert.deepStrictEqual(preloadedManager.entities, initialEntities);
        });
    });
    describe('setEntities', () => {
        it('should set entities object', () => {
            let newEntities = {categories: {}, products: {}};
            manager.setEntities(newEntities);
            assert.deepStrictEqual(manager.entities, newEntities);
        });
    });
    describe('get', () => {
        it('should retrieve entity by key', () => {
            let mockEntity = {name: 'users'};
            manager.entities = {users: mockEntity};
            let result = manager.get('users');
            assert.strictEqual(result, mockEntity);
        });
        it('should return undefined for non-existent key', () => {
            let result = manager.get('nonexistent');
            assert.strictEqual(result, undefined);
        });
    });
    describe('add', () => {
        it('should add entity with key', () => {
            let mockEntity = {name: 'posts'};
            manager.add('posts', mockEntity);
            assert.strictEqual(manager.entities.posts, mockEntity);
        });
        it('should return the added entity', () => {
            let mockEntity = {name: 'comments'};
            let result = manager.add('comments', mockEntity);
            assert.strictEqual(result, mockEntity);
        });
        it('should overwrite existing entity with same key', () => {
            let firstEntity = {name: 'first'};
            let secondEntity = {name: 'second'};
            manager.add('test', firstEntity);
            manager.add('test', secondEntity);
            assert.strictEqual(manager.entities.test, secondEntity);
        });
    });
    describe('remove', () => {
        it('should remove entity by key', () => {
            manager.entities = {users: {}, posts: {}};
            manager.remove('users');
            assert.strictEqual(manager.entities.users, undefined);
            assert.ok(manager.entities.posts);
        });
        it('should not throw error when removing non-existent key', () => {
            assert.doesNotThrow(() => {
                manager.remove('nonexistent');
            });
        });
    });
    describe('clear', () => {
        it('should remove all entities', () => {
            manager.entities = {users: {}, posts: {}, comments: {}};
            manager.clear();
            assert.deepStrictEqual(manager.entities, {});
        });
    });
});
