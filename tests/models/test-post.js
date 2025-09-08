const Model = require("../../src/model");

class TestPost extends Model {
    constructor() {
        super();
        this.table = 'test_posts';
        this.fillable = ['user_id', 'title', 'content'];
        this.guarded = ['id'];
        this.timestamp = true;
        this.softDelete = false;
    }

    // Define relationship with user
    user() {
        const TestUser = require('./test-user');
        return this.belongsTo(TestUser, 'user_id', 'id', 'user');
    }
}

module.exports = TestPost;
