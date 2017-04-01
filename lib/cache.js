/**
 * Created by rdantzer on 19/02/17.
 */

'use strict';

const {db, TABLES} = require('../../app/models/index'),
    _ = require('lodash'),
    Promise = require('bluebird');

let Redis = require('ioredis');

/**
 * Intercept all publish payload and transform it to string whenever an Object is present
 */
Redis.Command.setArgumentTransformer('publish', function (args) {
    if (args.length === 2 && typeof args[1] === 'object')
        args[1] = JSON.stringify(args[1]);
    return args;
});

const config = require('../../app/private/index').redis,
    redis = Redis(config),
    pub = Redis(config),
    sub = Redis(config);

exports.match = (key, min, max) => {
    return redis.zrangebylex(key, min, max);
};

exports.db = {
    redis: redis,
    pub: pub,
    sub: sub,
    sql: db
};

exports.keys = {
    user: id => `socket::lookup::${id}`
};


exports.init = () => {
    /**
     * Fetch all skills and store them in Redis for ZRANGEBYLEX autocomplete
     */
    Promise.all([
        db(TABLES.SKILLS).select(['name', 'priority']).orderBy('name')
            .then(skills => skills.map(skill => [0, skill.name.toLowerCase()]))
            .then(skills => redis.zadd('autocomplete:skills', _.flattenDeep(skills)))
            .catch(console.error),
        db(`${TABLES.USERS} as u`)
            .select(['u.id', 'u.username', 'profile_id', 'profile_picture'])
            .orderBy('u.id')
            .leftJoin(`${TABLES.USER_PROFILES} as p`, 'u.profile_id', 'p.id')
            .then(users => {
                return {
                    username: users.map(user => [user.id, user.username]),
                    users: users.map(user => {
                        return [
                            'hmset',
                            `user:${user.id}`,
                            'username', user.username,
                            'avatar', user.profile_picture,
                            'profile_id', user.profile_id
                        ]
                    })
                }
            })
            .then(query => {
                redis.multi(query.users).zadd('autocomplete:username', query.username).exec()
            })
            .catch(console.error)
    ]);
};

exports.fetchSubscribers = (id) => {
    return db.raw(`
        SELECT DISTINCT f.user_id, o.following, e.follower FROM user_followers f
        LEFT JOIN
        (
            SELECT user_followers.user_id, GROUP_CONCAT(DISTINCT follow_user_id SEPARATOR ',') as following 
                FROM user_followers GROUP BY user_id
        ) as o ON f.user_id = o.user_id
        LEFT JOIN
        (
            SELECT user_followers.follow_user_id, GROUP_CONCAT(DISTINCT user_id SEPARATOR ',') as follower 
                FROM user_followers GROUP BY follow_user_id
        ) as e ON f.user_id = e.follow_user_id WHERE f.user_id = ${id}`)
        .then(results => {
            if (results[0].length) {
                let follower = results[0][0].follower.split(','),
                    following = results[0][0].following.split(','),
                    subscribers = _.uniq(_.concat(follower, following));

                return {follower, following, subscribers}
            }
            else
                return null
        })
};

