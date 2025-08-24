const mysql = require('mysql2/promise');
const configDb = require('./database');

// Pool object (will hold the mysql2 pool instance)
let pool = null;

// Helper: sleep for ms milliseconds (used between retries)
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Create a new pool with safe defaults. We try to keep options simple so beginners
// can follow. We avoid passing unsupported options (like acquireTimeout) directly.
function createPool() {
    const options = Object.assign({}, configDb, {
        connectTimeout: configDb.connectTimeout || 10000, // 10s connect timeout
        waitForConnections: typeof configDb.waitForConnections !== 'undefined' ? configDb.waitForConnections : true,
        connectionLimit: configDb.connectionLimit || 10,
    });

    pool = mysql.createPool(options);
    // Small informational log so it's obvious when a pool is created
    console.log('Database pool created');
}

// Create the pool at module load so other modules can request connections.
createPool();

// Decide which errors are worth retrying. These are usually network/socket errors.
function isRetryableError(err) {
    if (!err || !err.code) return false;
    const retryable = [
        'PROTOCOL_CONNECTION_LOST',
        'ECONNRESET',
        'ETIMEDOUT',
        'ECONNREFUSED',
        'ENOTFOUND',
        'EHOSTUNREACH',
    ];
    return retryable.includes(err.code);
}

// getConnection: returns a validated connection from the pool.
// If a transient error happens (ETIMEDOUT etc.) we will retry a few times.
// options: { retries: number, delay: ms }
async function getConnection(options = {}) {
    const retries = typeof options.retries === 'number' ? options.retries : 3;
    const delay = typeof options.delay === 'number' ? options.delay : 2000;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            if (!pool) createPool();

            const connection = await pool.getConnection();

            // Quick validation: run a tiny query to make sure socket is alive.
            // If it fails, we release the connection and throw to trigger retry logic.
            try {
                await connection.query('SELECT 1');
            } catch (validationError) {
                try { connection.release(); } catch (e) { /* ignore release error */ }
                throw validationError;
            }

            // Connection seems valid
            return connection;
        } catch (err) {
            // Log the failure so it's easier to debug for beginners
            console.error(`DB getConnection attempt ${attempt} failed:`, err.code || err.message);

            // If this error looks transient and we still have attempts left, try to
            // recreate the pool and retry after a short delay.
            if (isRetryableError(err) && attempt < retries) {
                try {
                    if (pool && pool.end) {
                        // try to close existing pool; ignore errors here
                        await pool.end();
                    }
                } catch (closeErr) {
                    // ignore
                }
                pool = null; // ensure createPool will make a fresh pool
                createPool();
                await sleep(delay);
                continue; // next attempt
            }

            // Not retryable or out of attempts: rethrow to caller
            throw err;
        }
    }
}

// endPool: close the pool (useful for graceful shutdown in tests or scripts)
async function endPool() {
    if (pool && pool.end) {
        await pool.end();
        pool = null;
    }
}

// Log unhandled rejections so beginners can see stack traces instead of silent crashes
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = {
    // function that user code calls to get a connection
    getConnection,
    // helper to gracefully stop pool
    endPool,
    // expose pool for debugging/testing (not required in normal use)
    _getPool: () => pool,
};