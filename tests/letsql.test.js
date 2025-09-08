require('dotenv').config();
const { query, healthCheck, isHealthy, closePool, stopKeepAlive } = require('../lib/mysql');

describe('LetsSQL Library Tests', () => {
    let TestUser, TestPost;

    beforeAll(async () => {
        // Setup test models
        TestUser = require('./models/test-user');
        TestPost = require('./models/test-post');

        // Setup test tables
        await setupTestTables();
    });

    afterAll(async () => {
        // Stop keep-alive interval first
        stopKeepAlive();

        // Cleanup test tables
        try {
            await query('DROP TABLE IF EXISTS test_posts');
            await query('DROP TABLE IF EXISTS test_users');
        } catch (error) {
            console.warn('Cleanup warning:', error.message);
        }
        
        // Close database connections
        await closePool();
    });

    describe('Database Connection', () => {
        test('should have healthy database connection', async () => {
            const healthy = await isHealthy();
            expect(healthy).toBe(true);
        });

        test('should get detailed health check', async () => {
            const health = await healthCheck();
            expect(health).toHaveProperty('status');
            expect(health).toHaveProperty('database');
            expect(health).toHaveProperty('pool');
            expect(health).toHaveProperty('keepAlive');
            expect(health.database.connected).toBe(true);
            expect(['healthy', 'warning', 'slow']).toContain(health.status);
        });

        test('should execute raw queries', async () => {
            const result = await query('SELECT 1 as test');
            expect(result).toHaveLength(1);
            expect(result[0].test).toBe(1);
        });

        test('should handle connection errors gracefully', async () => {
            // Test with invalid query
            await expect(query('INVALID SQL QUERY')).rejects.toThrow();
        });
    });

    describe('Model CRUD Operations', () => {
        let user, insertedUserId;

        beforeEach(() => {
            user = new TestUser();
        });

        test('should insert a new record', async () => {
            const userData = {
                name: 'John Doe',
                email: 'john@test.com',
                age: 30,
                data: { hobby: 'coding', city: 'Jakarta' }
            };

            const result = await user.insert(userData);
            
            expect(result.affectedRows).toBe(1);
            expect(result.insertId).toBeGreaterThan(0);
            insertedUserId = result.insertId;
        });

        test('should find record by ID', async () => {
            const foundUser = await user.find(insertedUserId);
            
            expect(foundUser).toBeTruthy();
            expect(foundUser.name).toBe('John Doe');
            expect(foundUser.email).toBe('john@test.com');
            expect(foundUser.age).toBe(30);
            expect(foundUser.data).toEqual({ hobby: 'coding', city: 'Jakarta' });
        });

        test('should get all records', async () => {
            // Insert another user
            await user.insert({
                name: 'Jane Doe',
                email: 'jane@test.com',
                age: 25
            });

            const users = await user.get();
            expect(users.length).toBeGreaterThanOrEqual(2);
        });

        test('should update record', async () => {
            const updateResult = await user.where('id', insertedUserId).update({
                name: 'John Updated',
                age: 31
            });

            expect(updateResult.affectedRows).toBe(1);

            const updatedUser = await user.find(insertedUserId);
            expect(updatedUser.name).toBe('John Updated');
            expect(updatedUser.age).toBe(31);
        });

        test('should count records', async () => {
            const count = await user.count();
            expect(count).toBeGreaterThanOrEqual(2);
        });

        test('should delete record (soft delete)', async () => {
            const deleteResult = await user.where('id', insertedUserId).delete();
            expect(deleteResult.affectedRows).toBe(1);

            // Should not find deleted record in normal query
            const deletedUser = await user.find(insertedUserId);
            expect(deletedUser).toBeNull();

            // Should find with withTrashed
            const trashedUser = await user.withTrashed().find(insertedUserId);
            expect(trashedUser).toBeTruthy();
            expect(trashedUser.deleted_at).toBeTruthy();
        });
    });

    describe('Query Builder', () => {
        let user;

        beforeAll(async () => {
            user = new TestUser();
            
            // Insert test data
            await user.insert({ name: 'Alice', email: 'alice@test.com', age: 28 });
            await user.insert({ name: 'Bob', email: 'bob@test.com', age: 35 });
            await user.insert({ name: 'Charlie', email: 'charlie@test.com', age: 22 });
        });

        beforeEach(() => {
            user = new TestUser();
        });

        test('should find by primary key', async () => {
            const firstUser = await user.first();
            const result = await user.find(firstUser.id);
            expect(result).toBeTruthy();
            expect(result.id).toBe(firstUser.id);
        });

        test('should get first record', async () => {
            const firstUser = await user.first();
            expect(firstUser).toBeTruthy();
            expect(firstUser).toHaveProperty('id');
            expect(firstUser).toHaveProperty('name');
        });

        test('should filter with where clause', async () => {
            const users = await user.where('name', 'Alice').get();
            expect(users).toHaveLength(1);
            expect(users[0].name).toBe('Alice');
        });

        test('should filter with where operator', async () => {
            const users = await user.where('age', '>', 25).get();
            expect(users.length).toBeGreaterThanOrEqual(2);
        });

        test('should select specific columns', async () => {
            const users = await user.select('id', 'name').get();
            expect(users.length).toBeGreaterThan(0);
            expect(users[0]).toHaveProperty('id');
            expect(users[0]).toHaveProperty('name');
            expect(users[0]).not.toHaveProperty('email');
        });

        test('should order results', async () => {
            const users = await user.orderBy('age', 'desc').get();
            expect(users.length).toBeGreaterThan(1);
            expect(users[0].age).toBeGreaterThanOrEqual(users[1].age);
        });

        test('should limit results', async () => {
            const users = await user.limit(2).get();
            expect(users).toHaveLength(2);
        });

        test('should paginate results', async () => {
            const result = await user.paginate(1, 2);
            
            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('total');
            expect(result).toHaveProperty('pages');
            expect(result).toHaveProperty('page');
            expect(result).toHaveProperty('perPage');
            expect(result.data).toHaveLength(2);
            expect(result.page).toBe(1);
            expect(result.perPage).toBe(2);
        });

        test('should use whereIn clause', async () => {
            const users = await user.whereIn('name', ['Alice', 'Bob']).get();
            expect(users.length).toBe(2);
        });

        test('should use whereNotIn clause', async () => {
            const users = await user.whereNotIn('name', ['Alice']).get();
            expect(users.every(u => u.name !== 'Alice')).toBe(true);
        });
    });

    describe('Relationships', () => {
        let user, post, userId, postId;

        beforeAll(async () => {
            user = new TestUser();
            post = new TestPost();

            // Create user for relationship testing
            const userResult = await user.insert({
                name: 'Author User',
                email: 'author@test.com',
                age: 30
            });
            userId = userResult.insertId;

            // Create posts for the user
            const postResult = await post.insert({
                user_id: userId,
                title: 'First Post',
                content: 'This is the first post content.'
            });
            postId = postResult.insertId;

            await post.insert({
                user_id: userId,
                title: 'Second Post',
                content: 'This is the second post content.'
            });
        });

        test('should load hasMany relationship', async () => {
            const users = await user.with('posts').where('id', userId).get();
            
            expect(users).toHaveLength(1);
            expect(users[0]).toHaveProperty('posts');
            expect(Array.isArray(users[0].posts)).toBe(true);
            expect(users[0].posts.length).toBeGreaterThanOrEqual(2);
            expect(users[0].posts[0]).toHaveProperty('title');
        });

        test('should load belongsTo relationship', async () => {
            const posts = await post.with('user').where('id', postId).get();
            
            expect(posts).toHaveLength(1);
            expect(posts[0]).toHaveProperty('user');
            expect(posts[0].user).toHaveProperty('name');
            expect(posts[0].user.name).toBe('Author User');
        });
    });

    describe('Data Casting', () => {
        let user;

        beforeEach(() => {
            user = new TestUser();
        });

        test('should cast JSON data correctly', async () => {
            const userData = {
                name: 'Test User',
                email: 'test@cast.com',
                data: { preferences: { theme: 'dark' }, settings: [1, 2, 3] }
            };

            const result = await user.insert(userData);
            const foundUser = await user.find(result.insertId);

            expect(typeof foundUser.data).toBe('object');
            expect(foundUser.data.preferences.theme).toBe('dark');
            expect(Array.isArray(foundUser.data.settings)).toBe(true);
        });

        test('should cast boolean correctly', async () => {
            const foundUser = await user.first();
            expect(typeof foundUser.is_active).toBe('boolean');
        });

        test('should cast number correctly', async () => {
            const foundUser = await user.first();
            expect(typeof foundUser.age).toBe('number');
        });
    });

    describe('Error Handling', () => {
        let user;

        beforeEach(() => {
            user = new TestUser();
        });

        test('should handle duplicate key errors', async () => {
            await user.insert({
                name: 'Unique User',
                email: 'unique@test.com',
                age: 25
            });

            // Try to insert same email again
            await expect(user.insert({
                name: 'Another User',
                email: 'unique@test.com',
                age: 30
            })).rejects.toThrow();
        });

        test('should handle invalid table operations gracefully', async () => {
            await expect(user.rawQuery('SELECT * FROM non_existent_table')).rejects.toThrow();
        });
    });
});

// Helper function to set up test tables
async function setupTestTables() {
    try {
        await query('DROP TABLE IF EXISTS test_posts');
        await query('DROP TABLE IF EXISTS test_users');
    } catch (error) {
        // Ignore errors if tables don't exist
    }

    await query(`
        CREATE TABLE test_users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE,
            age INT,
            is_active BOOLEAN DEFAULT TRUE,
            data JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP NULL
        )
    `);

    await query(`
        CREATE TABLE test_posts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            title VARCHAR(255) NOT NULL,
            content TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES test_users(id)
        )
    `);
}
