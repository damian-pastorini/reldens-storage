const { ObjectionJsDataServer } = require('../lib/objection-js/objection-js-data-server');

const { Model } = require('objection');

class UsersModel extends Model
{

    static get tableName()
    {
        return 'your_table_name';
    }

}

async function test(){
    const entityKey = 'users';

    let server = new ObjectionJsDataServer({
        client: 'mysql',
        config: {
            user: 'user',
            password: 'password',
            database: 'database_name',
            port : 3306,
        },
        rawEntities: {[entityKey]: UsersModel}
    });

    await server.connect();
    await server.generateEntities();

    console.log(await server.getEntity(entityKey).loadAll());

    process.exit();
}

test();
