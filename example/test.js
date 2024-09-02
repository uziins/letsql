require('dotenv').config();
const Users = require('./models/users');

const User = new Users();

(async () => {
    // check table users
    let table = await User.rawQuery('SHOW TABLES LIKE "users"');
    if (table.length === 0) {
        console.log('Creating table users')
        await User.rawQuery('CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY, full_name VARCHAR(255), email VARCHAR(255), password VARCHAR(255), phone VARCHAR(255), username VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP);')
    }

    await User.insert({
        full_name: 'Jane Doe',
        email: 'jane@doe.com',
        password: 'password',
        phone: '123456789',
        username: 'jane_doe',
        data: {
            'address': '123 Main St',
            'city': 'New York',
            'has_car': true
        }
    })

    const users = await User.select('username,email').get();
    console.log(users);

    // console.log(await User.find(1));
    // console.log(await User.paginate());


    // console.log(await User.where('id', 2).update({
    //     full_name: 'Jane Doe Updated',
    // }));

    console.log(await User.select('count(id) as total', 'phone').groupBy('phone').get());

    process.exit()
})();