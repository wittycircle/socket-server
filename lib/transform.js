/**
 * Created by rdantzer on 26/03/17.
 */

'use strict';

const dbms = require('./cache');

const hydrate = (field, data) => {
    return {
        user: () => {
            return dbms.db.redis.hmget(`user:${data.id}`, 'username', 'avatar')
                .then(user => {
                    user.id = data.id;
                    return {
                        from: user,
                        type: data.type
                    }
                })
        }
    }[field];
};

module.exports = {
    login: data => hydrate('user'),
    logout: data => hydrate('user'),
    _default: data => {
        return data;
    }
};