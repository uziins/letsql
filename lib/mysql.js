const mysql = require('mysql');

global.sql = {};
global.sql.conn = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
});

if (sql.conn.state === 'disconnected') {
    sql.conn.connect(function(err) {
        if (err) throw err;
        console.log("MySQL Connected!");
    });
}

sql.conn.on('error', function(err) {
    console.log('db error', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') {
        setTimeout(() => {
            sql.conn.connect(function(err) {
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
        sql.conn.query(query, bindings, function (err, result) {
            if (err) throw err;
            resolve(result);
        });
    });
}

module.exports = {
    query
}