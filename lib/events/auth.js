/**
 * Created by rdantzer on 22/03/17.
 */

'use strict';

const dbms = require('../cache'),
    _ = require('lodash');

exports.login = (data) => {
    dbms.db.redis.hmset(`user:${data.id}`, 'auth', true);
    return dbms.fetchSubscribers(data.id)
        .then(results => {
            if (results !== null) {
                dbms.db.redis.pipeline()
                    .sadd(`user:${data.id}:follower`, results.follower)
                    .sadd(`user:${data.id}:following`, results.following)
                    .sadd(`user:${data.id}:subscribers`, results.subscribers)
                    .exec();
            }
        });
};

exports.logout = (data) => {
    return dbms.db.redis.hmset(`user:${data.id}`, 'auth', false);
};