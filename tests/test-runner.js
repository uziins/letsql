require('dotenv').config();
const { query, healthCheck, closePool } = require('../lib/mysql');

// Simple test framework untuk basic testing
class TestRunner {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    async test(name, testFn) {
        try {
            console.log(`\n🧪 Testing: ${name}`);
            await testFn();
            console.log(`✅ PASSED: ${name}`);
            this.passed++;
        } catch (error) {
            console.log(`❌ FAILED: ${name}`);
            console.log(`   Error: ${error.message}`);
            this.failed++;
        }
    }

    async run() {
        console.log('\n🚀 Starting LetsSQL Test Suite\n');
        
        // Database Connection Tests
        await this.test('Database connection should be healthy', async () => {
            const isHealthy = await healthCheck();
            this.assert(isHealthy === true, 'Database should be healthy');
        });

        await this.test('Raw query should work', async () => {
            const result = await query('SELECT 1 as test');
            this.assert(result.length > 0, 'Query should return results');
            this.assert(result[0].test === 1, 'Query result should be correct');
        });

        // Setup test tables
        await this.setupTestTables();

        // Model Tests
        await this.runModelTests();

        // Query Builder Tests
        await this.runQueryBuilderTests();

        // Relationship Tests
        await this.runRelationshipTests();

        // Summary
        this.printSummary();
        
        // Cleanup
        await closePool();
    }

    async setupTestTables() {
        console.log('\n📦 Setting up test tables...');
        
        // Drop existing test tables
        try {
            await query('DROP TABLE IF EXISTS test_posts');
            await query('DROP TABLE IF EXISTS test_users');
        } catch (error) {
            // Ignore errors if tables don't exist
        }

        // Create test tables
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

        console.log('✅ Test tables created successfully');
    }

    async runModelTests() {
        const TestUser = require('./models/test-user');
        const user = new TestUser();

        await this.test('Model should insert record', async () => {
            const result = await user.insert({
                name: 'John Doe',
                email: 'john@example.com',
                age: 30,
                data: { hobby: 'coding', city: 'Jakarta' }
            });
            this.assert(result.affectedRows === 1, 'Should insert one record');
            this.assert(result.insertId > 0, 'Should return insert ID');
        });

        await this.test('Model should find record', async () => {
            const foundUser = await user.find(1);
            this.assert(foundUser !== null, 'Should find the user');
            this.assert(foundUser.name === 'John Doe', 'Should have correct name');
            this.assert(foundUser.email === 'john@example.com', 'Should have correct email');
        });

        await this.test('Model should get all records', async () => {
            // Insert another user
            await user.insert({
                name: 'Jane Doe',
                email: 'jane@example.com',
                age: 25
            });

            const users = await user.get();
            this.assert(users.length >= 2, 'Should have at least 2 users');
        });

        await this.test('Model should update record', async () => {
            const result = await user.where('id', 1).update({
                name: 'John Updated',
                age: 31
            });
            this.assert(result.affectedRows === 1, 'Should update one record');

            const updatedUser = await user.find(1);
            this.assert(updatedUser.name === 'John Updated', 'Name should be updated');
            this.assert(updatedUser.age === 31, 'Age should be updated');
        });

        await this.test('Model should count records', async () => {
            const count = await user.count();
            this.assert(count >= 2, 'Should have at least 2 users');
        });
    }

    async runQueryBuilderTests() {
        const TestUser = require('./models/test-user');
        const user = new TestUser();

        await this.test('Where clause should work', async () => {
            const users = await user.where('name', 'John Updated').get();
            this.assert(users.length === 1, 'Should find one user');
            this.assert(users[0].name === 'John Updated', 'Should have correct name');
        });

        await this.test('Where with operator should work', async () => {
            const users = await user.where('age', '>', 25).get();
            this.assert(users.length >= 1, 'Should find users older than 25');
        });

        await this.test('Select specific columns should work', async () => {
            const users = await user.select('id', 'name').get();
            this.assert(users.length > 0, 'Should return users');
            this.assert(users[0].hasOwnProperty('id'), 'Should have id column');
            this.assert(users[0].hasOwnProperty('name'), 'Should have name column');
            this.assert(!users[0].hasOwnProperty('email'), 'Should not have email column');
        });

        await this.test('Order by should work', async () => {
            const users = await user.orderBy('age', 'desc').get();
            this.assert(users.length > 0, 'Should return users');
            // First user should have higher or equal age than second
            if (users.length > 1) {
                this.assert(users[0].age >= users[1].age, 'Should be ordered by age desc');
            }
        });

        await this.test('Limit should work', async () => {
            const users = await user.limit(1).get();
            this.assert(users.length === 1, 'Should return only one user');
        });

        await this.test('Pagination should work', async () => {
            const result = await user.paginate(1, 1);
            this.assert(result.hasOwnProperty('data'), 'Should have data property');
            this.assert(result.hasOwnProperty('total'), 'Should have total property');
            this.assert(result.hasOwnProperty('pages'), 'Should have pages property');
            this.assert(result.data.length === 1, 'Should have one record per page');
        });
    }

    async runRelationshipTests() {
        const TestUser = require('./models/test-user');
        const TestPost = require('./models/test-post');
        
        const user = new TestUser();
        const post = new TestPost();

        await this.test('Should create related records', async () => {
            // Create a post for user with ID 1
            const result = await post.insert({
                user_id: 1,
                title: 'My First Post',
                content: 'This is the content of my first post.'
            });
            this.assert(result.affectedRows === 1, 'Should create post');
        });

        await this.test('HasMany relationship should work', async () => {
            const users = await user.with('posts').get();
            this.assert(users.length > 0, 'Should return users');
            
            const userWithPosts = users.find(u => u.id === 1);
            this.assert(userWithPosts, 'Should find user with ID 1');
            this.assert(Array.isArray(userWithPosts.posts), 'Posts should be an array');
            this.assert(userWithPosts.posts.length > 0, 'Should have posts');
        });
    }

    assert(condition, message) {
        if (!condition) {
            throw new Error(message);
        }
    }

    printSummary() {
        console.log('\n📊 Test Summary:');
        console.log(`✅ Passed: ${this.passed}`);
        console.log(`❌ Failed: ${this.failed}`);
        console.log(`📈 Total: ${this.passed + this.failed}`);
        
        if (this.failed === 0) {
            console.log('\n🎉 All tests passed!');
        } else {
            console.log('\n⚠️  Some tests failed. Please check the output above.');
        }
    }
}

// Run tests
(async () => {
    const runner = new TestRunner();
    await runner.run();
    process.exit(0);
})();
