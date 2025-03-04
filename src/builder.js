const queryBuilder = (table, query) => {
    if (query.rawQuery) return {sql: query.rawQuery, bindings: []};
    const action = query.action ?? 'select';

    let sqlQuery;
    let bindings = [];
    switch (action) {
        case 'select':
            sqlQuery = 'SELECT ';
            if (query.select?.length > 0) {
                sqlQuery += query.select.join(', ');
            } else {
                // if select is empty, then use table.*, including joins if any
                sqlQuery += table + '.*';
                if (query.joins?.length > 0) {
                    query.joins.forEach(join => {
                        sqlQuery += `, ${join.table}.*`;
                    });
                }
            }
            sqlQuery += ` FROM ${table}`
            break;
        case 'insert':
        case 'insertUpdate':
            if (Object.keys(query.data).length === 0) {
                throw new Error('Insert query must have data!');
            }
            sqlQuery = `INSERT INTO ${table}`
            break;
        case 'insertIgnore':
            if (Object.keys(query.data).length === 0) {
                throw new Error('Insert query must have data!');
            }
            sqlQuery = `INSERT IGNORE INTO ${table}`
            break;
        case 'update':
            if (Object.keys(query.data).length === 0) {
                throw new Error('Update query must have data!');
            }
            sqlQuery = `UPDATE ${table}`
            break;
        case 'delete':
            if (!query.where) {
                // for safety, delete query must have where clause
                throw new Error('Delete query must have where clause!');
            }
            sqlQuery = `DELETE FROM ${table}`
            break;
        default:
            throw new Error('Invalid _query.action');
    }

    if (action === 'insert' || action === 'insertIgnore' || action === 'insertUpdate') {
        const fields = Object.keys(query.data);
        const values = Object.values(query.data);
        sqlQuery += ` (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`;
        bindings = values;

        if (action === 'insertUpdate') {
            sqlQuery += ' ON DUPLICATE KEY UPDATE' + _buildSetValue(query.data);
        }

    } else if (action === 'update') {
        sqlQuery += ' SET ' + _buildSetValue(query.data);
    }

    if (query.joins?.length > 0) {
        query.joins.forEach(join => {
            // check if join doesn't have dot notation, then add table name
            if (!join.first.includes('.')) {
                join.first = table + '.' + join.first;
            }
            if (!join.second.includes('.')) {
                join.second = join.table + '.' + join.second;
            }
            sqlQuery += ` ${join.type} JOIN ${join.table} ON ${join.first} ${join.operator} ${join.second}`;
        });
    }

    function _buildSetValue(data) {
        let sql = '';
        for (const field in data) {
            const value = data[field];
            if (value === null) {
                sql += ` ${field} = NULL,`;
            } else if (typeof value === 'boolean') {
                sql += ` ${field} = ${value ? 1 : 0},`;
            } else {
                sql += ` ${field} = ?,`;
                bindings.push(value);
            }
        }
        return sql.slice(0, -1);
    }

    function _writeWhere(where) {
        let sql = '';

        const whereSize = where.length;
        for (let i = 0; i < whereSize; i++) {
            let clause = where[i];
            if (i > 0) {
                sql += ` ${clause.condition}`;
            }
            if (clause.raw) {
                sql += ` ${clause.raw}`;
                continue;
            }
            // check if field doesn't have dot notation, then add table name
            let newField = clause.field;
            if (!newField.includes('.')) {
                newField = `${table}.${clause.field}`;
            }
            if (clause.operator === 'IN' || clause.operator === 'NOT IN') {
                sql += ` ${newField} ${clause.operator} (?)`;
                bindings.push(clause.value);
            } else if (clause.operator === 'IS' || clause.operator === 'IS NOT') {
                sql += ` ${newField} ${clause.operator} ${clause.value}`;
            } else {
                sql += ` ${newField} ${clause.operator} ?`;
                bindings.push(clause.value);
            }
        }
        return sql;
    }

    if (query.where) {
        sqlQuery += ' WHERE';
        sqlQuery += _writeWhere(query.where);
    }

    if (query.orderBy) {
        if (query.orderBy.direction !== 'ASC' && query.orderBy.direction !== 'DESC') {
            query.orderBy.direction = 'ASC';
        }
        // if orderBy doesn't have dot notation, then add table name (to avoid ambiguous column)
        if (!query.orderBy.field.includes('.')) query.orderBy.field = `${table}.${query.orderBy.field}`;
        sqlQuery += ` ORDER BY ${query.orderBy.field} ${query.orderBy.direction}`;
    }

    if (query.groupBy?.length > 0) {
        sqlQuery += ` GROUP BY ${query.groupBy.join(', ')}`;
    }

    if (query.limit) {
        sqlQuery += ` LIMIT ?`;
        bindings.push(Number(query.limit));
        if (query.offset) {
            sqlQuery += ` OFFSET ?`;
            bindings.push(Number(query.offset));
        }
    }
    return {sql: sqlQuery, bindings: bindings};
}

module.exports = queryBuilder;