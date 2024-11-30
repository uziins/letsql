const Model = require("../../src/model");

class Chats extends Model {
    constructor() {
        super();
        this.table = 'chats'
        this.fillable = ['user_id', 'message']
        this.timestamp = false
        this.uuidColumn = 'uuid'
    }
}

module.exports = Chats;