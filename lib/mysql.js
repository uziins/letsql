const mysql = require('mysql2');

// Using connection pool to handle timeout and disconnection issues
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

let keepAliveInterval = null;

pool.on('connection', function (connection) {
    connection.query("SET SESSION wait_timeout = 28800");
    connection.query("SET SESSION interactive_timeout = 28800");
});

pool.on('error', function(err) {
    console.error('MySQL Pool Error:', err);
});

const retryQuery = async (queryStr, bindings = [], maxRetries = 3, delay = 1000) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await new Promise((resolve, reject) => {
                pool.query(queryStr, bindings, function (err, result) {
                    if (err) {
                        return reject(err);
                    }
                    resolve(result);
                });
            });
        } catch (err) {
            const isConnectionError = (
                err.code === 'PROTOCOL_CONNECTION_LOST' ||
                err.code === 'ECONNRESET' ||
                err.code === 'ETIMEDOUT' ||
                err.code === 'ENOTFOUND' ||
                err.code === 'ECONNREFUSED' ||
                err.code === 4031 ||
                err.errno === 2013 ||
                err.errno === 2006
            );

            if (!isConnectionError || attempt >= maxRetries) {
                throw err;
            }

            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
        }
    }
};

const query = async (queryStr, bindings = []) => {
    try {
        return await retryQuery(queryStr, bindings);
    } catch (err) {
        const isConnectionError = (
            err.code === 'PROTOCOL_CONNECTION_LOST' ||
            err.code === 'ECONNRESET' ||
            err.code === 'ETIMEDOUT' ||
            err.code === 'ENOTFOUND' ||
            err.code === 'ECONNREFUSED' ||
            err.code === 4031 ||
            err.errno === 2013 ||
            err.errno === 2006
        );

        if (isConnectionError) {
            console.error('Final query error after retries:', err);
        }

        throw err;
    }
};

const testConnection = async () => {
    try {
        await query('SELECT 1');
        return true;
    } catch (err) {
        console.error('Database connection test failed:', err.message);
        return false;
    }
};

const startKeepAlive = () => {
    if (keepAliveInterval) {
        return;
    }

    keepAliveInterval = setInterval(async () => {
        try {
            await query('SELECT 1');
        } catch (err) {
            console.error('Keep-alive query failed:', err.message);
        }
    }, 300000);
};

// Function to stop keep-alive
const stopKeepAlive = () => {
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
    }
};

// Function to close pool with graceful shutdown
const closePool = () => {
    return new Promise((resolve) => {
        stopKeepAlive();
        pool.end(() => {
            resolve();
        });
    });
};

const healthCheck = async () => {
    const health = {
        status: 'unknown',
        database: {
            connected: false,
            responseTime: null,
            error: null
        },
        pool: {
            totalConnections: pool._allConnections ? pool._allConnections.length : 0,
            freeConnections: pool._freeConnections ? pool._freeConnections.length : 0,
            acquiringConnections: pool._acquiringConnections ? pool._acquiringConnections.length : 0,
            connectionLimit: pool.config.connectionLimit
        },
        keepAlive: {
            running: keepAliveInterval !== null,
            intervalId: keepAliveInterval
        },
        timestamp: new Date().toISOString()
    };

    try {
        const startTime = Date.now();
        await query('SELECT 1 as health_check, NOW() as server_time');
        const responseTime = Date.now() - startTime;

        health.database.connected = true;
        health.database.responseTime = responseTime;
        health.status = 'healthy';

        if (responseTime > 5000) {
            health.status = 'slow';
        } else if (responseTime > 1000) {
            health.status = 'warning';
        }

    } catch (err) {
        health.database.connected = false;
        health.database.error = err.message;
        health.status = 'unhealthy';
        console.error('Health check failed:', err.message);
    }

    return health;
};

// Simple function for test compatibility (returns boolean)
const isHealthy = async () => {
    try {
        await query('SELECT 1');
        return true;
    } catch (err) {
        console.error('Health check failed:', err.message);
        return false;
    }
};

// Auto-start keep-alive when module is loaded
startKeepAlive();

module.exports = {
    query,
    closePool,
    testConnection,
    healthCheck,
    isHealthy,
    startKeepAlive,
    stopKeepAlive,
    pool
};
