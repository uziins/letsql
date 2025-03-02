require('dotenv').config();
const Users = require('./models/users');
const Chats = require('./models/chats');
const Products = require('./models/products');

const User = new Users();
const Chat = new Chats();
const Product = new Products();

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

    console.log('User', await User.find(1));
    // console.log(await User.paginate());


    // console.log(await User.where('id', 2).update({
    //     full_name: 'Jane Doe Updated',
    // }));

    // console.log(await User.select('count(id) as total', 'phone').groupBy('phone').get());

    // check table products
    let tableProduct = await User.rawQuery('SHOW TABLES LIKE "products"');
    if (tableProduct.length === 0) {
        console.log('Creating table products')
        await User.rawQuery('create table products (id BIGINT PRIMARY KEY, name VARCHAR(255), price DECIMAL(10,2), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP);')
    }
    let productData = {
        id: 1,
        name: 'Product 1',
        price: 100
    }
    await Product.insertIgnore(productData);
    await Product.insertIgnore(productData);
    console.log('Product', await Product.find(1));
    productData.name = 'Product 1 Updated';
    await Product.insertOrUpdate(productData);
    console.log('Product', await Product.find(1));

    process.exit()
})();