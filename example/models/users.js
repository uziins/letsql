const Model = require("../../src/model");

class Users extends Model {
    constructor() {
        super();

        this.table = 'users'
        this.fillable = []
        this.guarded = ['id']
        this.timestamp = false
        this.hidden = ['password']
        this.casts = {
            is_active: 'boolean',
            data: 'json',
        }
    }
}

module.exports = Users;