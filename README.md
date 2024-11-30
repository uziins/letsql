# LetSQL

A lightweight and user-friendly Node.js ORM module for MySQL databases. Inspired by Eloquent in Laravel.
Basically, it is a wrapper around the [mysql](https://www.npmjs.com/package/mysql2) module with a few additional features.

## Installation

```bash
npm install letsql
```

## Configuration
### Environment Variables
Create a .env file in the root of your project and add the following variables:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_DATABASE=database
```

## Usage

### Extending the Model
ie. models/user.js
```javascript
const Model = require('letsql');

class User extends Model {
    constructor() {
        super();
        this.table = 'users';
    }
}

module.exports = User;
```

### Querying the Database
ie. index.js
```javascript
const UserModel = require('./models/user');

const User = new UserModel();

(async () => {
    const users = await User.limit(10).get();
    console.log(users);
})();
```

## Model
### Properties
#### table [string|required]
The name of the table in the database.
#### primaryKey [string|default: 'id']
The primary key of the table.
#### uuidColumn [string]
The column to use as a UUID. It will automatically generate a UUID when creating a record.
#### fillable [array]
An array of columns that are allowed to be filled when creating or updating a record.
#### guarded [array]
An array of columns that are not allowed to be filled when creating or updating a record.
#### hidden [array]
An array of columns that are not returned when querying the database.
#### timestamp [boolean|default: true]
Automatically set the `created_at` when creating a record and the `updated_at` when updating a record. (`created_at` and `updated_at` columns must exist in the table - `timestamp` type).
#### softDelete [boolean|default: false]
Whether to automatically update the `deleted_at` when deleting a record. It also excludes records with `deleted_at` value from being queried.
(`deleted_at` column must exist in the table - `timestamp` type).
#### perPage [number|default: 10]
The default number of records to return per page when using the `paginate()` method.
#### casts [object]
An object of columns and their respective data types. Available data types are: `string`, `number`, `float`, `boolean`, `date`, `json`.


## Methods
### get()
Get all records from the table. Returns an array of objects.
```javascript
let users = await User.get();
```
```javascript
[
    { id: 1, name: 'John Doe', username: 'john_doe', is_active: 1 },
    { id: 2, name: 'Jane Doe', username: 'jane_doe', is_active: 0 }
    ...
]
```

### first()
Get the first record from the table. Returns an object.
```javascript
let user = await User.where('id', 1).first();
```
```javascript
{ id: 1, name: 'John Doe', username: 'john_doe', is_active: 1 }
```

### find()
#### Parameters
- id [number|required] - The ID (primary key) of the record to find.
####
Get a record by its primary key. Returns an object.
```javascript
let user = await User.find(1);
```
```javascript
{ id: 1, name: 'John Doe', username: 'john_doe', is_active: 1 }
```

### count()
Get the number of records in the table. Returns a number.
```javascript
let count = await User.where('is_active', 1).count();
```
```javascript
1
```

### paginate(page, perPage)
#### Parameters
- page [number|default: 1] - The page number to return.
- perPage [number|default: 10] - The number of records to return per page. It uses the `perPage` property of the model if not provided.
####
Get records paginated. Returns an object with the following properties:
- data [array] - An array of objects.
- total [number] - The total number of records.
- pages [number] - The total number of pages.
- page [number] - The current page number.
- perPage [number] - The number of records per page.
- nextPage [number|null] - The next page number or null if there is no next page.
- prevPage [number|null] - The previous page number or null if there is no previous page.
```javascript
let users = await User.paginate(1, 10);
```
```javascript
{
    data: [
        { id: 1, name: 'John Doe', username: 'john_doe', is_active: 1 },
        { id: 2, name: 'Jane Doe', username: 'jane_doe', is_active: 0 }
        ...
    ],
    total: 100,
    pages: 10,
    page: 1,
    perPage: 10,
    nextPage: 2,
    prevPage: null
}
```

### insert(data)
#### Parameters
- data [object|required] - An object of key-value pairs to insert into the table.
####
Insert a record into the table. Returns object from [mysql](https://www.npmjs.com/package/mysql2) module.
```javascript
let user = await User.insert({ name: 'John Doe', username: 'john_doe', is_active: 1 });
```
```javascript
{
    fieldCount: 0,
    affectedRows: 1,
    insertId: 1,
    serverStatus: 2,
    warningCount: 0,
    message: '',
    protocol41: true,
    changedRows: 0
}
```

### update(data)
#### Parameters
- data [object|required] - An object of key-value pairs to update in the table.
####
Update records in the table. Should be used with `where()` method. Returns object from [mysql](https://www.npmjs.com/package/mysql2) module.
```javascript
let user = await User.where('id', 1).update({ is_active: 0 });
```
```javascript
{
    fieldCount: 0,
    affectedRows: 1,
    insertId: 0,
    serverStatus: 2,
    warningCount: 0,
    message: '(Rows matched: 1  Changed: 1  Warnings: 0',
    protocol41: true,
    changedRows: 1
}
```

### delete()
Delete records from the table. Should be used with `where()` method. Returns object from [mysql](https://www.npmjs.com/package/mysql2) module.
If the `softDelete` property is set to `true`, it will update the `deleted_at` column instead of deleting the record.
```javascript
let user = await User.where('id', 1).delete();
```
```javascript
{
    fieldCount: 0,
    affectedRows: 1,
    insertId: 0,
    serverStatus: 2,
    warningCount: 0,
    message: '',
    protocol41: true,
    changedRows: 0
}
```

### forceDelete()
Delete records from the table whether the `softDelete` property is set to `true` or not. Should be used with `where()` method. Returns object from [mysql](https://www.npmjs.com/package/mysql2) module.
```javascript
let user = await User.where('id', 1).forceDelete();
```
```javascript
{
    fieldCount: 0,
    affectedRows: 1,
    insertId: 0,
    serverStatus: 2,
    warningCount: 0,
    message: '',
    protocol41: true,
    changedRows: 0
}
```

### select(columns)
#### Parameters
- columns [array|string|multiple arguments] - The columns to select.
####
Select specific columns from the table.
```javascript
let users = await User.select('id', 'name').get();
// or
let users = await User.select(['id', 'name']).get();
// or
let users = await User.select('id, name').get();
```
```javascript
[
    { id: 1, name: 'John Doe' },
    { id: 2, name: 'Jane Doe' }
    ...
]
```

### selectMore(columns, except)
#### Parameters
- columns [array] - The columns to select. It will add to the existing columns.
- except [array] - Whether to exclude the existing columns.
####
Select more columns from the table. It will add to the existing columns. If the `except` parameter is provided, it will exclude the existing columns from being queried.
```javascript
let users = await User.select('id', 'name').selectMore(['username', 'is_active']).get();
```
```javascript
[
    { id: 1, name: 'John Doe', username: 'john_doe', is_active: 1 },
    { id: 2, name: 'Jane Doe', username: 'jane_doe', is_active: 0 }
    ...
]
```

### join(table, first, operator, second, type)
#### Parameters
- table [string|required] - The name of the table to join.
- first [string|required] - The column of the first table to join on.
- operator [string|required] - The operator to join on.
- second [string|required] - The column of the second table to join on.
- type [string|default: 'inner'] - The type of join. Available types are: `inner`, `left`, `right`, `full`, `cross`.
####
Join another table to the query.
```javascript
let users = await User.join('posts', 'users.id', '=', 'posts.user_id').get();
```
```javascript
[
    { id: 1, name: 'John Doe', username: 'john_doe', is_active: 1, user_id: 1, title: 'Post 1' },
    { id: 1, name: 'John Doe', username: 'john_doe', is_active: 1, user_id: 1, title: 'Post 2' },
    { id: 2, name: 'Jane Doe', username: 'jane_doe', is_active: 0, user_id: 2, title: 'Post 3' }
    ...
]
```

### leftJoin(table, first, operator, second)
#### Parameters
- table [string|required] - The name of the table to join.
- first [string|required] - The column of the first table to join on.
- operator [string|required] - The operator to join on.
- second [string|required] - The column of the second table to join on.
####
Left join another table to the query. It is a shorthand for `join()` method with the `type` parameter set to `left`.
```javascript
let users = await User.leftJoin('posts', 'users.id', '=', 'posts.user_id').get();
```
```javascript
[
    { id: 1, name: 'John Doe', username: 'john_doe', is_active: 1, user_id: 1, title: 'Post 1' },
    { id: 1, name: 'John Doe', username: 'john_doe', is_active: 1, user_id: 1, title: 'Post 2' },
    { id: 2, name: 'Jane Doe', username: 'jane_doe', is_active: 0, user_id: 2, title: 'Post 3' }
    ...
]
```

### where(column, operator, value)
#### Parameters
- column [string|object] - If a string, it is the column to query. If an object, it is a key-value pair of columns and their respective values.
- operator [string] - The operator to query with.
- value [any] - The value to query with.
####
If column is an object, then treat it as equal operator with field as key and value as value.
If column is a string, then treat it as equal operator with field as key and operator as value.
If all arguments are present, then treat as it is.
```javascript
let users = await User.where('is_active', 1).get();
// or
let users = await User.where({ is_active: 1 }).get();
// or
let users = await User.where('is_active', '=', 1).get();
```
```javascript
[
    { id: 1, name: 'John Doe', username: 'john_doe', is_active: 1 },
    { id: 2, name: 'Jane Doe', username: 'jane_doe', is_active: 1 }
    ...
]
```

### whereRaw(raw)
#### Parameters
- raw [string|required] - The raw SQL query to use.
####
Add a raw where clause to the query.
```javascript
let users = await User.whereRaw('is_active = 1').get();
```
```javascript
[
    { id: 1, name: 'John Doe', username: 'john_doe', is_active: 1 },
    { id: 2, name: 'Jane Doe', username: 'jane_doe', is_active: 1 }
    ...
]
```

### orWhere(column, operator, value)
Same as [where()](#wherecolumn-operator-value) method.
####
Add an "or" clause to the query.
```javascript
let users = await User.where('is_active', 1).orWhere('username', 'john_doe').get();
```
```javascript
[
    { id: 1, name: 'John Doe', username: 'john_doe', is_active: 1 },
    { id: 2, name: 'Jane Doe', username: 'jane_doe', is_active: 1 }
    ...
]
```

### orWhereRaw(raw)
Same as [whereRaw()](#whererawraw) method.
####
Add a raw "or" clause to the query.
```javascript
let users = await User.where('is_active', 1).orWhereRaw('username = "john_doe"').get();
```
```javascript
[
    { id: 1, name: 'John Doe', username: 'john_doe', is_active: 1 },
    { id: 2, name: 'Jane Doe', username: 'jane_doe', is_active: 1 }
    ...
]
```

### whereIn(column, values)
#### Parameters
- column [string] - The column to query.
- values [array] - The values to query with.
####
Add a "where in" clause to the query.
```javascript
let users = await User.whereIn('id', [1, 2]).get();
```
```javascript
[
    { id: 1, name: 'John Doe', username: 'john_doe', is_active: 1 },
    { id: 2, name: 'Jane Doe', username: 'jane_doe', is_active: 1 }
    ...
]
```

### whereNotIn(column, values)
#### Parameters
- column [string] - The column to query.
- values [array] - The values to query with.
####
Add a "where not in" clause to the query.
```javascript
let users = await User.whereNotIn('id', [3, 4]).get();
```
```javascript
[
    { id: 1, name: 'John Doe', username: 'john_doe', is_active: 1 },
    { id: 2, name: 'Jane Doe', username: 'jane_doe', is_active: 1 }
    ...
]
```

### whereNull(column)
#### Parameters
- column [string] - The column to query.
####
Add a "where null" clause to the query.
```javascript
let users = await User.whereNull('deleted_at').get();
```
```javascript
[
    { id: 1, name: 'John Doe', username: 'john_doe', is_active: 1 },
    { id: 2, name: 'Jane Doe', username: 'jane_doe', is_active: 1 }
    ...
]
```

### whereNotNull(column)
#### Parameters
- column [string] - The column to query.
####
Add a "where not null" clause to the query.
```javascript
let users = await User.whereNotNull('deleted_at').get();
```
```javascript
[
    { id: 3, name: 'John Smith', username: 'john_smith', is_active: 1, deleted_at: '2024-01-01 00:00:00' },
    { id: 4, name: 'Jane Smith', username: 'jane_smith', is_active: 1, deleted_at: '2024-01-01 00:00:00' }
    ...
]
```

### withTrashed()
Include records with `deleted_at` value in the query. Should be used with soft delete.
```javascript
let users = await User.withTrashed().get();
```
```javascript
[
    { id: 1, name: 'John Doe', username: 'john_doe', is_active: 1, deleted_at: null },
    { id: 2, name: 'Jane Doe', username: 'jane_doe', is_active: 1, deleted_at: null },
    { id: 3, name: 'John Smith', username: 'john_smith', is_active: 1, deleted_at: '2024-01-01 00:00:00' },
    { id: 4, name: 'Jane Smith', username: 'jane_smith', is_active: 1, deleted_at: '2024-01-01 00:00:00' }
    ...
]
```

### orderBy(column, direction)
#### Parameters
- column [string] - The column to order by.
- direction [string|default: 'asc'] - The direction to order by. Available directions are: `asc`, `desc`.
####
Order the records by a column.
```javascript
let users = await User.orderBy('name', 'desc').get();
```
```javascript
[
    { id: 4, name: 'Jane Smith', username: 'jane_smith', is_active: 1 },
    { id: 3, name: 'John Smith', username: 'john_smith', is_active: 1 },
    { id: 2, name: 'Jane Doe', username: 'jane_doe', is_active: 1 },
    { id: 1, name: 'John Doe', username: 'john_doe', is_active: 1 }
    ...
]
```

### groupBy(column)
#### Parameters
- column [string] - The column to group by.
####
Group the records by a column.
```javascript
let users = await User.select('count(id) as total', 'is_active').groupBy('is_active').get();
```
```javascript
[
    { total: 2, is_active: 1 },
    { total: 2, is_active: 0 }
]
```

### limit(limit, offset)
#### Parameters
- limit [number|required] - The number of records to return.
- offset [number|default: 0] - The number of records to skip.
####
Limit the number of records to return.
```javascript
let users = await User.limit(2).get();
```
```javascript
[
    { id: 1, name: 'John Doe', username: 'john_doe', is_active: 1 },
    { id: 2, name: 'Jane Doe', username: 'jane_doe', is_active: 1 }
]
```

### hasMany(model, foreignKey, localKey, name, callback)
#### Parameters
- model [model|required] - The model to relate to.
- foreignKey [string|required] - The foreign key in the related model.
- localKey [string|required] - The local key in the current model.
- name [string] - The name of the relationship.
- callback [function] - A callback function to further query the related model.
####
Create a "has many" relationship with another model. Get all related records from the related model.
```javascript
const PostModel = require('./models/post');

class User extends Model {
    constructor() {
        super();
        this.table = 'users';
    }

    posts() {
        return this.hasMany(PostModel, 'user_id', 'id', 'posts', (query) => {
            query.where('is_published', 1);
        });
    }
}

module.exports = User;
```

### hasOne(model, foreignKey, localKey, name, callback)
Same as [hasMany()](#hasmanymodel-foreignkey-localkey-name-callback) method.
####
Create a "has one" relationship with another model. Get single related record from the related model.
```javascript
const ProfileModel = require('./models/profile');

class User extends Model {
    constructor() {
        super();
        this.table = 'users';
    }

    profile() {
        return this.hasOne(ProfileModel, 'user_id', 'id', 'profile');
    }
}

module.exports = User;
```

### belongsTo(model, foreignKey, ownerKey, name, callback)
#### Parameters
- model [model|required] - The model to relate to.
- foreignKey [string|required] - The foreign key in the current model.
- ownerKey [string|required] - The owner key in the related model.
- name [string] - The name of the relationship.
- callback [function] - A callback function to further query the related model.
####
Create a "belongs to" relationship with another model. Get the related record from the related model.
```javascript
const CountryModel = require('./models/country');

class User extends Model {
    constructor() {
        super();
        this.table = 'users';
    }

    country() {
        return this.belongsTo(CountryModel, 'country_id', 'id', 'country');
    }
}

module.exports = User;
```

### with(relation)
#### Parameters
- relation [string|array] - The name of the relationship to include.
####
Include a relationship in the query.
```javascript
let users = await User.with('posts').get();
```
```javascript
[
    {
        id: 1,
        name: 'John Doe',
        username: 'john_doe',
        is_active: 1,
        posts: [
            { id: 1, user_id: 1, title: 'Post 1' },
            { id: 2, user_id: 1, title: 'Post 2' }
        ]
    },
    {
        id: 2,
        name: 'Jane Doe',
        username: 'jane_doe',
        is_active: 1,
        posts: [
            { id: 3, user_id: 2, title: 'Post 3' }
        }
    }
    ...
]
```

### rawQuery(query)
#### Parameters
- query [string|required] - The raw SQL query to use.
####
Run a raw SQL query. Returns an array of objects.
```javascript
let users = await User.rawQuery('SELECT * FROM users WHERE is_active = 1');
```
```javascript
[
    { id: 1, name: 'John Doe', username: 'john_doe', is_active: 1 },
    { id: 2, name: 'Jane Doe', username: 'jane_doe', is_active: 1 }
    ...
]
```
