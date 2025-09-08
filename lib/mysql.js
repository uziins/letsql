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

// Variable to store interval ID
let keepAliveInterval = null;

// Event listener for monitoring pool
pool.on('connection', function (connection) {
    console.log('New MySQL connection established as id ' + connection.threadId);

    // Set session timeout for this connection
    connection.query("SET SESSION wait_timeout = 28800");
    connection.query("SET SESSION interactive_timeout = 28800");
});

pool.on('error', function(err) {
    console.log('MySQL Pool Error:', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('Connection lost, pool will handle reconnection automatically');
    }
});

// Function to retry query with exponential backoff
const retryQuery = async (queryStr, bindings = [], maxRetries = 3, delay = 1000) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await new Promise((resolve, reject) => {
                pool.execute(queryStr, bindings, function (err, result) {
                    if (err) {
                        return reject(err);
                    }
                    resolve(result);
                });
            });
        } catch (err) {
            // Only retry for connection-related errors
            const isConnectionError = (
                err.code === 'PROTOCOL_CONNECTION_LOST' ||
                err.code === 'ECONNRESET' ||
                err.code === 'ETIMEDOUT' ||
                err.code === 'ENOTFOUND' ||
                err.code === 'ECONNREFUSED' ||
                err.code === 4031 ||
                err.errno === 2013 || // Lost connection to MySQL server during query
                err.errno === 2006    // MySQL server has gone away
            );

            // If not a connection error or already reached max retry, throw immediately
            if (!isConnectionError || attempt >= maxRetries) {
                throw err;
            }

            console.log(`Query attempt ${attempt} failed (connection error):`, err.message);
            console.log(`Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
        }
    }
};

const query = async (queryStr, bindings = []) => {
    try {
        return await retryQuery(queryStr, bindings);
    } catch (err) {
        // Only log error if this is a connection error that has been retried
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

        // Only log if connection error (since it has been retried)
        if (isConnectionError) {
            console.log('Final query error after retries:', err);
        }

        throw err;
    }
};

// Function to test connection
const testConnection = async () => {
    try {
        await query('SELECT 1');
        console.log('Database connection test successful');
        return true;
    } catch (err) {
        console.log('Database connection test failed:', err.message);
        return false;
    }
};

// Function to start keep-alive
const startKeepAlive = () => {
    if (keepAliveInterval) {
        console.log('Keep-alive already running');
        return;
    }

    keepAliveInterval = setInterval(async () => {
        try {
            await query('SELECT 1');
            console.log('Keep-alive query successful');
        } catch (err) {
            console.log('Keep-alive query failed:', err.message);
        }
    }, 300000); // Every 5 minutes

    console.log('Keep-alive started (every 5 minutes)');
};

// Function to stop keep-alive
const stopKeepAlive = () => {
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
        console.log('Keep-alive stopped');
    } else {
        console.log('Keep-alive is not running');
    }
};

// Function to close pool with graceful shutdown
const closePool = () => {
    return new Promise((resolve) => {
        // Stop keep-alive first
        stopKeepAlive();

        pool.end(() => {
            console.log('MySQL pool closed');
            resolve();
        });
    });
};

// Function for comprehensive health check
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

        // Additional check for response time
        if (responseTime > 5000) {
            health.status = 'slow';
        } else if (responseTime > 1000) {
            health.status = 'warning';
        }

    } catch (err) {
        health.database.connected = false;
        health.database.error = err.message;
        health.status = 'unhealthy';

        console.log('Health check failed:', err.message);
    }

    return health;
};

// Simple function for test compatibility (returns boolean)
const isHealthy = async () => {
    try {
        await query('SELECT 1');
        return true;
    } catch (err) {
        console.log('Health check failed:', err.message);
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
