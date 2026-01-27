/**
 *
 * Reldens - EntityManager Test
 *
 */

const { describe, it, beforeEach, after } = require('node:test');
const assert = require('node:assert');
const { EntityManager } = require('../../lib/entity-manager');

class EntityManagerTest
{

    run()
    {
        let counter = 0;
        let errors = 0;
        return new Promise((resolve) => {
            describe('EntityManager', () => {
            let manager;
            beforeEach(() => {
                manager = new EntityManager({});
            });
            describe('constructor', () => {
                it('should initialize with empty entities object', () => {
                    try {
                        let emptyManager = new EntityManager({});
                        assert.deepStrictEqual(emptyManager.entities, {});
                        counter++;
                    } catch(error) {
                        errors++;
                        throw error;
                    }
                });
                it('should initialize with provided entities', () => {
                    try {
                        let initialEntities = {users: {}, posts: {}};
                        let preloadedManager = new EntityManager({entities: initialEntities});
                        assert.deepStrictEqual(preloadedManager.entities, initialEntities);
                        counter++;
                    } catch(error) {
                        errors++;
                        throw error;
                    }
                });
            });
            describe('setEntities', () => {
                it('should set entities object', () => {
                    try {
                        let newEntities = {categories: {}, products: {}};
                        manager.setEntities(newEntities);
                        assert.deepStrictEqual(manager.entities, newEntities);
                        counter++;
                    } catch(error) {
                        errors++;
                        throw error;
                    }
                });
            });
            describe('get', () => {
                it('should retrieve entity by key', () => {
                    try {
                        let mockEntity = {name: 'users'};
                        manager.entities = {users: mockEntity};
                        let result = manager.get('users');
                        assert.strictEqual(result, mockEntity);
                        counter++;
                    } catch(error) {
                        errors++;
                        throw error;
                    }
                });
                it('should return undefined for non-existent key', () => {
                    try {
                        let result = manager.get('nonexistent');
                        assert.strictEqual(result, undefined);
                        counter++;
                    } catch(error) {
                        errors++;
                        throw error;
                    }
                });
            });
            describe('add', () => {
                it('should add entity with key', () => {
                    try {
                        let mockEntity = {name: 'posts'};
                        manager.add('posts', mockEntity);
                        assert.strictEqual(manager.entities.posts, mockEntity);
                        counter++;
                    } catch(error) {
                        errors++;
                        throw error;
                    }
                });
                it('should return the added entity', () => {
                    try {
                        let mockEntity = {name: 'comments'};
                        let result = manager.add('comments', mockEntity);
                        assert.strictEqual(result, mockEntity);
                        counter++;
                    } catch(error) {
                        errors++;
                        throw error;
                    }
                });
                it('should overwrite existing entity with same key', () => {
                    try {
                        let firstEntity = {name: 'first'};
                        let secondEntity = {name: 'second'};
                        manager.add('test', firstEntity);
                        manager.add('test', secondEntity);
                        assert.strictEqual(manager.entities.test, secondEntity);
                        counter++;
                    } catch(error) {
                        errors++;
                        throw error;
                    }
                });
            });
            describe('remove', () => {
                it('should remove entity by key', () => {
                    try {
                        manager.entities = {users: {}, posts: {}};
                        manager.remove('users');
                        assert.strictEqual(manager.entities.users, undefined);
                        assert.ok(manager.entities.posts);
                        counter++;
                    } catch(error) {
                        errors++;
                        throw error;
                    }
                });
                it('should not throw error when removing non-existent key', () => {
                    try {
                        assert.doesNotThrow(() => {
                            manager.remove('nonexistent');
                        });
                        counter++;
                    } catch(error) {
                        errors++;
                        throw error;
                    }
                });
            });
            describe('clear', () => {
                it('should remove all entities', () => {
                    try {
                        manager.entities = {users: {}, posts: {}, comments: {}};
                        manager.clear();
                        assert.deepStrictEqual(manager.entities, {});
                        counter++;
                    } catch(error) {
                        errors++;
                        throw error;
                    }
                });
            });
            after(() => {
                resolve({counter, errors});
            });
        });
        });
    }

}

module.exports = EntityManagerTest;
