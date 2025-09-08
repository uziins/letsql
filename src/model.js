const connection = require('../lib/mysql')
const _queryBuilder = require('./builder')
const _filter = require('./filter')

async function _process(reset = true) {
    if (!this.table) {
        console.log('\x1b[41m\x1b[37m%s\x1b[0m', 'Table name is not set!');
        console.log('\x1b[33m%s\x1b[0m', 'Set table name in your model class!');
        throw new Error('Table name is not set!');
    }
    let _q = this._query
    if (reset) this._query = {};

    const query = _queryBuilder(this.table, _q)
    const data = await connection.query(query.sql, query.bindings);

    if (data?.affectedRows > 0 && _q.action === 'insert' && this.uuidColumn) {
        data.insertUuid = _q.data[this.uuidColumn];
    }

    const doCast = _q.action === 'select' && this.casts && Object.keys(this.casts).length > 0;
    const doRelation = _q.action === 'select' && _q.relations?.length > 0;
    const doHideField = _q.action === 'select' && this.hidden && this.hidden.length > 0;

    // relation
    let dataRelation = {};
    if (doRelation) {
        // loop through each relation to get data
        await Promise.all(_q.relations.map(async relation => {
            // get mainField, it's the field that will be used to get ids
            let mainField = relation.type === 'belongsTo' ? relation.foreignKey : relation.localKey;
            // get related ids, remove duplicate ids, and check if ids is not empty
            let ids = data.map(row => row[mainField]);
            ids = ids.filter(id => id !== undefined && id !== null); // remove undefined and null ids
            if (ids.length === 0) return;

            let model = relation.model;
            let callback = relation.callback;
            model.selectMore([])
            if (callback && typeof callback === 'function') {
                callback(model)
            }
            // get relatedField, it's the field that will be used to get data using ids
            let relatedField = relation.type === 'belongsTo' ? relation.localKey : relation.foreignKey;
            let results = await model.whereIn(relatedField, ids).get();
            dataRelation[relation.identifier] = {};
            if (relation.type === 'belongsTo' || relation.type === 'hasOne') { // one to one
                dataRelation[relation.identifier]['empty'] = null;
                dataRelation[relation.identifier]['key'] = mainField;
                dataRelation[relation.identifier]['data'] = results.reduce((map, row) => {
                    if (!row[relatedField]) throw new Error(`Field ${relatedField} is not exist in relation result!`);
                    map[row[relatedField]] = row;
                    return map;
                }, {});
            } else { // has many
                dataRelation[relation.identifier]['empty'] = [];
                dataRelation[relation.identifier]['key'] = mainField;
                dataRelation[relation.identifier]['data'] = results.reduce((map, row) => {
                    if (!row[relatedField]) throw new Error(`Field ${relatedField} is not exist in relation result!`);
                    if (!map[row[relatedField]]) map[row[relatedField]] = [];
                    map[row[relatedField]].push(row);
                    return map;
                }, {});
            }
        }))
    }

    // post process data
    if (data?.length > 0 && (doCast || doRelation || doHideField)) {
        this.resultData = data.map((row, idx) => {
            if (doCast) {
                row = _filter.casts(row, this.casts);
            }
            if (doRelation) {
                // iterate through relations and set data value
                for (let identifier in dataRelation) {
                    let key = row[dataRelation[identifier]['key']];
                    if (dataRelation.hasOwnProperty(identifier)) {
                        row[identifier] = dataRelation[identifier]['data'][key] ?? dataRelation[identifier]['empty'];
                    }
                }
            }
            if (doHideField) {
                // iterate through hidden fields and remove it from data
                for (let i = 0; i < this.hidden.length; i++) {
                    delete row[this.hidden[i]];
                }
            }
            return row;
        })
    } else {
        this.resultData = data;
    }

    return this.resultData
}


/** @class Model */
class Model {
    /**
     * @constructor
     * @description
     * Init table. Must be overridden by child class.
     * Init primaryKey. Primary key of the table. Can be overridden by child class.
     * Init uuidColumn. UUID column of the table, will be filled automatically if set. Can be overridden by child class.
     * Init fillable. Fields that can be filled. Can be overridden by child class.
     * Init guarded. Fields that cannot be filled. Can be overridden by child class.
     * Init hidden. Fields that will be hidden from result. Can be overridden by child class.
     * Init timestamp. Will set `created_at` and `updated_at` column if true. Can be overridden by child class.
     * Init softDelete. Will update `deleted_at` column if true. Can be overridden by child class.
     * Init perPage. Number of rows per page. Can be overridden by child class.
     * Init casts. Casts data type. Can be overridden by child class. Available casts: json, boolean, date, number, string
     */
    constructor() {
        this.table = ''; // init table, must be overridden by child class
        this.primaryKey = 'id'; // can be overridden by child class
        this.uuidColumn = ''; // can be overridden by child class
        this.fillable = []; // can be overridden by child class
        this.guarded = []; // can be overridden by child class
        this.hidden = []; // can be overridden by child class
        this.timestamp = true; // can be overridden by child class
        this.softDelete = false; // can be overridden by child class
        this.perPage = 10; // can be overridden by child class
        this.casts = {}; // can be overridden by child class
        this._query = {} // init query. should not be overridden by child class
    }

    /**
     * If select is empty, then use all default fields
     * @param fields - single string (with comma separated) or multiple arguments or array of fields
     */
    select(fields) {
        // can accept multiple arguments or array of fields or single string including comma separated fields
        if (arguments.length > 1) fields = Array.from(arguments);
        else if (typeof fields === 'string') fields = fields.split(',');
        if (fields?.length > 0) {
            this._query.select = fields;
        }
        return this;
    }

    /**
     * Add more fields to select, if except is not empty, then remove fields from select.
     * If fields is empty, then use all default fields
     * @param fields
     * @param excepts
     */
    selectMore(fields = [], excepts = []) {
        this._query.select = this._query.select ?? [];
        if (fields.length > 0) {
            this._query.select = this._query.select.concat(fields);
        }
        if (excepts.length > 0) {
            this._query.select = this._query.select.filter(field => !excepts.includes(field));
        }
        return this;
    }

    /**
     * Add join to query
     * @param table - table name to join
     * @param first - first field to join
     * @param operator - operator
     * @param second - second field to join
     * @param type - type of join (INNER, LEFT, RIGHT, etc.). Default is INNER.
     */
    join(table, first, operator, second, type = 'INNER') {
        this._query.joins = this._query.joins ?? [];
        this._query.joins.push({table, first, operator, second, type});
        return this;
    }

    /**
     * Add LEFT JOIN to query
     * @param table - table name to join
     * @param first - first field to join
     * @param operator - operator
     * @param second - second field to join
     */
    leftJoin(table, first, operator, second) {
        return this.join(table, first, operator, second, 'LEFT');
    }

    /**
     * Add WHERE clause to query.
     * If field is an object, then treat it as equal operator with field as key and value as value.
     * If field is a string, then treat it as equal operator with field as key and operator as value.
     * If all arguments are present, then treat as it is.
     * @param field
     * @param operator
     * @param value
     */
    where(field, operator, value) {
        this._query.where = this._query.where ?? [];
        if (arguments.length === 1 && typeof field === 'object') {
            // if field is an object key-value pair, we treat it as equal operator with field as key and value as value
            for (const f in field) {
                this._query.where.push({field: f, operator: '=', value: field[f], condition: 'AND'});
            }
        } else if (arguments.length === 2) {
            // if arguments length is 2, we treat it as equal operator with first argument as field and second argument as value
            this._query.where.push({field: field, operator: '=', value: operator, condition: 'AND'});
        } else if (arguments.length === 3) {
            this._query.where.push({field: field, operator: operator, value: value, condition: 'AND'});
        } else {
            throw new Error('Invalid arguments');
        }
        return this;
    }

    /**
     * Add raw WHERE clause to query.
     * @param raw - raw query
     * @returns {Model}
     */
    whereRaw(raw) {
        this._query.where = this._query.where ?? [];
        this._query.where.push({raw: raw, condition: 'AND'});
        return this;
    }

    /**
     * Add OR WHERE clause to query.
     * If field is an object, then treat it as equal operator with field as key and value as value.
     * If field is a string, then treat it as equal operator with field as key and operator as value.
     * If all arguments are present, then treat as it is.
     * @param field
     * @param operator
     * @param value
     */
    orWhere(field, operator, value) {
        this._query.where = this._query.where ?? [];
        if (arguments.length === 1 && typeof field === 'object') {
            // if field is an object key-value pair, we treat it as equal operator with field as key and value as value
            for (let f in field) {
                if (field.hasOwnProperty(f))
                    this._query.where.push({field: f, operator: '=', value: field[f], condition: 'OR'});
            }
        } else if (arguments.length === 2) {
            // if arguments length is 2, we treat it as equal operator with first argument as field and second argument as value
            this._query.where.push({field: field, operator: '=', value: operator, condition: 'OR'});
        } else if (arguments.length === 3) {
            this._query.where.push({field: field, operator: operator, value: value, condition: 'OR'});
        } else {
            throw new Error('Invalid arguments');
        }
        return this;
    }

    /**
     * Add raw OR WHERE clause to query.
     * @param raw - raw query
     * @returns {Model}
     */
    orWhereRaw(raw) {
        this._query.where = this._query.where ?? [];
        this._query.where.push({raw: raw, condition: 'OR'});
        return this;
    }

    /**
     * Add WHERE IN clause to query
     * @param field - field name
     * @param values - array of values
     */
    whereIn(field, values = []) {
        this._query.where = this._query.where ?? [];
        this._query.where.push({field: field, operator: 'IN', value: values, condition: 'AND'});
        return this;
    }

    /**
     * Add WHERE NOT IN clause to query
     * @param field - field name
     * @param values - array of values
     */
    whereNotIn(field, values) {
        this._query.where = this._query.where ?? [];
        this._query.where.push({field: field, operator: 'NOT IN', value: values, condition: 'AND'});
        return this;
    }

    /**
     * Add WHERE IS NULL clause to query
     * @param field
     * @returns {Model}
     */
    whereNull(field) {
        this._query.where = this._query.where ?? [];
        this._query.where.push({field: field, operator: 'IS', value: 'NULL', condition: 'AND'});
        return this;
    }

    /**
     * Add WHERE IS NOT NULL clause to query
     * @param field
     * @returns {Model}
     */
    whereNotNull(field) {
        this._query.where = this._query.where ?? [];
        this._query.where.push({field: field, operator: 'IS NOT', value: 'NULL', condition: 'AND'});
        return this;
    }

    /**
     * Include soft deleted data
     * @returns {Model}
     */
    withTrashed() {
        this._query.withTrashed = true;
        return this;
    }

    /**
     * Add ORDER BY clause to query
     * @param field - field name
     * @param direction - ASC or DESC
     */
    orderBy(field, direction = 'ASC') {
        this._query.orderBy = {field: field, direction: direction.toUpperCase()};
        return this;
    }

    /**
     * Add GROUP BY clause to query
     * @param fields - single string (with comma separated) or multiple arguments or array of fields
     */
    groupBy(fields) {
        if (arguments.length > 1) fields = Array.from(arguments);
        else if (typeof fields === 'string') fields = fields.split(',');
        if (fields?.length > 0) {
            this._query.groupBy = fields;
        }
        return this;
    }

    /**
     * Add LIMIT and OFFSET clause to query
     * @param limit - number of rows to be returned
     * @param offset - number of rows to be skipped
     */
    limit(limit, offset = 0) {
        this._query.limit = limit;
        this._query.offset = offset;
        return this;
    }

    /**
     * Add hasMany relationship to result. Get all record that holds the current model primary key.
     * @param model - model class
     * @param foreignKey - foreign key. It's the related-model field that will be used to get the parent model
     * @param localKey - local key. It's the field that the related-model will refer to
     * @param name - identifier name. If not set, we use table name
     * @param callback - callback function to modify query
     */
    hasMany(model, foreignKey, localKey, name = '', callback= null) {
        if (typeof model === 'function') model = new model();
        if (!name) name = model.table;
        this._query.relations = this._query.relations ?? [];
        this._query.relations.push({model: model, foreignKey, localKey, identifier: name, type: 'hasMany', callback});
        return this;
    }

    /**
     * Add hasOne relationship to result. Get single record that holds the current model primary key.
     * @param model - model class
     * @param foreignKey - foreign key. It's the related-model field that will be used to get the parent model
     * @param localKey - local key. It's the field that the related-model will refer to
     * @param name - identifier name. If not set, we use table name
     * @param callback - callback function to modify query
     * @returns {Model}
     */
    hasOne(model, foreignKey, localKey, name = '', callback= null) {
        if (typeof model === 'function') model = new model();
        if (!name) name = model.table;
        this._query.relations = this._query.relations ?? [];
        this._query.relations.push({model: model, foreignKey, localKey, identifier: name, type: 'hasOne', callback});
        return this;
    }

    /**
     * Add belongsTo relationship to result. Get single record that the current model belongs to.
     * @param model - model class
     * @param foreignKey - foreign key. It's the field that will be used to get the related-model
     * @param ownerKey - owner key. It's the target (related-model) field that the model refers to
     * @param name - identifier name. If not set, we use table name
     * @param callback - callback function to modify query
     */
    belongsTo(model, foreignKey, ownerKey, name = '', callback= null) {
        if (typeof model === 'function') model = new model();
        if (!name) name = model.table;
        this._query.relations = this._query.relations ?? [];
        this._query.relations.push({model: model, foreignKey, localKey: ownerKey, identifier: name, type: 'belongsTo', callback});
        return this;
    }

    /**
     * Add with clause to query. This will add relationship data to result.
     * @param relation - single string of relation or array of relations
     */
    with(relation) {
        this._query.with = this._query.with ?? [];
        if (typeof relation === 'string') relation = [relation];
        for (let i=0; i < relation.length; i++){
            // check if relation function exists
            if (typeof this[relation[i]] !== 'function') throw new Error(`Relation ${relation[i]} doesn't exist!`);
            eval(`this.${relation[i]}()`)
        }
        return this;
    }

    // TODO: add withCount

    /**
     * Execute raw query
     * @param query - string of query
     */
    async rawQuery(query) {
        this._query.rawQuery = query;
        return await this.get();
    }

    /**
     * Get data with pagination
     * @param page - page number
     * @param perPage - number of rows per page
     */
    async paginate(page = 0, perPage = 0) {
        if (typeof page !== 'number') page = Number(page);
        if (typeof perPage !== 'number') perPage = Number(perPage);
        // if page and perPage is not set, then use query limit and offset if any
        if (page < 1) page = Math.floor((this._query.offset ?? 0) / (this._query.limit ?? this.perPage) + 1)
        if (perPage < 1) perPage = this._query.limit ?? this.perPage;
        this._query.limit = perPage;
        this._query.offset = (page - 1) * perPage;

        // check if soft delete is enabled
        if (this.softDelete && !this._query.withTrashed) this.whereNull('deleted_at');

        this._query.action = 'select';
        const data = await _process.call(this, false)

        // remove last where that been added by soft delete, although it's okay to have same where clause
        if (this.softDelete && !this._query.withTrashed) this._query.where.pop();

        // reset limit and offset
        this._query.limit = null;
        this._query.offset = null;
        const total = await this.count();
        const pages = Math.ceil(total / perPage);
        return {
            data: data,
            total: total,
            pages: pages,
            page: page,
            perPage: perPage,
            nextPage: page < pages ? page + 1 : null,
            prevPage: page > 1 && page <= pages ? page - 1 : null,
        };
    }

    /**
     * Get all data
     * @returns {Promise<unknown>}
     */
    async get() {
        // check if soft delete is enabled
        if (this.softDelete && !this._query.withTrashed) this.whereNull('deleted_at');

        this._query.action = 'select';
        return await _process.call(this)
    }

    /**
     * Get first data
     * @returns {Promise<*|null>}
     */
    async first() {
        this._query.limit = 1;
        let result = await this.get();
        return result[0] ?? null;
    }

    /**
     * Find data by primary key
     * @param primaryKey - primary key value
     * @returns {Promise<*|null>}
     */
    async find(primaryKey) {
        this._query.where = [];
        return await this.where(this.primaryKey, primaryKey).first();
    }

    /**
     * Get data count
     * @returns {Promise<*|number>}
     */
    async count() {
        // select count only
        this._query.select = ['COUNT(*) as count'];
        let result = await this.first();
        return result?.count ?? 0;
    }

    // INSERT
    /**
     * Insert data
     * @param data
     * @returns {Promise<unknown>}
     */
    async insert(data) {
        this._query.data = _filter.fields(data, this.fillable, this.guarded);
        if (Object.keys(this._query.data).length === 0) return null;

        // cast data type if exist
        this._query.data = _filter.casts(this._query.data, this.casts, true);

        if (this.uuidColumn) {
            this._query.data[this.uuidColumn] = crypto.randomUUID();
        }

        if (this.timestamp) {
            this._query.data.created_at = new Date();
        }

        this._query.action = 'insert';
        return await _process.call(this);
    }

    /**
     * Insert data with ignore duplicate key
     * @param data
     * @returns {Promise<unknown>}
     */
    async insertIgnore(data) {
        this._query.data = _filter.fields(data, this.fillable, this.guarded);
        if (Object.keys(this._query.data).length === 0) return null;

        // cast data type if exist
        this._query.data = _filter.casts(this._query.data, this.casts, true);

        if (this.uuidColumn) {
            this._query.data[this.uuidColumn] = crypto.randomUUID();
        }

        if (this.timestamp) {
            this._query.data.created_at = new Date();
            this._query.data.updated_at = new Date();
        }

        this._query.action = 'insertIgnore';
        return await _process.call(this);
    }

    /**
     * Insert data or update if duplicate key
     * @param data
     * @returns {Promise<unknown>}
     */
    async insertOrUpdate(data) {
        this._query.data = _filter.fields(data, this.fillable, this.guarded);
        if (Object.keys(this._query.data).length === 0) return null;

        // cast data type if exist
        this._query.data = _filter.casts(this._query.data, this.casts, true);

        if (this.uuidColumn) {
            this._query.data[this.uuidColumn] = crypto.randomUUID();
        }

        if (this.timestamp) {
            this._query.data.created_at = new Date();
            this._query.data.updated_at = new Date();
        }

        this._query.action = 'insertUpdate';
        return await _process.call(this);
    }

    // UPDATE
    /**
     * Update data
     * @param data
     * @returns {Promise<unknown>}
     */
    async update(data) {
        this._query.data = _filter.fields(data, this.fillable, this.guarded);
        if (Object.keys(this._query.data).length === 0) return null;
        // cast data type if exist
        this._query.data = _filter.casts(this._query.data, this.casts, true);
        // for safety, update query must have where clause
        if (this._query.where === undefined) throw new Error('Update query must have where clause!');

        // check if soft delete is enabled
        if (this.softDelete && !this._query.withTrashed) this.whereNull('deleted_at');

        if (this.timestamp) {
            this._query.data.updated_at = new Date();
        }

        this._query.action = 'update';
        return await _process.call(this)
    }

    // DELETE
    /**
     * Delete data. If soft delete is enabled, it will set `deleted_at` column to current datetime.
     * @returns {Promise<unknown>}
     */
    async delete() {
        // check if soft delete is enabled
        if (this.softDelete) {
            // get only non-deleted data
            this.whereNull('deleted_at')
            // if soft delete is enabled, then update deleted_at column
            this._query.data = {deleted_at: new Date()};
            this._query.action = 'update';
        } else {
            this._query.action = 'delete';
        }
        return await _process.call(this)
    }

    /**
     * Force delete data. Delete data permanently even if soft delete is enabled.
     * @returns {Promise<unknown>}
     */
    async forceDelete() {
        this._query.action = 'delete';
        return await _process.call(this)
    }
}

module.exports = Model;