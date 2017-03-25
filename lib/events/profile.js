/**
 * Created by rdantzer on 22/03/17.
 */

'use strict';

const dbms = require('../cache'),
    _ = require('lodash');

exports.follow = (data) => {
    if (data.value === 1) {
        return dbms.db.redis.pipeline()
            .sadd(`user:${data.to}:follower`, data.from)
            .sadd(`user:${data.from}:following`, data.to);
    } else {
        return dbms.db.redis.pipeline()
            .srem(`user:${data.to}:follower`, data.from)
            .srem(`user:${data.from}:following`, data.to);
    }
};

exports.view_profile = (data) => {

};