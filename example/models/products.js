const Model = require("../../src/model");

class Products extends Model {
    constructor() {
        super();
        this.primaryKey = 'id'
        this.table = 'products'
        this.fillable = ['id', 'name', 'price', 'description']
        this.timestamp = true
    }
}

module.exports = Products;