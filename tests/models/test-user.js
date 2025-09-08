const Model = require("../../src/model");

class TestUser extends Model {
    constructor() {
        super();
        this.table = 'test_users';
        this.fillable = ['name', 'email', 'age', 'data'];
        this.guarded = ['id'];
        this.hidden = [];
        this.timestamp = true;
        this.softDelete = true;
        this.casts = {
            is_active: 'boolean',
            data: 'json',
            age: 'number'
        };
    }

    // Define relationship with posts
    posts() {
        const TestPost = require('./test-post');
        return this.hasMany(TestPost, 'user_id', 'id', 'posts');
    }
}

module.exports = TestUser;
