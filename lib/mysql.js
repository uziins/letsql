const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
});

if (connection.state === 'disconnected') {
    connection.connect(function(err) {
        if (err) throw err;
        console.log("MySQL Connected!");
    });
}

connection.on('error', function(err) {
    console.log('db error', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') {
        setTimeout(() => {
            connection.connect(function(err) {
                if (err) throw err;
                console.log("MySQL Connected!");
            });
        }, 2000);
    } else {
        throw err;
    }
});

const query = async (query, bindings = []) => {
    return new Promise((resolve, reject) => {
        connection.query(query, bindings, function (err, result) {
            if (err) return reject(err);
            resolve(result);
        });
    });
}

module.exports = {
    query
}