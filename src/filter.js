const fields = (obj, fillable = [], guarded = []) => {
    let data = {}
    for (const key in obj) {
        if ((!fillable.length || fillable.includes(key)) && (!guarded.length || !guarded.includes(key))) {
            data[key] = obj[key]
        }
    }
    return data
}

const casts = (obj, casts = {}, reverse = false) => {
    // iterate through casts and set data type if exist
    for (const field in casts) {
        if (obj[field] !== undefined) {
            if (reverse) {
                switch (casts[field]) {
                    case 'json':
                        obj[field] = JSON.stringify(obj[field]);
                        break;
                    case 'boolean':
                        obj[field] = obj[field] ? 1 : 0;
                        break;
                    case 'date':
                        obj[field] = obj[field].toISOString();
                        break;
                    case 'number':
                        obj[field] = Number(obj[field]);
                        break;
                    case 'string':
                        obj[field] = String(obj[field]);
                        break;
                    case 'float':
                        obj[field] = parseFloat(obj[field]);
                        break;
                }
            } else {
                switch (casts[field]) {
                    case 'json':
                        obj[field] = JSON.parse(obj[field]);
                        break;
                    case 'boolean':
                        obj[field] = Boolean(obj[field]);
                        break;
                    case 'date':
                        obj[field] = new Date(obj[field]);
                        break;
                    case 'number':
                        obj[field] = Number(obj[field]);
                        break;
                    case 'string':
                        obj[field] = String(obj[field]);
                        break;
                    case 'float':
                        obj[field] = parseFloat(obj[field]);
                        break;
                }
            }
        }
    }
    return obj
}

module.exports = {
    fields,
    casts
}