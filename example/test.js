require('dotenv').config();
const Users = require('./models/users');

const User = new Users();

const test = async () => {
    let user = await User.first();
    console.log(user);
    process.exit()
}

test();