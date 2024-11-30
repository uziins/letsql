require('dotenv').config();
const Users = require('./models/users');
const Chats = require('./models/chats');

const User = new Users();
const Chat = new Chats();

(async () => {
    // check table users
    let table = await User.rawQuery('SHOW TABLES LIKE "users"');
    if (table.length === 0) {
        console.log('Creating table users')
        await User.rawQuery('CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY, full_name VARCHAR(255), email VARCHAR(255), password VARCHAR(255), phone VARCHAR(255), username VARCHAR(255), data JSON, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP);')
    }

    // await User.insert({
    //     full_name: 'Jane Doe',
    //     email: 'jane@doe.com',
    //     password: 'password',
    //     phone: '123456789',
    //     username: 'jane_doe',
    //     data: {
    //         'address': '123 Main St',
    //         'city': 'New York',
    //         'has_car': true
    //     }
    // })

    let tableChat = await Chat.rawQuery('SHOW TABLES LIKE "chats"');
    if (tableChat.length === 0) {
        console.log('Creating table chats')
        await Chat.rawQuery('create table chats (uuid varchar(255) not null primary key, user_id bigint unsigned null, message text null);')
    }
    let insertChat = Chat.insert({
        user_id: 1,
        message: 'Hello World!'
    })
    console.log(await insertChat)

    // const users = await User.select('username,email').get();
    // console.log(users);

    console.log(await User.find(1));
    // console.log(await User.paginate());


    // console.log(await User.where('id', 2).update({
    //     full_name: 'Jane Doe Updated',
    // }));

    // console.log(await User.select('count(id) as total', 'phone').groupBy('phone').get());

    process.exit()
})();