require('dotenv').config();
const Users = require('./models/users');

const User = new Users();

(async () => {
    const users = await User.select('username,email').get();
    // console.log(users);

    // console.log(await User.find(1));
    // console.log(await User.paginate());

    // let insert = await User.insert({
    //     full_name: 'Jane Doe',
    //     email: 'jane@doe.com',
    //     password: 'password',
    //     phone: '123456789',
    //     username: 'jane_doe',
    // })
    // console.log(insert);

    // console.log(await User.where('id', 2).update({
    //     full_name: 'Jane Doe Updated',
    // }));

    console.log(await User.select('count(id) as total', 'phone').groupBy('phone').get());

    process.exit()
})();