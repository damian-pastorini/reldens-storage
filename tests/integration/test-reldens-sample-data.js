/**
 *
 * Reldens - Reldens Sample Data Test
 * Runs the relation assertions against the real Reldens database: the schema from reldens-install-v4.0.0.sql
 * and the rows inserted by reldens-basic-config-v4.0.0.sql and reldens-sample-data-v4.0.0.sql. Every expected
 * count below is the amount of rows those files insert, so the assertions describe the shipped sample data.
 *
 */

const { TestRunner, assert } = require('../utils/test-runner');
const { ReldensSchemaLoader } = require('../utils/reldens-schema-loader');
const { ObservedValue } = require('../utils/observed-value');

class ReldensSampleDataTest
{

    constructor(dataServer, repos, driverName)
    {
        this.driverName = driverName;
        this.runner = new TestRunner();
        this.dataServer = false;
        this.repos = {};
        this.entityNames = ['itemsItem', 'skillsClassPath', 'rooms', 'playersState'];
        this.itemRelationCases = {
            'the coins requirements from the required item foreign key':
                {itemId: 1, relationKey: 'related_objects_items_requirements_required_item_key', expectedRows: 4},
            'the coins rewards from the reward item foreign key':
                {itemId: 1, relationKey: 'related_objects_items_rewards_reward_item_key', expectedRows: 5},
            'no coins requirement from the item foreign key':
                {itemId: 1, relationKey: 'related_objects_items_requirements_item_key', expectedRows: 0},
            'the axe requirement from the item foreign key':
                {itemId: 4, relationKey: 'related_objects_items_requirements_item_key', expectedRows: 1},
            'no axe requirement from the required item foreign key':
                {itemId: 4, relationKey: 'related_objects_items_requirements_required_item_key', expectedRows: 0},
            'the axe reward from the item foreign key':
                {itemId: 4, relationKey: 'related_objects_items_rewards_item_key', expectedRows: 1}
        };
        this.levelsSetKey = 'related_skills_levels_set';
        this.levelsKey = 'related_skills_levels';
        this.levelsModifiersKey = 'related_skills_levels_modifiers';
        this.changePointsKey = 'related_rooms_change_points_room';
        this.nextRoomKey = 'related_rooms_next_room';
        this.skillsLevelsChain = this.levelsSetKey+'.'+this.levelsKey+'.'+this.levelsModifiersKey;
        this.changePointsChain = this.changePointsKey+'.'+this.nextRoomKey;
        this.journeymanClassPathId = 1;
        this.journeymanLevelsSetId = 1;
        this.journeymanLevelsRows = 4;
        this.journeymanModifiersByLevelId = {1: 0, 2: 8, 3: 8, 4: 8};
        this.botsForestRoomId = 9;
        this.botsForestChangePointsRows = 1;
        this.botsForestNextRoomId = 10;
        this.botsForestNextRoomName = 'reldens-bots-forest-house-01-n0';
        this.playersStateId = 1;
        this.playersStatePlayerId = 1;
        this.playersStateRoomId = 5;
    }

    async run()
    {
        this.runner.suite('Reldens Sample Data - Driver: '+this.driverName);
        if(!ReldensSchemaLoader.isAvailable()){
            return this.runner.fail(
                'reldens migrations must be available for '+this.driverName,
                'RELDENS_TEST_MIGRATIONS_PATH does not point to a folder containing the reldens migrations.'
            );
        }
        this.dataServer = await ReldensSchemaLoader.setup(this.driverName);
        if(!this.dataServer){
            return this.runner.fail(
                'reldens sample data server must connect for '+this.driverName,
                'The '+this.driverName+' data server could not be set up.'
            );
        }
        for(let entityName of this.entityNames){
            this.repos[entityName] = this.dataServer.getEntity(entityName);
        }
        try {
            await this.testGeneratedRepositories();
            await this.testItemsItemSameTableForeignKeys();
            await this.testSkillsClassPathLevelsChain();
            await this.testRoomsChangePointsNestedRoom();
            await this.testForeignKeyScalarWithoutRelations();
        } finally {
            await ReldensSchemaLoader.teardown(this.dataServer);
        }
        return this.runner.getResults();
    }

    clearedRepo(entityName)
    {
        if(this.dataServer.orm && this.dataServer.orm.em){
            this.dataServer.orm.em.clear();
        }
        return this.repos[entityName];
    }

    assertRelationRows(record, relationKey, expectedRows, label)
    {
        let related = record[relationKey];
        ObservedValue.log(label+'.'+relationKey, related);
        assert.ok(
            Array.isArray(related),
            label+'.'+relationKey+' is not an array, observed: '+ObservedValue.describe(related)
        );
        assert.strictEqual(
            related.length,
            expectedRows,
            label+'.'+relationKey+' rows observed: '+related.length+' - expected: '+expectedRows
        );
        return related;
    }

    async testGeneratedRepositories()
    {
        this.runner.group('Reldens Schema Repositories');
        await this.runner.test('should expose a repository for every asserted entity', async () => {
            for(let entityName of this.entityNames){
                assert.ok(this.repos[entityName], 'entity "'+entityName+'" missing from the reldens schema');
            }
        });
    }

    async testItemsItemSameTableForeignKeys()
    {
        this.runner.group('Items Item Two Foreign Keys To The Same Table');
        for(let caseName of Object.keys(this.itemRelationCases)){
            let testCase = this.itemRelationCases[caseName];
            await this.runner.test('should return '+caseName, async () => {
                let record = await this.clearedRepo('itemsItem').loadByIdWithRelations(
                    testCase.itemId,
                    [testCase.relationKey]
                );
                assert.ok(record, 'items_item '+testCase.itemId+' not loaded: '+ObservedValue.describe(record));
                this.assertRelationRows(record, testCase.relationKey, testCase.expectedRows, caseName);
            });
        }
    }

    async testSkillsClassPathLevelsChain()
    {
        this.runner.group('Skills Class Path Levels Chain');
        await this.runner.test('should load the levels set with every level of the journeyman path', async () => {
            let record = await this.clearedRepo('skillsClassPath').loadByIdWithRelations(
                this.journeymanClassPathId,
                [this.skillsLevelsChain]
            );
            assert.ok(record, 'journeyman class path not loaded: '+ObservedValue.describe(record));
            let levelsSet = record[this.levelsSetKey];
            ObservedValue.log('journeyman.'+this.levelsSetKey, levelsSet);
            assert.strictEqual(
                'object',
                typeof levelsSet,
                'the levels set was not populated, observed: '+ObservedValue.describe(levelsSet)
            );
            assert.strictEqual(
                Number(levelsSet.id),
                this.journeymanLevelsSetId,
                'the levels set id observed: '+ObservedValue.describe(levelsSet.id)
            );
            this.assertRelationRows(levelsSet, this.levelsKey, this.journeymanLevelsRows, 'journeyman levels set');
        });
        await this.runner.test('should load the modifiers of every journeyman level', async () => {
            let record = await this.clearedRepo('skillsClassPath').loadByIdWithRelations(
                this.journeymanClassPathId,
                [this.skillsLevelsChain]
            );
            assert.ok(record, 'journeyman class path not loaded: '+ObservedValue.describe(record));
            let levels = this.assertRelationRows(
                record[this.levelsSetKey],
                this.levelsKey,
                this.journeymanLevelsRows,
                'journeyman levels set'
            );
            for(let level of levels){
                this.assertRelationRows(
                    level,
                    this.levelsModifiersKey,
                    this.journeymanModifiersByLevelId[level.id],
                    'journeyman level '+level.id
                );
            }
        });
    }

    async testRoomsChangePointsNestedRoom()
    {
        this.runner.group('Rooms Change Points Nested Room');
        await this.runner.test('should load the change points of the bots forest room', async () => {
            let record = await this.clearedRepo('rooms').loadByIdWithRelations(
                this.botsForestRoomId,
                [this.changePointsChain]
            );
            assert.ok(record, 'bots forest room not loaded: '+ObservedValue.describe(record));
            this.assertRelationRows(record, this.changePointsKey, this.botsForestChangePointsRows, 'bots forest');
        });
        await this.runner.test('should load the change point next room as an entity', async () => {
            let record = await this.clearedRepo('rooms').loadByIdWithRelations(
                this.botsForestRoomId,
                [this.changePointsChain]
            );
            assert.ok(record, 'bots forest room not loaded: '+ObservedValue.describe(record));
            let changePoints = this.assertRelationRows(
                record,
                this.changePointsKey,
                this.botsForestChangePointsRows,
                'bots forest'
            );
            let nextRoom = [...changePoints].shift()[this.nextRoomKey];
            ObservedValue.log('bots forest change point.'+this.nextRoomKey, nextRoom);
            assert.strictEqual(
                'object',
                typeof nextRoom,
                'the next room was not populated, observed: '+ObservedValue.describe(nextRoom)
            );
            assert.strictEqual(
                Number(nextRoom.id),
                this.botsForestNextRoomId,
                'the next room id observed: '+ObservedValue.describe(nextRoom.id)
            );
            assert.strictEqual(
                nextRoom.name,
                this.botsForestNextRoomName,
                'the next room name observed: '+ObservedValue.describe(nextRoom.name)
            );
        });
    }

    async testForeignKeyScalarWithoutRelations()
    {
        this.runner.group('Foreign Key Scalar Without Relations');
        await this.runner.test('should return the players state room id as a scalar', async () => {
            let record = await this.clearedRepo('playersState').loadById(this.playersStateId);
            assert.ok(record, 'players state row not loaded: '+ObservedValue.describe(record));
            ObservedValue.log('players state room_id', record.room_id);
            assert.notStrictEqual(
                'object',
                typeof record.room_id,
                'the room_id was hydrated as an entity, observed: '+ObservedValue.describe(record.room_id)
            );
            assert.strictEqual(
                Number(record.room_id),
                this.playersStateRoomId,
                'the room_id observed: '+ObservedValue.describe(record.room_id)
            );
            assert.strictEqual(
                Number(record.player_id),
                this.playersStatePlayerId,
                'the player_id observed: '+ObservedValue.describe(record.player_id)
            );
        });
    }

}

module.exports = ReldensSampleDataTest;
