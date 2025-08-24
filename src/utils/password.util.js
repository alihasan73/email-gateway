const password = (value, helpers) => {
    if(value.length < 8) {
        return helpers.message('password must be at least 8 characters');
    }

    if(!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
        return helpers.message('password must contain a number');
    }

    return value;
}


module.exports = {password};