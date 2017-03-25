/**
 * Created by rdantzer on 24/03/17.
 */

'use strict';

const dbms = require('../cache');

exports.send = (data) => {
    return dbms.db.redis.zadd(`user:${data.to}:messages`, Date.now(), data.content);
};