const Model = require("../../src/model");

class Users extends Model {
    constructor() {
        super();

        this.table = 'users';
        this.fillable = []
        this.hidden = ['password']
        this.casts = {
            is_active: 'boolean'
        }
    }
}

module.exports = Users;